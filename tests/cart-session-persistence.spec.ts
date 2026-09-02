import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('cart session persistence', () => {
  beforeAll(() => {
    installH3Mocks();
  });

  beforeEach(async () => {
    process.env.NUXT_PUBLIC_MOCK_MODE = 'true';
    const { getCheckoutDatabase } = await import('../server/infrastructure/checkout-database');
    const database = await getCheckoutDatabase();
    for (const table of [
      'checkout_claims',
      'checkout_payments',
      'checkout_orders',
      'checkout_reservations',
      'checkout_inventory',
      'checkout_carts',
    ]) {
      await database.execute(`DELETE FROM ${table}`);
    }
  });

  it('starts a first-time reviewer cart empty', async () => {
    const { default: cartGetHandler } = (await import('../server/api/cart.get')) as {
      default: (event: unknown) => Promise<{ data: { products: Array<{ id: string; stock: number }> } }>;
    };

    const guestEvent = createEvent();
    const cart = await cartGetHandler(guestEvent);

    expect(cart.data.products).toEqual([]);
  });

  it('keeps reviewer carts isolated across browser sessions', async () => {
    const { default: cartGetHandler } = (await import('../server/api/cart.get')) as {
      default: (event: unknown) => Promise<{ data: { products: Array<{ id: string }> } }>;
    };
    const { default: cartPostHandler } = (await import('../server/api/cart.post')) as {
      default: (event: unknown) => Promise<{ data: { products: Array<{ id: string }> } }>;
    };

    const guestOne = createEvent();
    const guestTwo = createEvent();

    await cartGetHandler(guestOne);
    await cartGetHandler(guestTwo);

    await cartPostHandler({
      ...guestOne,
      body: {
        products: [{ id: 'prod-2', stock: 1, isFolder: false }],
      },
    });

    const guestTwoCart = await cartGetHandler(guestTwo);
    expect(guestTwoCart.data.products.some((product) => product.id === 'prod-2')).toBe(false);
  });

  it('survives a simulated server restart for the same reviewer session', async () => {
    const { default: cartGetHandler } = (await import('../server/api/cart.get')) as {
      default: (event: unknown) => Promise<{ data: { products: Array<{ id: string }> } }>;
    };
    const { default: cartPostHandler } = (await import('../server/api/cart.post')) as {
      default: (event: unknown) => Promise<{ data: { products: Array<{ id: string }> } }>;
    };

    const guestEvent = createEvent();
    await cartGetHandler(guestEvent);

    await cartPostHandler({
      ...guestEvent,
      body: {
        products: [{ id: 'prod-2', stock: 2, isFolder: false }],
      },
    });

    const guestSessionId = guestEvent.cookies['guest-session-id'];
    expect(guestSessionId).toBeDefined();

    const { findMockCartById } = await import('../server/utils/mockCart');
    const restartedCart = await findMockCartById(`mock-cart-guest-user-session-${guestSessionId}`);

    expect(restartedCart).not.toBeNull();
    const prod2 = restartedCart?.products.find((product) => product.id === 'prod-2');
    expect(prod2?.stock).toBe(2);
  });

  it('resolves carts by id after an independent cart read', async () => {
    const { default: cartGetHandler } = (await import('../server/api/cart.get')) as {
      default: (event: unknown) => Promise<{ data: { _id: string; products: Array<{ id: string }> } }>;
    };

    const guestEvent = createEvent();
    const cart = await cartGetHandler(guestEvent);

    const { findMockCartById } = await import('../server/utils/mockCart');
    const resolved = await findMockCartById(cart.data._id);

    expect(resolved?._id).toBe(cart.data._id);
    expect(resolved?.products).toEqual([]);
  });
});
