import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import Emitter from 'tiny-emitter/instance.js';
import { mapCartItems } from '../utils/cart';
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

const refreshedCart = {
  _id: 'cart-after-add',
  userId: 'mock-customer-1',
  products: [product],
  startDate: '2026-06-19T00:00:00.000Z',
  endDate: '2026-06-19T00:00:00.000Z',
} as CartInterface;

const toast = vi.fn();

vi.mock('~/components/ui/toast', () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

describe('optimistic add-to-cart', () => {
  const apiRequests: Array<{ resource: string; method?: string; body?: unknown }> = [];
  const emittedCarts: unknown[] = [];

  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    vi.stubGlobal('mapCartItems', mapCartItems);
    setActivePinia(createPinia());
    apiRequests.length = 0;
    emittedCarts.length = 0;
    toast.mockReset();
    Emitter.off('update-cart');
    Emitter.on('update-cart', (cart: unknown) => emittedCarts.push(cart));
    __setMockCookie('token', 'mock-token');
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
  });

  it('updates the stored cart before the add API resolves', async () => {
    let resolvePost: (value: unknown) => void = () => {};
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method, body: options?.body });

      if (resource === '/cart' && options?.method === 'POST') {
        return (await postPromise) as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: refreshedCart } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart, __resetAddToCartStateForTests } = await import('../composables/useCart');
    __resetAddToCartStateForTests();
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { addToCart } = useCart();

    const addPromise = addToCart({ products: [product], userId: '' });

    await vi.waitFor(() => {
      expect(emittedCarts).toHaveLength(1);
    });

    expect(cartStore.cart?.products).toHaveLength(1);
    expect(cartStore.cart?.products?.[0]?.id).toBe('prod-2');
    expect(emittedCarts).toHaveLength(1);

    resolvePost({ status: 'success', data: refreshedCart });
    await addPromise;

    expect(cartStore.cart?._id).toBe('cart-after-add');
    expect(apiRequests).toMatchObject([
      { resource: '/cart', method: 'POST' },
      { resource: '/cart', method: 'GET' },
    ]);
  });

  it('rolls back optimistic state and surfaces failure feedback when add fails', async () => {
    __setMockApiClient(async <T>(resource: string, options?: { method?: string }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method, body: options?.body });

      if (resource === '/cart' && options?.method === 'POST') {
        throw new Error('Network unavailable');
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart, __resetAddToCartStateForTests } = await import('../composables/useCart');
    __resetAddToCartStateForTests();
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { addToCart } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toBeNull();
    expect(cartStore.cart?.products).toEqual([]);
    expect(emittedCarts.at(-1)).toEqual(expect.objectContaining({ products: [] }));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Could not update cart',
        variant: 'destructive',
      })
    );
    expect(apiRequests).toEqual([{ resource: '/cart', method: 'POST', body: expect.any(Object) }]);
  });

  it('ignores duplicate add requests while one mutation is in flight', async () => {
    let resolvePost: (value: unknown) => void = () => {};
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method, body: options?.body });

      if (resource === '/cart' && options?.method === 'POST') {
        return (await postPromise) as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: refreshedCart } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart, __resetAddToCartStateForTests } = await import('../composables/useCart');
    __resetAddToCartStateForTests();
    const { addToCart } = useCart();

    const first = addToCart({ products: [product], userId: '' });
    await Promise.resolve();
    const second = await addToCart({ products: [product], userId: '' });

    expect(second).toBeNull();
    expect(apiRequests.filter((request) => request.method === 'POST')).toHaveLength(1);

    resolvePost({ status: 'success', data: refreshedCart });
    await first;
  });
});
