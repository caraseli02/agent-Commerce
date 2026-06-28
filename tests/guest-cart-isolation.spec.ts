import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number; statusMessage?: string };
    error.statusCode = payload.statusCode;
    error.statusMessage = payload.statusMessage;
    return error;
  });
};

const createEvent = (overrides: { headers?: Record<string, string>; body?: unknown; cookies?: Record<string, string> } = {}) => ({
  headers: overrides.headers || {},
  body: overrides.body || {},
  cookies: overrides.cookies || {},
});

describe('guest cart isolation', () => {
  beforeAll(() => {
    installH3Mocks();
  });

  it('keeps guest carts isolated by cookie and migrates the matching cart on login', async () => {
    const { default: cartGetHandler } = (await import('../server/api/cart.get')) as { default: (event: unknown) => Promise<{ data: { _id: string; products: Array<{ id: string }> } }> };
    const { default: cartPostHandler } = (await import('../server/api/cart.post')) as { default: (event: unknown) => Promise<{ data: { _id: string; products: Array<{ id: string }> } }> };
    const { default: loginHandler } = (await import('../server/api/auth/login.post')) as { default: (event: unknown) => Promise<{ token: string; data: { token: string } }> };

    const guestOne = createEvent();
    const guestTwo = createEvent();

    const guestOneCart = await cartGetHandler(guestOne);
    const guestTwoCart = await cartGetHandler(guestTwo);

    expect(guestOne.cookies['guest-session-id']).toBeDefined();
    expect(guestTwo.cookies['guest-session-id']).toBeDefined();
    expect(guestOne.cookies['guest-session-id']).not.toBe(guestTwo.cookies['guest-session-id']);
    expect(guestOneCart.data._id).not.toBe(guestTwoCart.data._id);

    const updatedGuestOne = await cartPostHandler({
      ...guestOne,
      body: {
        products: [{ id: 'prod-2', stock: 1, isFolder: false }],
      },
    });

    const refreshedGuestTwo = await cartGetHandler(guestTwo);
    const refreshedGuestTwoHasProd2 = refreshedGuestTwo.data.products.some((product) => product.id === 'prod-2');
    const updatedGuestOneHasProd2 = updatedGuestOne.data.products.some((product) => product.id === 'prod-2');

    expect(refreshedGuestTwoHasProd2).toBe(false);
    expect(updatedGuestOneHasProd2).toBe(true);

    const loginResponse = await loginHandler({
      ...guestOne,
      body: {
        email: 'customer@demo.com',
        password: 'customer123',
        clientCode: 'P-123456',
      },
    });

    const authToken = loginResponse.token || loginResponse.data.token;
    const userCart = await cartGetHandler({
      headers: {
        authorization: 'Bearer ' + authToken,
      },
      cookies: {},
    });

    expect(userCart.data.products.map((product) => product.id)).toContain('prod-2');
    expect(userCart.data._id).toContain('mock-cart-mock-customer-1');
  });
});
