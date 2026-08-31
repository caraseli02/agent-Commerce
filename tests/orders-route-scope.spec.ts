import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { listOrders } = vi.hoisted(() => ({ listOrders: vi.fn(async () => []) }));

vi.mock('~/server/domain/orders', () => ({
  orders: { list: listOrders },
}));

vi.mock('~/server/utils/mockDashboardDemo', () => ({
  getDemoOrders: () => [],
  getDemoOrdersForUser: () => [],
}));

describe('orders route customer scope', () => {
  beforeAll(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('getQuery', (event: { query?: Record<string, string> }) => event.query || {});
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers || {});
    vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(input.statusMessage), input),
    );
  });

  beforeEach(() => listOrders.mockClear());

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
});
