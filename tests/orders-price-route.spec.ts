import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('~~/server/domain/cart', () => ({
  cart: {
    getSnapshot: vi.fn(async () => ({
      kind: 'found',
      snapshot: {
        cartId: 'cart-1',
        ownerId: 'mock-customer-1',
        revision: '1',
        items: [{ productId: 'prod-1', immediateQuantity: 1, backorderQuantity: 0 }],
      },
    })),
  },
}));

describe('orders pricing route', () => {
  beforeAll(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: true } }));
    vi.stubGlobal('readBody', (event: { body?: unknown }) => event.body);
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers || {});
  });

  it('returns the complete server quote for the selected delivery service', async () => {
    const { default: handler } = (await import('../server/api/orders/price.post')) as {
      default: (event: unknown) => Promise<unknown>;
    };
    const authorization = `Bearer demo-token::mock-customer-1::${Date.now()}`;

    await expect(
      handler({
        headers: { authorization },
        body: {
          order: {
            cartId: 'cart-1',
            total: 0.01,
            subtotal: 0.01,
            deliveryMethod: { service: { id: 2 }, price: { total: 0.01 } },
          },
        },
      }),
    ).resolves.toMatchObject({
      status: 'success',
      data: {
        selected: { service: { id: 2 }, price: { total: 29.9 } },
        review: {
          cartRevision: '1',
          quoteFingerprint: expect.any(String),
        },
        quote: {
          merchandiseTotal: 80.66,
          discountTotal: 4.24,
          shippingTotal: 29.9,
          smallOrderCharge: 0,
          vatRate: 0.19,
          vatTotal: 15.33,
          grandTotal: 125.89,
          lines: [
            {
              productId: 'prod-1',
              quantity: 1,
              listUnitPrice: 84.9,
              discountPercent: 5,
              discountTotal: 4.24,
              unitPrice: 80.66,
              lineTotal: 80.66,
              vatTotal: 15.33,
            },
          ],
        },
      },
    });
  });
});
