import { beforeAll, describe, expect, it, vi } from 'vitest';

const persistedOrders = [
  { _id: 'o1', money: { total: 100 }, products: [{ stock: 2 }, { stock: 1 }] },
  { _id: 'o2', total: 50, products: [{ stock: 4 }] },
];

vi.mock('~~/server/domain/orders', () => ({
  orders: { list: vi.fn(async () => persistedOrders) },
}));

type Handler = (event: unknown) => Promise<{ data: { total: number } }>;

const adminToken = () => `Bearer demo-token::mock-admin-1::${Date.now()}`;
const customerToken = () => `Bearer demo-token::mock-customer-1::${Date.now()}`;

describe('admin order widget route', () => {
  let handler: Handler;

  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (fn: unknown) => fn);
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers || {});
    vi.stubGlobal('getRouterParam', (event: { type: string }) => event.type);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: 'true' } }));
    vi.stubGlobal('createError', (input: { statusCode: number }) => Object.assign(new Error(String(input.statusCode)), input));
    handler = ((await import('../server/api/dashboard/orders/admin/[type].get')) as { default: Handler }).default;
  });

  const total = async (type: string) => (await handler({ type, headers: { authorization: adminToken() } })).data.total;

  it('derives every Overview metric from the same persisted orders', async () => {
    expect(await total('total-orders')).toBe(2);
    expect(await total('gross-revenue')).toBe(150);
    expect(await total('average-order-value')).toBe(75);
    expect(await total('products-sold')).toBe(7);
  });

  it('is admin only', async () => {
    await expect(handler({ type: 'gross-revenue', headers: { authorization: customerToken() } })).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
