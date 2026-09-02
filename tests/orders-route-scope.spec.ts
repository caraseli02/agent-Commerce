import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { findOrder, listOrders } = vi.hoisted(() => ({
  findOrder: vi.fn(async (..._args: unknown[]) => null as unknown),
  listOrders: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
}));

vi.mock('~/server/domain/orders', () => ({
  orders: { findById: findOrder, list: listOrders },
}));

describe('orders route customer scope', () => {
  beforeAll(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('getQuery', (event: { query?: Record<string, string> }) => event.query || {});
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers || {});
    vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, key: string) => event.params?.[key]);
    vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(input.statusMessage), input),
    );
  });

  beforeEach(() => {
    findOrder.mockReset();
    findOrder.mockResolvedValue(null);
    listOrders.mockReset();
    listOrders.mockResolvedValue([]);
  });

  it('uses the authenticated customer instead of an omitted or spoofed userId', async () => {
    const { default: handler } = (await import('../server/api/orders.get')) as {
      default: (event: unknown) => Promise<unknown>;
    };
    const authorization = `Bearer demo-token::mock-customer-1::${Date.now()}`;

    await handler({ headers: { authorization }, query: { userId: 'mock-customer-2' } });

    expect(listOrders).toHaveBeenCalledWith('mock-customer-1');
  });

  it('rejects unauthenticated order-history enumeration', async () => {
    const { default: handler } = (await import('../server/api/orders.get')) as {
      default: (event: unknown) => Promise<unknown>;
    };

    await expect(handler({ query: { userId: 'mock-customer-1' } })).rejects.toMatchObject({ statusCode: 401 });
    expect(listOrders).not.toHaveBeenCalled();
  });

  it('returns only Orders-owned records without appending route-level fixtures', async () => {
    const canonicalOrder = { _id: 'placed-order-1', total: 1150.39 };
    listOrders.mockResolvedValueOnce([canonicalOrder]);
    const { default: handler } = (await import('../server/api/orders.get')) as {
      default: (event: unknown) => Promise<{ data: { items: unknown[]; total_items: number } }>;
    };
    const authorization = `Bearer demo-token::mock-customer-1::${Date.now()}`;

    const response = await handler({ headers: { authorization } });

    expect(response.data.items).toEqual([canonicalOrder]);
    expect(response.data.total_items).toBe(1);
  });

  it('scopes order detail to the authenticated customer', async () => {
    const canonicalOrder = { order: { _id: 'placed-order-1' }, children: [] };
    findOrder.mockResolvedValueOnce(canonicalOrder);
    const { default: handler } = (await import('../server/api/orders/[id].get')) as {
      default: (event: unknown) => Promise<unknown>;
    };
    const authorization = `Bearer demo-token::mock-customer-1::${Date.now()}`;

    await expect(handler({ headers: { authorization }, params: { id: 'placed-order-1' } })).resolves.toEqual({
      status: 'success',
      data: canonicalOrder,
    });
    expect(findOrder).toHaveBeenCalledWith('placed-order-1', 'mock-customer-1');
  });

  it('does not reveal another customer order or allow unauthenticated detail reads', async () => {
    const { default: handler } = (await import('../server/api/orders/[id].get')) as {
      default: (event: unknown) => Promise<unknown>;
    };
    const authorization = `Bearer demo-token::mock-customer-1::${Date.now()}`;

    await expect(handler({ headers: { authorization }, params: { id: 'another-customer-order' } })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(findOrder).toHaveBeenCalledWith('another-customer-order', 'mock-customer-1');

    findOrder.mockClear();
    await expect(handler({ params: { id: 'another-customer-order' } })).rejects.toMatchObject({ statusCode: 401 });
    expect(findOrder).not.toHaveBeenCalled();
  });
});
