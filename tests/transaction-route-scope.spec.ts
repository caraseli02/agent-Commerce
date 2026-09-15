import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { listOrders } = vi.hoisted(() => ({
  listOrders: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
}));

vi.mock('~/server/domain/orders', () => ({ orders: { list: listOrders } }));
vi.mock('h3', () => ({ getQuery: (event: { query?: Record<string, string> }) => event.query || {} }));

describe('transaction history route scope', () => {
  beforeAll(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers || {});
    vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(input.statusMessage), input),
    );
  });

  beforeEach(() => {
    listOrders.mockReset();
    listOrders.mockResolvedValue([]);
  });

  it('lets an admin view the requested customer transaction history without exposing it to a customer token', async () => {
    const { default: handler } = (await import('../server/api/transaction.get')) as {
      default: (event: unknown) => Promise<unknown>;
    };

    await handler({
      headers: { authorization: `Bearer demo-token::mock-admin-1::${Date.now()}` },
      query: { userId: 'mock-customer-1' },
    });
    expect(listOrders).toHaveBeenCalledWith('mock-customer-1');

    listOrders.mockClear();
    await handler({
      headers: { authorization: `Bearer demo-token::mock-customer-1::${Date.now()}` },
      query: { userId: 'mock-customer-2' },
    });
    expect(listOrders).toHaveBeenCalledWith('mock-customer-1');
  });
});
