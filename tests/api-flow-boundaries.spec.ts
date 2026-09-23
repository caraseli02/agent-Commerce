import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PaymentStatusEnum, PaymentTypeEnum } from '../types/order-summary/item';

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
    setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
      event.cookies ??= {};
      event.cookies[name] = value;
    },
  };
});

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: true } }));
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
  vi.stubGlobal('getCookie', (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name]);
  vi.stubGlobal('setCookie', (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ??= {};
    event.cookies[name] = value;
  });
  vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string }) => {
    const error = new Error(payload.statusMessage) as Error & { statusCode?: number; statusMessage?: string };
    error.statusCode = payload.statusCode;
    error.statusMessage = payload.statusMessage;
    return error;
  });
};

describe('mock API flow boundaries', () => {
  beforeAll(() => {
    installH3Mocks();
  });

  it('resolves the product detail endpoint used by the product page flow', async () => {
    const productHandler = (await import('../server/api/products/[id].get')).default as (event: unknown) => Promise<unknown>;

    const productResponse = (await productHandler({
      params: { id: 'prod-2' },
    })) as { status: string; data: { _id: string; name: string } };

    expect(productResponse.status).toBe('success');
    expect(productResponse.data._id).toBe('prod-2');
    expect(productResponse.data.name).toBe('ADM2587E RS-485 Transceiver');
  });

  it('adds products through the cart endpoint and converts the cart into a paid mock order', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const cartHandler = (await import('../server/api/cart.post')).default as (event: unknown) => Promise<unknown>;
    const priceHandler = (await import('../server/api/orders/price.post')).default as (event: unknown) => Promise<unknown>;
    const orderHandler = (await import('../server/api/orders/new.post')).default as (event: unknown) => Promise<unknown>;

    const token = createMockToken('mock-customer-1');
    const cartResponse = (await cartHandler({
      headers: { authorization: `Bearer ${token}` },
      body: {
        products: [{ id: 'prod-2', stock: 1, isFolder: false }],
      },
    })) as { data: { _id: string; revision: string; products: Array<{ id: string }> } };

    expect(cartResponse.data.products.some((product) => product.id === 'prod-2')).toBe(true);
    const priceResponse = (await priceHandler({
      headers: { authorization: `Bearer ${token}` },
      body: { order: { cartId: cartResponse.data._id } },
    })) as { data: { review: { cartRevision: string; quoteFingerprint: string } } };

    const orderResponse = (await orderHandler({
      headers: { authorization: `Bearer ${token}` },
      body: {
        cartId: cartResponse.data._id,
        reviewedCartRevision: priceResponse.data.review.cartRevision,
        reviewedQuoteFingerprint: priceResponse.data.review.quoteFingerprint,
        paymentDetails: { type: PaymentTypeEnum.Card },
      },
    })) as { status: string; data: { orderId: string; status: PaymentStatusEnum; result?: { status: string } } };

    expect(orderResponse.status).toBe('success');
    expect(orderResponse.data.orderId).toMatch(/^ord-/);
    expect(orderResponse.data.status).toBe(PaymentStatusEnum.Paid);
    expect(orderResponse.data.result?.status).toBe('succeeded');
  });

  it('uses Nuxt runtime config for guest checkout when the raw process variable is unavailable', async () => {
    const previousMockMode = process.env.NUXT_PUBLIC_MOCK_MODE;
    process.env.NUXT_PUBLIC_MOCK_MODE = 'false';

    try {
      const cartHandler = (await import('../server/api/cart.post')).default as (event: unknown) => Promise<unknown>;
      const priceHandler = (await import('../server/api/orders/price.post')).default as (event: unknown) => Promise<unknown>;
      const orderHandler = (await import('../server/api/orders/new.post')).default as (event: unknown) => Promise<unknown>;
      const orderReadHandler = (await import('../server/api/orders/[id].get')).default as (event: unknown) => Promise<unknown>;
      const browserSession = { headers: {}, cookies: {} as Record<string, string> };

      const cartResponse = (await cartHandler({
        ...browserSession,
        body: { products: [{ id: 'prod-2', stock: 1, isFolder: false }] },
      })) as { data: { _id: string; revision: string } };
      const priceResponse = (await priceHandler({
        ...browserSession,
        body: { order: { cartId: cartResponse.data._id } },
      })) as { data: { review: { cartRevision: string; quoteFingerprint: string } } };
      const orderResponse = (await orderHandler({
        ...browserSession,
        body: {
          cartId: cartResponse.data._id,
          reviewedCartRevision: priceResponse.data.review.cartRevision,
          reviewedQuoteFingerprint: priceResponse.data.review.quoteFingerprint,
          paymentDetails: { type: PaymentTypeEnum.Card },
        },
      })) as { status: string; data: { orderId: string; status: PaymentStatusEnum } };

      expect(orderResponse).toMatchObject({ status: 'success', data: { status: PaymentStatusEnum.Paid } });
      await expect(orderReadHandler({ ...browserSession, params: { id: orderResponse.data.orderId } })).resolves.toMatchObject({
        status: 'success',
        data: { order: { _id: orderResponse.data.orderId } },
      });
    } finally {
      if (previousMockMode === undefined) delete process.env.NUXT_PUBLIC_MOCK_MODE;
      else process.env.NUXT_PUBLIC_MOCK_MODE = previousMockMode;
    }
  });

  it('requires the server-issued cart revision before accepting checkout', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const orderHandler = (await import('../server/api/orders/new.post')).default as (event: unknown) => Promise<unknown>;
    const token = createMockToken('mock-customer-1');

    await expect(
      orderHandler({
        headers: { authorization: `Bearer ${token}` },
        body: {
          cartId: 'mock-cart-mock-customer-1',
          paymentDetails: { type: PaymentTypeEnum.Card },
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: expect.stringContaining('review is no longer current'),
    });
  });

  it('supports the smart-pricing API loaded during admin sign-in', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const getPricing = (await import('../server/api/prices/price-settings.get')).default as unknown as (event: unknown) => {
      status: string;
      data: Array<{ _id: string }>;
    };
    const createPricing = (await import('../server/api/prices/price-setting.post')).default as (event: unknown) => Promise<{
      status: string;
      data: { id: string };
    }>;
    const deletePricing = (await import('../server/api/prices/price-setting/[id].delete')).default as (event: unknown) => {
      status: string;
    };
    const updatePricing = (await import('../server/api/prices/price-setting/[id].patch')).default as (event: unknown) => Promise<{
      status: string;
      data: { id: string };
    }>;
    const adminToken = createMockToken('mock-admin-1');
    const customerToken = createMockToken('mock-customer-1');
    const browserSession = {
      headers: { authorization: `Bearer ${adminToken}` },
      cookies: {} as Record<string, string>,
    };

    expect(getPricing(browserSession).data).toHaveLength(3);

    const created = await createPricing({
      ...browserSession,
      body: { type: 0, range: { min: 100, max: 250 }, label: 'Test range' },
    });

    expect(created.status).toBe('success');
    expect(getPricing(browserSession).data.some((item) => item._id === created.data.id)).toBe(true);

    expect(
      (
        await updatePricing({
          ...browserSession,
          params: { id: created.data.id },
          body: { type: 0, range: { min: 125, max: 275 }, label: 'Updated range' },
        })
      ).status,
    ).toBe('success');

    await expect(
      createPricing({
        ...browserSession,
        body: { type: 1, values: {}, label: 'Poison attempt' },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(createPricing({ body: { type: 1, values: [10], label: 'No auth' } })).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      createPricing({
        headers: { authorization: `Bearer ${customerToken}` },
        body: { type: 1, values: [10], label: 'Customer write' },
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    const isolatedSession = {
      headers: { authorization: `Bearer ${adminToken}` },
      cookies: {} as Record<string, string>,
    };
    expect(getPricing(isolatedSession).data).toHaveLength(3);

    expect(deletePricing({ ...browserSession, params: { id: created.data.id } }).status).toBe('success');
    expect(getPricing(browserSession).data.some((item) => item._id === created.data.id)).toBe(false);
  });
});
