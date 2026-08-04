import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { CartInterface, CartProductsInterface } from '~/types/cart';
import { __setMockApiClient, __setMockCookie, __setMockRuntimeConfig } from './mocks/nuxt-app';

const product = {
  id: 'prod-2',
  stock: 1,
  backorder_stock: 0,
  isFolder: false,
  initialUnitPrice: 1499.99,
  unitPriceAfterDiscounts: 1499.99,
  subtotal: 1499.99,
  total: 1499.99,
  discount: {
    value: 0,
    startDate: '2026-06-19T00:00:00.000Z',
    endDate: '2026-06-19T00:00:00.000Z',
  },
} as CartProductsInterface;

const secondProduct = {
  ...product,
  id: 'prod-3',
  stock: 2,
  unitPriceAfterDiscounts: 10,
  subtotal: 20,
  total: 20,
} as CartProductsInterface;

const sampleCart = {
  _id: 'cart-chrome-1',
  userId: 'mock-customer-1',
  products: [product, secondProduct],
  startDate: '2026-06-19T00:00:00.000Z',
  endDate: '2026-06-19T00:00:00.000Z',
} as CartInterface;

const cartAfterRemove = {
  ...sampleCart,
  products: [secondProduct],
} as CartInterface;

const source = (path: string) => readFileSync(resolve(path), 'utf8');

describe('cart chrome coordination (store-driven, no event bus)', () => {
  it('keeps buyer-path cart chrome off the global emitter bus', () => {
    const chromePaths = [
      'components/layout/header/MainRow.vue',
      'components/layout/favorites-cart-modal/Index.vue',
      'components/layout/favorites-cart-modal/cart/Index.vue',
      'store/cartStore.ts',
      'composables/useCart.ts',
    ];

    for (const path of chromePaths) {
      const fileSource = source(path);
      expect(fileSource).not.toMatch(/Emitter\.on\(['"]update-cart['"]/);
      expect(fileSource).not.toMatch(/Emitter\.emit\(['"]update-cart['"]/);
    }
  });

  it('does not require a cart data prop on the cart side panel shell', () => {
    const modalShell = source('components/layout/favorites-cart-modal/Index.vue');
    const cartPanel = source('components/layout/favorites-cart-modal/cart/Index.vue');
    const headerRow = source('components/layout/header/MainRow.vue');

    expect(modalShell).not.toContain('defineProps');
    expect(cartPanel).not.toContain('defineProps');
    expect(headerRow).not.toMatch(/<CartModal[^>]*:data=/);
  });
});

describe('cart chrome store consumers', () => {
  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    setActivePinia(createPinia());
    __setMockCookie('token', 'mock-token');
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
  });

  it('updates derived subtotal and mapped items when cartStore changes', async () => {
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();

    cartStore.setCart(sampleCart);

    expect(cartStore.getCartSubtotal).toBe(1519.99);
    expect(cartStore.mappedCartItems).toHaveLength(2);

    cartStore.setCart(cartAfterRemove);

    expect(cartStore.getCartSubtotal).toBe(20);
    expect(cartStore.mappedCartItems).toHaveLength(1);
    expect(cartStore.mappedCartItems[0]?.id).toBe('prod-3');
  });

  it('refreshes cartStore after removeFromCart without emitter subscriptions', async () => {
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/cart' && options?.method === 'DELETE') {
        return { status: 'success' } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: cartAfterRemove } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart, __resetAddToCartStateForTests } = await import('../composables/useCart');
    __resetAddToCartStateForTests();
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    cartStore.setCart(sampleCart);
    const { removeFromCart } = useCart();

    await removeFromCart({ products: ['prod-2'] });

    expect(cartStore.cart?.products).toHaveLength(1);
    expect(cartStore.cart?.products?.[0]?.id).toBe('prod-3');
    expect(cartStore.getCartSubtotal).toBe(20);
  });
});
