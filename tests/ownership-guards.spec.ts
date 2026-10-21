import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

const { findOrder, cancelRuntimeOrder } = vi.hoisted(() => ({
  findOrder: vi.fn(async (..._args: unknown[]) => null as unknown),
  cancelRuntimeOrder: vi.fn((..._args: unknown[]) => true),
}));

vi.mock('~~/server/domain/orders', () => ({
  orders: { findById: findOrder, list: vi.fn(async () => []) },
}));

vi.mock('~~/server/utils/mockRuntimeOrders', () => ({ cancelRuntimeOrder }));

type Handler = (event: unknown) => unknown;

const bearer = (userId: string) => ({ authorization: `Bearer demo-token::${userId}::${Date.now()}` });
const customer = bearer('mock-customer-1');
const admin = bearer('mock-admin-1');

const orderOwners: Record<string, string> = {
  'customer-1-order': 'mock-customer-1',
  'other-customer-order': 'customer-002',
  'guest-order': 'guest-user-session-guest-owner-1',
};

const profileRoutes = [
  'abandoned-checkout',
  'average-order',
  'customer-information',
  'last-order',
  'recent-transactions',
  'shipping-information',
  'total-spent',
];

describe('server ownership guards', () => {
  beforeAll(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: true } }));
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers || {});
    vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, key: string) => event.params?.[key]);
    vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) =>
      Object.assign(new Error(input.statusMessage), input),
    );
  });

  beforeEach(() => {
    findOrder.mockReset();
    findOrder.mockImplementation(async (id, customerId) => {
      const ownerId = orderOwners[String(id)];
      return ownerId && (!customerId || customerId === ownerId) ? { order: { _id: id }, children: [] } : null;
    });
    cancelRuntimeOrder.mockClear();
  });

  describe('order cancel', () => {
    const loadCancel = async () => (await import('../server/api/orders/[id]/cancel.post')).default as unknown as Handler;

    it('rejects an unauthenticated cancel without touching the order', async () => {
      const handler = await loadCancel();

      await expect(handler({ params: { id: 'customer-1-order' } })).rejects.toMatchObject({ statusCode: 401 });
      expect(cancelRuntimeOrder).not.toHaveBeenCalled();
    });

    it('forbids cancelling another customer order', async () => {
      const handler = await loadCancel();

      await expect(handler({ headers: customer, params: { id: 'other-customer-order' } })).rejects.toMatchObject({ statusCode: 403 });
      expect(cancelRuntimeOrder).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown order', async () => {
      const handler = await loadCancel();

      await expect(handler({ headers: customer, params: { id: 'missing-order' } })).rejects.toMatchObject({ statusCode: 404 });
      expect(cancelRuntimeOrder).not.toHaveBeenCalled();
    });

    it.each([
      ['the owner', customer],
      ['an admin', admin],
    ])('lets %s cancel the order', async (_who, headers) => {
      const handler = await loadCancel();

      await expect(handler({ headers, params: { id: 'customer-1-order' } })).resolves.toMatchObject({ status: 'success' });
      expect(cancelRuntimeOrder).toHaveBeenCalledWith('customer-1-order');
    });

    it('forbids a guest cancelling an order outside its session', async () => {
      const handler = await loadCancel();

      await expect(handler({ params: { id: 'customer-1-order' }, cookies: { 'guest-session-id': 'guest-owner-1' } })).rejects.toMatchObject(
        {
          statusCode: 403,
        },
      );
      expect(cancelRuntimeOrder).not.toHaveBeenCalled();
    });

    it('lets a guest cancel an order owned by its existing session', async () => {
      const handler = await loadCancel();

      await expect(handler({ params: { id: 'guest-order' }, cookies: { 'guest-session-id': 'guest-owner-1' } })).resolves.toMatchObject({
        status: 'success',
      });
      expect(cancelRuntimeOrder).toHaveBeenCalledWith('guest-order');
    });
  });

  describe('auth/[id]', () => {
    const loadAuthUser = async () => (await import('../server/api/auth/[id].get')).default as unknown as Handler;

    it('rejects unauthenticated and cross-user reads', async () => {
      const handler = await loadAuthUser();

      await expect(handler({ params: { id: 'mock-customer-1' } })).rejects.toMatchObject({ statusCode: 401 });
      await expect(handler({ headers: customer, params: { id: 'mock-admin-1' } })).rejects.toMatchObject({ statusCode: 403 });
    });

    it.each([
      ['the user themselves', customer],
      ['an admin', admin],
    ])('returns the user to %s', async (_who, headers) => {
      const handler = await loadAuthUser();

      await expect(handler({ headers, params: { id: 'mock-customer-1' } })).resolves.toMatchObject({
        status: 'success',
        data: { _id: 'mock-customer-1' },
      });
    });
  });

  describe.each(profileRoutes)('dashboard/profile/[userId]/%s', (route) => {
    const loadProfile = async () =>
      (await import(`../server/api/dashboard/profile/[userId]/${route}.get.ts`)).default as unknown as Handler;

    it('rejects unauthenticated and cross-user reads', async () => {
      const handler = await loadProfile();

      await expect(Promise.resolve().then(() => handler({ params: { userId: 'mock-customer-1' } }))).rejects.toMatchObject({
        statusCode: 401,
      });
      await expect(Promise.resolve().then(() => handler({ headers: customer, params: { userId: 'customer-002' } }))).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it.each([
      ['the user themselves', customer],
      ['an admin', admin],
    ])('serves %s', async (_who, headers) => {
      const handler = await loadProfile();

      await expect(Promise.resolve().then(() => handler({ headers, params: { userId: 'mock-customer-1' } }))).resolves.toMatchObject({
        status: 'success',
      });
    });
  });
});
