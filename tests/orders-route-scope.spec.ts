import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

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

  it('allows a guest to read only an order owned by its matching session cookie', async () => {
    const canonicalOrder = { order: { _id: 'guest-order-1' }, children: [] };
    findOrder.mockResolvedValueOnce(canonicalOrder);
    const { default: handler } = (await import('../server/api/orders/[id].get')) as {
      default: (event: unknown) => Promise<unknown>;
    };

    await expect(handler({ params: { id: 'guest-order-1' }, cookies: { 'guest-session-id': 'guest-owner-1' } })).resolves.toEqual({
      status: 'success',
      data: canonicalOrder,
    });
    expect(findOrder).toHaveBeenCalledWith('guest-order-1', 'guest-user-session-guest-owner-1');
  });

  it('rejects a guest reading an order outside its session owner scope', async () => {
    const { default: handler } = (await import('../server/api/orders/[id].get')) as {
      default: (event: unknown) => Promise<unknown>;
    };

    await expect(
      handler({ params: { id: 'another-guest-order' }, cookies: { 'guest-session-id': 'guest-owner-1' } }),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(findOrder).toHaveBeenCalledWith('another-guest-order', 'guest-user-session-guest-owner-1');
  });

  it('lets an admin read the unscoped order list and detail', async () => {
    const canonicalOrder = { order: { _id: 'admin-visible-order' }, children: [] };
    listOrders.mockResolvedValueOnce([{ _id: 'admin-visible-order' }]);
    findOrder.mockResolvedValueOnce(canonicalOrder);
    const { default: listHandler } = (await import('../server/api/orders.get')) as {
      default: (event: unknown) => Promise<unknown>;
    };
    const { default: detailHandler } = (await import('../server/api/orders/[id].get')) as {
      default: (event: unknown) => Promise<unknown>;
    };
    const authorization = `Bearer demo-token::mock-admin-1::${Date.now()}`;

    await expect(listHandler({ headers: { authorization } })).resolves.toMatchObject({
      data: { items: [{ _id: 'admin-visible-order' }] },
    });
    await expect(detailHandler({ headers: { authorization }, params: { id: 'admin-visible-order' } })).resolves.toEqual({
      status: 'success',
      data: canonicalOrder,
    });
    expect(listOrders).toHaveBeenCalledWith(undefined);
    expect(findOrder).toHaveBeenCalledWith('admin-visible-order', undefined);
  });
});
