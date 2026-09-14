import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('~/server/domain/cart', () => ({
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
          merchandiseTotal: 949.99,
          discountTotal: 50,
          shippingTotal: 29.9,
          smallOrderCharge: 0,
          vatRate: 0.19,
          vatTotal: 180.5,
          grandTotal: 1160.39,
          lines: [
            {
              productId: 'prod-1',
              quantity: 1,
              listUnitPrice: 999.99,
              discountPercent: 5,
              discountTotal: 50,
              unitPrice: 949.99,
              lineTotal: 949.99,
              vatTotal: 180.5,
            },
          ],
        },
      },
    });
  });
});
