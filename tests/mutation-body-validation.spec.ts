import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockToken } from '~~/server/utils/mockUsers';

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

type HandlerError = Error & {
  statusCode?: number;
  data?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
};
type Handler = (event: unknown) => Promise<unknown>;

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body);
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: 'true' } }));
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string; data?: unknown }) =>
    Object.assign(new Error(payload.statusMessage), payload),
  );
};

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as HandlerError;
  }
  throw new Error('Expected the handler to reject');
};

describe('mutation body validation', () => {
  let loginHandler: Handler;
  let orderHandler: Handler;

  beforeAll(async () => {
    installH3Mocks();
    loginHandler = (await import('../server/api/auth/login.post')).default as Handler;
    orderHandler = (await import('../server/api/orders/new.post')).default as Handler;
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 with a form error for a missing body', async () => {
      const error = await rejection(loginHandler({ headers: {}, cookies: {}, body: undefined }));

      expect(error.statusCode).toBe(400);
      expect(error.data?.formErrors?.length).toBeGreaterThan(0);
    });

    it.each([
      ['a missing password', { email: 'customer@demo.com' }, 'password'],
      ['an empty password', { email: 'customer@demo.com', password: '' }, 'password'],
      ['a non-string email', { email: 42, password: 'customer123' }, 'email'],
      ['neither email nor client code', { password: 'customer123' }, 'email'],
    ])('returns 400 with field errors for %s', async (_label, body, field) => {
      const error = await rejection(loginHandler({ headers: {}, cookies: {}, body }));

      expect(error.statusCode).toBe(400);
      expect(error.data?.fieldErrors?.[field]?.length).toBeGreaterThan(0);
    });

    it('keeps 401 for well-formed but wrong credentials', async () => {
      const error = await rejection(loginHandler({ headers: {}, cookies: {}, body: { email: 'customer@demo.com', password: 'wrong' } }));

      expect(error.statusCode).toBe(401);
    });

    it('still signs in with valid credentials', async () => {
      const response = (await loginHandler({
        headers: {},
        cookies: {},
        body: { email: 'customer@demo.com', password: 'customer123' },
      })) as { token: string };

      expect(response.token).toEqual(expect.any(String));
    });
  });

  describe('POST /api/orders/new', () => {
    const authorization = `Bearer ${createMockToken('mock-customer-1')}`;

    it.each([
      ['a non-string cartId', { cartId: 123, reviewedCartRevision: 'r', reviewedQuoteFingerprint: 'f' }, 'cartId'],
      ['a non-string checkoutRequestId', { cartId: 'c', checkoutRequestId: {}, reviewedCartRevision: 'r' }, 'checkoutRequestId'],
      ['a non-string reviewedCartRevision', { cartId: 'c', reviewedCartRevision: 7 }, 'reviewedCartRevision'],
      ['a non-string reviewedQuoteFingerprint', { cartId: 'c', reviewedQuoteFingerprint: false }, 'reviewedQuoteFingerprint'],
    ])('returns 400 with field errors for %s', async (_label, body, field) => {
      const error = await rejection(orderHandler({ headers: { authorization }, body }));

      expect(error.statusCode).toBe(400);
      expect(error.data?.fieldErrors?.[field]?.length).toBeGreaterThan(0);
    });

    it('returns 400 for a non-object body', async () => {
      const error = await rejection(orderHandler({ headers: { authorization }, body: 'not-json' }));

      expect(error.statusCode).toBe(400);
      expect(error.data?.formErrors?.length).toBeGreaterThan(0);
    });

    it('keeps the cart_changed response when review fields are missing', async () => {
      const error = await rejection(orderHandler({ headers: { authorization }, body: { cartId: 'mock-cart-mock-customer-1' } }));

      expect(error.statusCode).not.toBe(400);
      expect(error.data).toMatchObject({ code: 'cart_changed' });
    });
  });
});
