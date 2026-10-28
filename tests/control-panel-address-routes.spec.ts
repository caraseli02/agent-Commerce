import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// Nitro's radix router keeps one dynamic node per path segment, and the first route registered there names
// the param for every method. Sibling `[a]` and `[b]` routes therefore receive the same key, and the other
// name reads as undefined in the built server (#723). The products clash predates #723 and is out of its scope.
const KNOWN_PARAM_NAME_CLASHES = new Set(['server/api/products']);

const findParamNameClashes = (dir: string, clashes: string[] = []) => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const names = new Set<string>();

  for (const entry of entries) {
    const match = entry.name.match(/^\[(?!\.\.\.)([^\]]+)\]/);
    if (match?.[1]) names.add(match[1]);
    if (entry.isDirectory()) findParamNameClashes(join(dir, entry.name), clashes);
  }

  const path = relative(repoRoot, dir);
  if (names.size > 1 && !KNOWN_PARAM_NAME_CLASHES.has(path)) clashes.push(`${path}: ${[...names].join(', ')}`);

  return clashes;
};

type Handler = (event: unknown) => Promise<unknown> | unknown;
const addressRoutes = {
  shipping: {
    post: () => import('../server/api/user/shipping-address/[id].post'),
    patch: () => import('../server/api/user/shipping-address/[id].patch'),
  },
  billing: {
    post: () => import('../server/api/user/billing-address/[id].post'),
    patch: () => import('../server/api/user/billing-address/[id].patch'),
  },
};
type PersonalResponse = { data: { shippingAddress: Array<{ alias?: string }>; billingAddress: Array<{ alias?: string }> } };

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: true } }));
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
  vi.stubGlobal('getQuery', (event: { query?: Record<string, string> }) => event.query ?? {});
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number };
    error.statusCode = payload.statusCode;
    return error;
  });
};

describe('server API route param names', () => {
  it('uses one param name per dynamic path segment', () => {
    expect(findParamNameClashes(join(repoRoot, 'server/api'))).toEqual([]);
  });
});

describe('control panel address routes', () => {
  beforeAll(installH3Mocks);

  it.each(['shipping', 'billing'] as const)('saves an admin-created %s address on the customer from the route param', async (kind) => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const addHandler = (await addressRoutes[kind].post()).default as Handler;
    const updateHandler = (await addressRoutes[kind].patch()).default as Handler;
    const personalHandler = (await import('../server/api/dashboard/control-panel/[id]/personal.get')).default as Handler;
    const headers = { authorization: `Bearer ${createMockToken('mock-admin-1')}` };
    // The built router delivers the shared `id` key for every method in these folders.
    const params = { id: 'customer-001' };
    const alias = `Admin ${kind} ${Date.now()}`;
    const address = {
      alias,
      name1: '100 Demo Way',
      name2: '',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      postcode: '94105',
      default: false,
    };
    const listKey = kind === 'shipping' ? 'shippingAddress' : 'billingAddress';
    const aliases = async () =>
      ((await personalHandler({ headers, params })) as PersonalResponse).data[listKey].map((entry) => entry.alias);

    const created = (await addHandler({ headers, params, body: { address } })) as { data: string };
    expect(await aliases()).toContain(alias);

    await updateHandler({ headers, params, body: { address: { ...address, _id: created.data, alias: `${alias} Updated` } } });
    expect(await aliases()).toContain(`${alias} Updated`);
  });
});
