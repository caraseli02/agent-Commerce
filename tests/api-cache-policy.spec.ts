import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, createError, defineEventHandler, toNodeListener } from 'h3';
import cachePolicy from '~/server/middleware/api-cache-policy';
import cacheErrorHandler from '~/server/api-cache-error';

let server: Server;
let baseUrl: string;
const identityHeaders: Record<string, string>[] = [{ authorization: 'Bearer demo-token' }, { cookie: 'guest-session-id=guest-1' }];

const expectPrivate = (response: Response) => {
  expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');
  expect(response.headers.get('cdn-cache-control')).toBe('no-store');
  expect(response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
};

describe('API response cache policy over real HTTP', () => {
  beforeAll(async () => {
    const app = createApp({
      onError: async (error, event) => {
        // Reproduce Nitro's404 override; ordinary H3 errors omit this step.
        await cacheErrorHandler(error, event, {
          defaultHandler: () => ({
            status: error.statusCode,
            statusText: error.statusMessage || 'Error',
            headers: { 'cache-control': 'no-cache', 'content-type': 'application/json' },
            body: { statusCode: error.statusCode, message: error.message },
          }),
        });
      },
    })
      .use(cachePolicy)
      .use(
        defineEventHandler((event) => {
          if (event.path.endsWith('/missing')) throw createError({ statusCode: 404, statusMessage: 'Not found' });
          return { status: 'success' };
        }),
      );
    server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP test server address unavailable');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it.each([
    '/api/cart',
    '/api/auth/mock-customer-1',
    '/api/user',
    '/api/user/cards',
    '/api/orders',
    '/api/orders/order-1',
    '/api/dashboard/client/metadata',
    '/api/checkout/validate',
    '/api/prices/price-settings',
    '/api/notification',
    '/api/transaction',
    '/api/general-settings',
    '/api/future-personalized-route',
    '/api/products/prod-1/private-details',
    '/api/categories/private-details',
  ])('prevents anonymous and authenticated shared caching for %s', async (path) => {
    for (const headers of [{}, ...identityHeaders]) {
      const response = await fetch(`${baseUrl}${path}?view=summary`, { headers });
      expect(response.status).toBe(200);
      expectPrivate(response);
      await response.text();
    }
  });

  it.each(['/api/categories', '/api/products/prod-1', '/api/products/new-products', '/api/products/resistors'])(
    'keeps browser/CDN catalog GET/HEAD storage disabled: %s',
    async (path) => {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetch(`${baseUrl}${path}?limit=10`, { method });
        expectPrivate(response);
        await response.text();
      }
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('prevents shared caching for %s even on catalog paths', async (method) => {
    const response = await fetch(`${baseUrl}/api/products/search`, { method });
    expectPrivate(response);
    await response.text();
  });

  it('keeps identity-bearing catalog requests and private HEAD responses uncacheable', async () => {
    for (const headers of identityHeaders) {
      const response = await fetch(`${baseUrl}/api/products/prod-1`, { headers });
      expectPrivate(response);
      await response.text();
    }
    const response = await fetch(`${baseUrl}/api/cart`, { method: 'HEAD' });
    expectPrivate(response);
  });

  it('preserves private headers on route errors', async () => {
    const response = await fetch(`${baseUrl}/api/orders/missing`);
    expect(response.status).toBe(404);
    expectPrivate(response);
    expect(await response.json()).toEqual({ statusCode: 404, message: 'Not found' });
  });

  it('keeps anonymous catalog errors uncacheable and public-page errors unchanged', async () => {
    const catalogResponse = await fetch(`${baseUrl}/api/products/missing`);
    expect(catalogResponse.status).toBe(404);
    expectPrivate(catalogResponse);
    await catalogResponse.text();
    for (const path of ['/product/missing']) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBeNull();
      expect(response.headers.get('cdn-cache-control')).toBeNull();
      await response.text();
    }
  });

  it.each(['/product/prod-1', '/dashboard/client', '/apiary', '/api-products/prod-1'])(
    'does not change non-API headers: %s',
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.headers.get('cache-control')).toBeNull();
      await response.text();
    },
  );
});
