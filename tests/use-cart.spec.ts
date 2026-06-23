import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import Emitter from 'tiny-emitter/instance.js';
import { mapCartItems } from '../utils/cart';
import type { CartInterface, CartProductsInterface } from '../model/cart/response/cart.interface';
import { __setMockApiClient, __setMockCookie, __setMockRouterPush, __setMockRuntimeConfig } from './mocks/nuxt-app';

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

const refreshedCart = {
  _id: 'cart-after-add',
  userId: 'mock-customer-1',
  products: [product],
  startDate: '2026-06-19T00:00:00.000Z',
  endDate: '2026-06-19T00:00:00.000Z',
} as CartInterface;

describe('useCart public cart interface', () => {
  const apiRequests: Array<{ resource: string; method?: string; body?: unknown }> = [];
  const emittedCarts: unknown[] = [];
  const openedAccountModals: boolean[] = [];
  const routerPush = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    vi.stubGlobal('mapCartItems', mapCartItems);
    setActivePinia(createPinia());
    apiRequests.length = 0;
    emittedCarts.length = 0;
    openedAccountModals.length = 0;
    routerPush.mockReset();
    Emitter.off('update-cart');
    Emitter.off('open-account-modal');
    Emitter.on('update-cart', (cart: unknown) => emittedCarts.push(cart));
    Emitter.on('open-account-modal', () => openedAccountModals.push(true));
    __setMockCookie('token', 'mock-token');
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
    __setMockRouterPush(routerPush);
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method, body: options?.body });

      if (resource === '/cart' && options?.method === 'POST') {
        return { status: 'success', data: refreshedCart } as T;
      }

      if (resource === '/cart' && options?.method === 'PUT') {
        return { status: 'success', data: refreshedCart } as T;
      }

      if (resource === '/cart' && options?.method === 'DELETE') {
        return { status: 'success', data: refreshedCart } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: refreshedCart } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });
  });

  it('adds to cart through the cart API and refreshes the stored cart', async () => {
    const { useCart } = await import('../composables/useCart');
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { addToCart, cartItems, cartId } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toMatchObject({ status: 'success' });
    expect(apiRequests).toMatchObject([
      { resource: '/cart', method: 'POST' },
      { resource: '/cart', method: 'GET' },
    ]);
    expect(cartStore.cart?._id).toBe('cart-after-add');
    expect(cartId.value).toBe('cart-after-add');
    expect(cartItems.value).toHaveLength(1);
    expect(emittedCarts).toEqual([refreshedCart]);
  });

  it('refreshes the stored cart after a mock guest adds an item', async () => {
    __setMockCookie('token', undefined);
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
    const { useCart } = await import('../composables/useCart');
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { addToCart, cartItems, cartId } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toMatchObject({ status: 'success' });
    expect(apiRequests).toMatchObject([
      { resource: '/cart', method: 'POST' },
      { resource: '/cart', method: 'GET' },
    ]);
    expect(cartStore.cart?._id).toBe('cart-after-add');
    expect(cartId.value).toBe('cart-after-add');
    expect(cartItems.value).toHaveLength(1);
    expect(emittedCarts).toEqual([refreshedCart]);
  });

  it('updates a cart item through the cart API and refreshes the stored cart', async () => {
    const { useCart } = await import('../composables/useCart');
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { updateCartItem, cartItems, cartId } = useCart();

    const result = await updateCartItem({ products: [{ ...product, stock: 2 }], userId: '' });

    expect(result).toMatchObject({ status: 'success' });
    expect(apiRequests).toMatchObject([
      { resource: '/cart', method: 'PUT' },
      { resource: '/cart', method: 'GET' },
    ]);
    expect(cartStore.cart?._id).toBe('cart-after-add');
    expect(cartId.value).toBe('cart-after-add');
    expect(cartItems.value).toHaveLength(1);
    expect(emittedCarts).toEqual([refreshedCart]);
  });

  it('removes cart items through the cart API and refreshes the stored cart', async () => {
    const { useCart } = await import('../composables/useCart');
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { removeFromCart, cartItems, cartId } = useCart();

    const result = await removeFromCart({ products: ['prod-2'] });

    expect(result).toMatchObject({ status: 'success' });
    expect(apiRequests).toMatchObject([
      { resource: '/cart', method: 'DELETE' },
      { resource: '/cart', method: 'GET' },
    ]);
    expect(cartStore.cart?._id).toBe('cart-after-add');
    expect(cartId.value).toBe('cart-after-add');
    expect(cartItems.value).toHaveLength(1);
    expect(emittedCarts).toEqual([refreshedCart]);
  });

  it('opens sign-in instead of mutating cart when non-mock users have no token', async () => {
    __setMockCookie('token', undefined);
    __setMockRuntimeConfig({ public: { MOCK_MODE: false } });
    const { useCart } = await import('../composables/useCart');
    const { addToCart } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toBeNull();
    expect(routerPush).toHaveBeenCalledWith('/');
    expect(openedAccountModals).toEqual([true]);
    expect(apiRequests).toEqual([]);
  });

  it('routes the shared add-to-cart helper through the public cart composable', async () => {
    const { addToCartHelper } = await import('../helpers/prices.helper');

    const result = await addToCartHelper({ _id: 'prod-2' } as never, 3);

    expect(result).toMatchObject({ status: 'success' });
    expect(apiRequests).toMatchObject([
      {
        resource: '/cart',
        method: 'POST',
        body: {
          userId: '',
          products: [{ id: 'prod-2', stock: 3, isFolder: false }],
        },
      },
      { resource: '/cart', method: 'GET' },
    ]);
  });

  it('does not expose the removed legacy cart module on the app API', async () => {
    const { useNuxtApp } = await import('#app');

    expect(useNuxtApp().$api).not.toHaveProperty('cart');
  });
});
