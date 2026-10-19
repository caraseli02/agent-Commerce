import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, createError, createRouter, defineEventHandler, toNodeListener } from 'h3';
import cachePolicy from '~~/server/middleware/api-cache-policy';
import { defineAnonymousCatalogHandler } from '~~/server/utils/anonymousCatalogCache';

const state = vi.hoisted(() => ({ entries: new Map<string, unknown>(), mockMode: true, errors: [] as unknown[] }));
vi.mock('nitropack/runtime/internal/cache', async () => {
  const { loadNitroCacheRuntime } = await import('./mocks/nitro-cache-runtime');
  return loadNitroCacheRuntime(state.entries, (error) => state.errors.push(error));
});
vi.mock('nitropack/runtime/internal/config', () => ({ useRuntimeConfig: () => ({ public: { MOCK_MODE: state.mockMode } }) }));

let server: Server;
let proxy: Server;
let baseUrl: string;
let proxyUrl: string;
let calls = 0;
let now = 1_800_000_000_000;
let releaseRefresh: (() => void) | undefined;
let delayRefresh = false;
let failRefresh = false;
let edgeHits = 0;
const edgeEntries = new Map<string, { body: string; headers: Record<string, string> }>();
const identityHeaders: Record<string, string>[] = [
  { cookie: 'token=customer-a' },
  { cookie: 'guest-session-id=b' },
  { authorization: 'Bearer customer-b' },
  { cookie: '' },
  { authorization: '' },
];

const listen = async (server: Server) => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP address unavailable');
  return `http://127.0.0.1:${address.port}`;
};
const read = async (path = '/api/products/featured', headers: Record<string, string> = {}, origin = baseUrl) => {
  const response = await fetch(`${origin}${path}`, { headers });
  return { response, body: await response.json() };
};

describe('anonymous catalog using the installed Nitro SWR implementation', () => {
  beforeAll(async () => {
    vi.stubGlobal('createError', createError);
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const handler = defineAnonymousCatalogHandler('test-catalog', async (input) => {
      calls++;
      if (delayRefresh)
        await new Promise<void>((resolve) => {
          releaseRefresh = resolve;
        });
      if (failRefresh) throw createError({ statusCode: 503, statusMessage: 'Catalog unavailable' });
      return { generation: calls, representation: input };
    });
    const router = createRouter();
    router.use('/api/products/:id', handler);
    router.use('/api/categories', handler);
    router.use('/api/cart', handler);
    server = createServer(toNodeListener(createApp().use(cachePolicy).use(router)));
    baseUrl = await listen(server);
    // Deliberately URL-only edge lookup BEFORE origin middleware. If anonymous
    // responses were public-cacheable, identity requests would reuse them here.
    proxy = createServer(
      toNodeListener(
        createApp().use(
          defineEventHandler(async (event) => {
            const cached = edgeEntries.get(event.path);
            if (cached) {
              edgeHits++;
              return JSON.parse(cached.body);
            }
            const response = await fetch(`${baseUrl}${event.path}`, { headers: event.node.req.headers as Record<string, string> });
            const body = await response.text();
            const headers = Object.fromEntries(response.headers.entries());
            if (!headers['cache-control']?.includes('no-store') && !headers['cdn-cache-control']?.includes('no-store')) {
              edgeEntries.set(event.path, { body, headers });
            }
            return JSON.parse(body);
          }),
        ),
      ),
    );
    proxyUrl = await listen(proxy);
  });

  beforeEach(() => {
    state.entries.clear();
    state.errors.length = 0;
    state.mockMode = true;
    calls = 0;
    now = 1_800_000_000_000;
    delayRefresh = false;
    failRefresh = false;
    releaseRefresh = undefined;
    edgeHits = 0;
    edgeEntries.clear();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await Promise.all([server, proxy].map((instance) => new Promise<void>((resolve) => instance.close(() => resolve()))));
  });

  it('reuses fresh data, returns bounded stale data during one refresh, then serves the new generation', async () => {
    const first = await read();
    expect(first.body.generation).toBe(1);
    expect(first.response.headers.get('x-catalog-generated-at')).toBe(String(now));
    now += 30_000;
    expect((await read()).body.generation).toBe(1);
    expect(calls).toBe(1);
    now++;
    delayRefresh = true;
    expect((await read()).body.generation).toBe(1);
    expect((await read()).body.generation).toBe(1);
    expect(calls).toBe(2);
    releaseRefresh?.();
    await vi.waitFor(async () => expect((await read()).body.generation).toBe(2));
  });

  it('blocks beyond the hard stale deadline instead of serving an old value', async () => {
    await read();
    now += 90_001;
    delayRefresh = true;
    let completed = false;
    const request = read().then((result) => {
      completed = true;
      return result;
    });
    await vi.waitFor(() => expect(calls).toBe(2));
    expect(completed).toBe(false);
    releaseRefresh?.();
    expect((await request).body.generation).toBe(2);
  });

  it('never extends the stale deadline after revalidation errors or caches errors', async () => {
    await read();
    now += 30_001;
    failRefresh = true;
    expect((await read()).body.generation).toBe(1);
    await vi.waitFor(() => expect(state.errors.length).toBeGreaterThan(0));
    now += 60_000;
    expect((await read()).response.status).toBe(503);
    failRefresh = false;
    expect((await read()).body.generation).toBe(4);
  });

  it.each(identityHeaders)('bypasses both reads and writes before lookup for identity header %j', async (headers) => {
    expect((await read()).body.generation).toBe(1);
    const privateResponse = await read(undefined, headers);
    expect(privateResponse.body.generation).toBe(2);
    expect(privateResponse.response.headers.get('x-catalog-generated-at')).toBeNull();
    expect((await read(undefined, headers)).body.generation).toBe(3);
    expect((await read()).body.generation).toBe(1);
    expect(state.entries.size).toBe(1);
  });

  it('keys every resolver input: params, method and mode, within the handler namespace', async () => {
    for (const path of ['/api/products/a', '/api/products/b', '/api/categories']) {
      const first = await read(path);
      expect((await read(path)).body).toEqual(first.body);
    }
    expect(calls).toBe(3);
    expect(state.entries.size).toBe(3);
    const head = await fetch(`${baseUrl}/api/products/a`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(calls).toBe(4);
    state.mockMode = false;
    expect((await read('/api/products/a')).body.representation.mockMode).toBe(false);
    expect(calls).toBe(5);
    expect(state.entries.size).toBe(4);
  });

  it('cannot grow storage through arbitrary query strings or Host values', async () => {
    const first = await read();
    expect(first.body.representation).not.toHaveProperty('url');
    for (let variant = 0; variant < 80; variant++) {
      const query = await read(`/api/products/featured?anything=${variant}`, { host: `query-${variant}.invalid` });
      expect(query.response.headers.get('x-catalog-generated-at')).toBeNull();
      expect(query.body.generation).toBe(variant + 2);
      const host = await read(undefined, { host: `host-${variant}.invalid` });
      expect(host.body).toEqual(first.body);
      expect(host.response.headers.get('x-catalog-generated-at')).toBe(first.response.headers.get('x-catalog-generated-at'));
      expect(state.entries.size).toBe(1);
    }
    expect(calls).toBe(81);
  });

  it('bounds successful case aliases and never saves unknown fixture IDs through the real product handlers', async () => {
    const productId = (await import('~~/server/api/products/[id].get')).default;
    const productPath = (await import('~~/server/api/products/[path].get')).default;
    const servers = [
      createServer(toNodeListener(createApp().use(cachePolicy).use(createRouter().get('/api/products/:id', productId)))),
      createServer(toNodeListener(createApp().use(cachePolicy).use(createRouter().get('/api/products/:path', productPath)))),
    ];
    const [idOrigin, pathOrigin] = await Promise.all(servers.map(listen));
    try {
      const firstId = await read('/api/products/stm32f407vgt6', {}, idOrigin);
      const firstTab = await read('/api/products/featured', {}, pathOrigin);
      expect(firstId.body.data._id).toBe('prod-1');
      expect(firstTab.body.data.length).toBeGreaterThan(0);
      for (const origin of [idOrigin, pathOrigin]) {
        const collections = await Promise.all(
          ['featured', 'best-sellers', 'hot-deals'].map(async (tab) =>
            (await read(`/api/products/${tab}`, {}, origin)).body.data.map((product: { _id: string }) => product._id),
          ),
        );
        expect(collections[0]).not.toEqual(collections[1]);
        expect(collections[1]).not.toEqual(collections[2]);
      }
      const collectionCacheEntries = state.entries.size;
      for (let variant = 0; variant < 64; variant++) {
        const mixedCase = (value: string) => {
          let bit = 0;
          return value.replace(/[a-z]/g, (letter) => (variant & (1 << bit++) ? letter.toUpperCase() : letter));
        };
        const id = await read(`/api/products/${mixedCase('stm32f407vgt6')}`, {}, idOrigin);
        const tab = await read(`/api/products/${mixedCase('featured')}`, {}, pathOrigin);
        expect(id.body).toEqual(firstId.body);
        expect(tab.body).toEqual(firstTab.body);
        expect(id.response.headers.get('x-catalog-generated-at')).toBe(firstId.response.headers.get('x-catalog-generated-at'));
        expect(tab.response.headers.get('x-catalog-generated-at')).toBe(firstTab.response.headers.get('x-catalog-generated-at'));
        expect((await read(`/api/products/unknown-${variant}`, {}, idOrigin)).response.status).toBe(404);
        expect(state.entries.size).toBe(collectionCacheEntries);
      }
      expect((await read('/api/products/Semiconductors%2Fmicrocontrollers', {}, pathOrigin)).response.status).toBe(404);
      expect(state.entries.size).toBe(collectionCacheEntries);
    } finally {
      await Promise.all(servers.map((instance) => new Promise<void>((resolve) => instance.close(() => resolve()))));
    }
  });

  it('excludes private routes, search and mutations even if accidentally wrapped', async () => {
    for (const path of ['/api/cart', '/api/products/search']) {
      await read(path);
      await read(path);
    }
    const response = await fetch(`${baseUrl}/api/products/featured`, { method: 'POST' });
    expect(response.status).toBe(200);
    await response.text();
    expect(state.entries.size).toBe(0);
    expect(calls).toBe(5);
  });

  it('prevents reuse by a URL-only shared cache whose lookup precedes middleware', async () => {
    expect((await read(undefined, {}, proxyUrl)).body.generation).toBe(1);
    for (const headers of identityHeaders.slice(0, 3)) {
      const result = await read(undefined, headers, proxyUrl);
      expect(result.body.generation).toBeGreaterThan(1);
    }
    expect(edgeEntries.size).toBe(0);
    expect(edgeHits).toBe(0);
    expect((await read()).response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
  });
});
