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

  it('sends a negative delta when reducing an existing cart quantity', async () => {
    const addToCart = vi.fn(async () => ({ status: 'success' }));
    vi.doMock('../composables/useCart', () => ({
      useCart: () => ({ addToCart }),
    }));

    const { addToCartHelper } = await import('../helpers/prices.helper');
    const result = await addToCartHelper(volumeProduct, -2, {
      currentCartQuantity: 5,
      isDelta: true,
    });

    expect(result).toEqual({ status: 'success' });
    expect(addToCart).toHaveBeenCalledWith({
      userId: '',
      products: [{ id: 'prod-1', stock: -2, isFolder: false }],
    });
  });

  it('initializes PDP quantity from available stock only on mixed lines', async () => {
    const { ref } = await import('vue');
    const { initializeQuantities } = await import('../helpers/prices.helper');
    const limitedProduct = { ...volumeProduct, stock: 5 } as ProductInterface;
    const quantity = ref(0);
    const initialRequestedQuantity = ref(0);

    initializeQuantities(
      limitedProduct,
      {
        userId: 'user-1',
        startDate: '',
        endDate: '',
        products: [{ id: 'prod-1', stock: 5, backorder_stock: 10, isFolder: false }],
      } as never,
      quantity,
      initialRequestedQuantity,
      { price: 999.99, quantity: 1 }
    );

    expect(quantity.value).toBe(5);
    expect(initialRequestedQuantity.value).toBe(5);

    const clamped = clampCartQuantity(limitedProduct, quantity.value);
    expect(clamped).toEqual({ stock: 5, wasClamped: false, maxStock: 5 });
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

  it('preserves backorder when available stock is reduced on a mixed line', async () => {
    const { default: cartPutHandler } = (await import('../server/api/cart.put')) as {
      default: (event: unknown) => Promise<{
        data: {
          products: Array<{
            id: string;
            stock: number;
            backorder_stock?: number;
            total: number;
          }>;
        };
      }>;
    };
    const { default: cartPostHandler } = (await import('../server/api/cart.post')) as {
      default: (event: unknown) => Promise<{
        data: {
          products: Array<{
            id: string;
            stock: number;
            backorder_stock?: number;
          }>;
        };
      }>;
    };

    const cookies = { 'guest-session-id': 'mixed-line-guest' };
    const auth = { authorization: 'Bearer mock-token-mixed' };

    await cartPutHandler({
      headers: auth,
      body: {
        products: [{ id: 'prod-1', stock: 5, backorder_stock: 10, isFolder: false }],
      },
      cookies,
    });

    // PDP edits available stock only: reduce 5 → 3 as a negative delta; backorder stays 10.
    const response = await cartPostHandler({
      headers: auth,
      body: {
        products: [{ id: 'prod-1', stock: -2, isFolder: false }],
      },
      cookies,
    });

    const line = response.data.products.find((product) => product.id === 'prod-1');
    expect(line?.stock).toBe(3);
    expect(line?.backorder_stock).toBe(10);
  });
});
