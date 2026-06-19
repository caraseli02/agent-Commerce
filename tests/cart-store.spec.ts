import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { CartInterface } from '../model/cart/response/cart.interface';
import { __setMockCartResponse } from './mocks/nuxt-app';

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
  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    setActivePinia(createPinia());
    __setMockCartResponse({ status: 'success', data: sampleCart });
  });

  it('fetches the mock cart through Nuxt app API and stores the returned cart', async () => {
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();

    const cart = await cartStore.updateAndReturnCart();

    expect(cart?._id).toBe('cart-test-1');
    expect(cartStore.cart?._id).toBe('cart-test-1');
    expect(cartStore.cart?.products?.[0]?.id).toBe('prod-2');
  });
});
