import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PaymentStatusEnum, PaymentTypeEnum } from '../types/order-summary/item';

const installH3Mocks = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('readBody', async (event: { body?: unknown }) => event.body ?? {});
  vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
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
    expect(productResponse.data.name).toBe('Professional Laptop Ultra');
  });

  it('adds products through the cart endpoint and converts the cart into a paid mock order', async () => {
    const { createMockToken } = await import('../server/utils/mockUsers');
    const cartHandler = (await import('../server/api/cart.post')).default as (event: unknown) => Promise<unknown>;
    const orderHandler = (await import('../server/api/orders/new.post')).default as (event: unknown) => Promise<unknown>;

    const token = createMockToken('mock-customer-1');
    const cartResponse = (await cartHandler({
      headers: { authorization: `Bearer ${token}` },
      body: {
        products: [{ id: 'prod-2', stock: 1, isFolder: false }],
      },
    })) as { data: { _id: string; products: Array<{ id: string }> } };

    expect(cartResponse.data.products.some(product => product.id === 'prod-2')).toBe(true);

    const orderResponse = (await orderHandler({
      headers: { authorization: `Bearer ${token}` },
      body: {
        cartId: cartResponse.data._id,
        paymentDetails: { type: PaymentTypeEnum.Card },
      },
    })) as { status: string; data: { orderId: string; status: PaymentStatusEnum; result?: { status: string } } };

    expect(orderResponse.status).toBe('success');
    expect(orderResponse.data.orderId).toMatch(/^ord-/);
    expect(orderResponse.data.status).toBe(PaymentStatusEnum.Paid);
    expect(orderResponse.data.result?.status).toBe('succeeded');
  });
});
