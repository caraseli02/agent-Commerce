import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { calculateCartLinePricing, clampCartQuantity, resolveTierUnitPrice } from '../helpers/prices.helper';

const volumeProduct = {
  _id: 'prod-1',
  stock: 150,
  priceHistory: [{ price: 999.99, active: true }],
  priceConfiguration: {
    smartLinkId: 'smart-price-1',
    configuration: [
      { price: 999.99, quantity: 1 },
      { price: 979.99, quantity: 5 },
      { price: 959.99, quantity: 10 },
    ],
  },
} as ProductInterface;

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

describe('cart pricing and stock helpers', () => {
  it('resolves volume tier unit prices from quantity', () => {
    expect(resolveTierUnitPrice(volumeProduct, 1)).toBe(999.99);
    expect(resolveTierUnitPrice(volumeProduct, 9)).toBe(979.99);
    expect(resolveTierUnitPrice(volumeProduct, 10)).toBe(959.99);
    expect(resolveTierUnitPrice(volumeProduct, 25)).toBe(959.99);
  });

  it('calculates line totals using the active volume tier', () => {
    const pricing = calculateCartLinePricing(volumeProduct, 10, 0);

    expect(pricing.initialUnitPrice).toBe(959.99);
    expect(pricing.unitPriceAfterDiscounts).toBe(959.99);
    expect(pricing.subtotal).toBe(9599.9);
    expect(pricing.total).toBe(9599.9);
  });

  it('clamps requested stock to available inventory', () => {
    expect(clampCartQuantity(volumeProduct, 1000)).toEqual({
      stock: 150,
      wasClamped: true,
      maxStock: 150,
    });

    expect(clampCartQuantity(volumeProduct, 12)).toEqual({
      stock: 12,
      wasClamped: false,
      maxStock: 150,
    });
  });
});

describe('mock cart stock and volume pricing enforcement', () => {
  beforeAll(() => {
    installH3Mocks();
  });

  it('clamps overstock updates and applies volume pricing on the server cart', async () => {
    const { default: cartPutHandler } = (await import('../server/api/cart.put')) as {
      default: (event: unknown) => Promise<{
        data: {
          products: Array<{
            id: string;
            stock: number;
            initialUnitPrice: number;
            unitPriceAfterDiscounts: number;
            total: number;
          }>;
        };
      }>;
    };

    const event = {
      headers: { authorization: 'Bearer mock-token' },
      body: {
        products: [{ id: 'prod-1', stock: 1000, isFolder: false }],
      },
      cookies: {},
    };

    const response = await cartPutHandler(event);
    const line = response.data.products.find((product) => product.id === 'prod-1');

    expect(line?.stock).toBe(150);
    expect(line?.initialUnitPrice).toBe(959.99);
    expect(line?.unitPriceAfterDiscounts).toBe(959.99);
    expect(line?.total).toBe(143998.5);
  });

  it('stores volume tier pricing when adding bulk quantities', async () => {
    const { default: cartPostHandler } = (await import('../server/api/cart.post')) as {
      default: (event: unknown) => Promise<{
        data: {
          products: Array<{
            id: string;
            stock: number;
            initialUnitPrice: number;
            total: number;
          }>;
        };
      }>;
    };

    const event = {
      headers: { authorization: 'Bearer mock-token' },
      body: {
        products: [{ id: 'prod-1', stock: 9, isFolder: false }],
      },
      cookies: {},
    };

    const response = await cartPostHandler(event);
    const line = response.data.products.find((product) => product.id === 'prod-1');

    expect(line?.stock).toBe(10);
    expect(line?.initialUnitPrice).toBe(959.99);
    expect(line?.total).toBe(9599.9);
  });
});
