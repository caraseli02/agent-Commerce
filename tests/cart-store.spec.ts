import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { CartInterface } from '../model/cart/response/cart.interface';
import { __setMockApiClient, __setMockCookie } from './mocks/nuxt-app';

const sampleCart = {
  _id: 'cart-test-1',
  userId: 'mock-customer-1',
  products: [
    {
      id: 'prod-2',
      stock: 1,
      backorder_stock: 0,
      isFolder: false,
      initialUnitPrice: 1499.99,
      unitPriceAfterDiscounts: 1499.99,
      subtotal: 1499.99,
      total: 1499.99,
    },
  ],
  startDate: '2026-06-19T00:00:00.000Z',
  endDate: '2026-06-19T00:00:00.000Z',
} as CartInterface;

describe('cart store flow boundary', () => {
  const apiRequests: Array<{ resource: string; method?: string }> = [];

  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    setActivePinia(createPinia());
    apiRequests.length = 0;
    __setMockCookie('token', 'mock-token');
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method });

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: sampleCart } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });
  });

  it('fetches the mock cart through the cart API client and stores the returned cart', async () => {
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();

    const cart = await cartStore.updateAndReturnCart();

    expect(cart?._id).toBe('cart-test-1');
    expect(cartStore.cart?._id).toBe('cart-test-1');
    expect(cartStore.cart?.products?.[0]?.id).toBe('prod-2');
  });

  it('exposes the cached cart synchronously without fetching', async () => {
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();

    expect(cartStore.getCart).toBeNull();
    expect(apiRequests).toEqual([]);

    cartStore.setCart(sampleCart);

    expect(cartStore.getCart?._id).toBe('cart-test-1');
    expect(apiRequests).toEqual([]);
  });

  it('derives subtotal synchronously without mutating subtotal state', async () => {
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();

    cartStore.cartSubtotal = 123;
    cartStore.setCart({
      ...sampleCart,
      products: [
        {
          ...sampleCart.products[0],
          stock: 2,
          backorder_stock: 1,
          unitPriceAfterDiscounts: 10,
        },
      ],
    });

    expect(cartStore.getCartSubtotal).toBe(30);
    expect(cartStore.cartSubtotal).toBe(123);
    expect(apiRequests).toEqual([]);
  });
});
