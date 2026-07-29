import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSessionNamespace } from '../server/utils/mockSessionStore';

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
  vi.stubGlobal('getCookie', (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name]);
  vi.stubGlobal('setCookie', (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  });
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number; statusMessage?: string };
    error.statusCode = payload.statusCode;
    error.statusMessage = payload.statusMessage;
    return error;
  });
};

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

const createEvent = (overrides: { headers?: Record<string, string>; body?: unknown; cookies?: Record<string, string> } = {}) => ({
  headers: overrides.headers || {},
  body: overrides.body || {},
  cookies: overrides.cookies || {},
});

let tempStoreDir = '';

describe('demo reset flow', () => {
  beforeAll(() => {
    installH3Mocks();
  });

  beforeEach(() => {
    tempStoreDir = mkdtempSync(join(tmpdir(), 'ecas-demo-reset-'));
    process.env.NUXT_PUBLIC_MOCK_MODE = 'true';
    process.env.MOCK_SESSION_STORE_DIR = tempStoreDir;
    clearSessionNamespace('cart');
    clearSessionNamespace('pricing');
    vi.resetModules();
    installH3Mocks();
  });

  afterEach(() => {
    if (tempStoreDir) {
      rmSync(tempStoreDir, { recursive: true, force: true });
    }
    delete process.env.MOCK_SESSION_STORE_DIR;
  });

  it('restores cart and pricing seeds for the current reviewer session', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const adminToken = createMockToken('mock-admin-1');
    const cartPostHandler = (await import('../server/api/cart.post')).default as (event: unknown) => Promise<{
      data: { products: Array<{ id: string }> };
    }>;
    const createPricing = (await import('../server/api/prices/price-setting.post')).default as (event: unknown) => Promise<{
      data: { id: string };
    }>;
    const resetHandler = (await import('../server/api/demo/reset.post')).default as (event: unknown) => Promise<{
      status: string;
      data: {
        cart: { products: Array<{ id: string; stock: number }> };
        pricing: Array<{ _id: string }>;
      };
    }>;

    const session = createEvent({
      headers: { authorization: `Bearer ${adminToken}` },
    });

    await cartPostHandler({
      ...session,
      body: {
        products: [{ id: 'prod-2', stock: 3, isFolder: false }],
      },
    });

    await createPricing({
      ...session,
      body: { type: 0, range: { min: 100, max: 250 }, label: 'Mutated range' },
    });

    const reset = await resetHandler(session);

    expect(reset.status).toBe('success');
    expect(reset.data.cart.products).toHaveLength(1);
    expect(reset.data.cart.products[0]?.id).toBe('prod-1');
    expect(reset.data.cart.products[0]?.stock).toBe(1);
    expect(reset.data.pricing).toHaveLength(3);
    expect(reset.data.pricing.map((item) => item._id)).toEqual(['price-range-1', 'quantity-range-1', 'margin-range-1']);
  });

  it('keeps other reviewer sessions unchanged', async () => {
    const resetHandler = (await import('../server/api/demo/reset.post')).default as (event: unknown) => Promise<{
      data: { cart: { products: Array<{ id: string }> } };
    }>;
    const cartGetHandler = (await import('../server/api/cart.get')).default as (event: unknown) => Promise<{
      data: { products: Array<{ id: string }> };
    }>;
    const cartPostHandler = (await import('../server/api/cart.post')).default as (event: unknown) => Promise<unknown>;

    const sessionOne = createEvent();
    const sessionTwo = createEvent();

    await cartGetHandler(sessionOne);
    await cartGetHandler(sessionTwo);

    await cartPostHandler({
      ...sessionOne,
      body: {
        products: [{ id: 'prod-2', stock: 2, isFolder: false }],
      },
    });

    await resetHandler(sessionOne);

    const untouchedCart = await cartGetHandler(sessionTwo);
    expect(untouchedCart.data.products.some((product) => product.id === 'prod-2')).toBe(false);
    expect(untouchedCart.data.products.some((product) => product.id === 'prod-1')).toBe(true);
  });

  it('survives a simulated server restart after reset', async () => {
    const resetHandler = (await import('../server/api/demo/reset.post')).default as (event: unknown) => Promise<{
      data: { cart: { products: Array<{ id: string }> } };
    }>;
    const cartGetHandler = (await import('../server/api/cart.get')).default as (event: unknown) => Promise<{
      data: { products: Array<{ id: string }> };
    }>;
    const cartPostHandler = (await import('../server/api/cart.post')).default as (event: unknown) => Promise<unknown>;

    const session = createEvent();
    await cartGetHandler(session);

    await cartPostHandler({
      ...session,
      body: {
        products: [{ id: 'prod-2', stock: 4, isFolder: false }],
      },
    });

    await resetHandler(session);
    const guestSessionId = session.cookies['guest-session-id'];
    expect(guestSessionId).toBeDefined();

    vi.resetModules();
    installH3Mocks();

    const restartedCartGetHandler = (await import('../server/api/cart.get')).default as (event: unknown) => Promise<{
      data: { products: Array<{ id: string; stock: number }> };
    }>;

    const restartedCart = await restartedCartGetHandler({
      cookies: {
        'guest-session-id': guestSessionId,
      },
    });

    expect(restartedCart.data.products).toHaveLength(1);
    expect(restartedCart.data.products[0]?.id).toBe('prod-1');
    expect(restartedCart.data.products[0]?.stock).toBe(1);
    expect(restartedCart.data.products.some((product) => product.id === 'prod-2')).toBe(false);
  });
});
