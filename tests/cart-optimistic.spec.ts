import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
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

const existingProduct = {
  ...product,
  id: 'prod-1',
  stock: 2,
} as CartProductsInterface;

const refreshedCart = {
  _id: 'cart-after-add',
  userId: 'mock-customer-1',
  products: [product],
  startDate: '2026-06-19T00:00:00.000Z',
  endDate: '2026-06-19T00:00:00.000Z',
} as CartInterface;

const priorCart = {
  _id: 'cart-before',
  userId: 'mock-customer-1',
  products: [existingProduct],
  startDate: '2026-06-19T00:00:00.000Z',
  endDate: '2026-06-19T00:00:00.000Z',
} as CartInterface;

const toast = vi.fn();

vi.mock('~/components/ui/toast', () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

describe('optimistic add-to-cart', () => {
  const apiRequests: Array<{ resource: string; method?: string; body?: unknown }> = [];

  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', {
      localStorage: () => ({
        getItem: () => null,
        setItem: () => undefined,
      }),
    });
    vi.stubGlobal('mapCartItems', mapCartItems);
    setActivePinia(createPinia());
    apiRequests.length = 0;
    toast.mockReset();
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
      expect(cartStore.cart?.products).toHaveLength(1);
    });

    expect(cartStore.cart?.products?.[0]?.id).toBe('prod-2');

    resolvePost({ status: 'success', data: refreshedCart });
    const result = await addPromise;

    expect(result).toEqual({ status: 'success', changed: true });
    expect(cartStore.cart?._id).toBe('cart-after-add');
    expect(apiRequests).toMatchObject([
      { resource: '/cart', method: 'POST' },
      { resource: '/cart', method: 'GET' },
    ]);
  });

  it('rolls back a populated cart without clearing checkout secrets when add fails', async () => {
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
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
    cartStore.setCart(priorCart);
    cartStore.setOrderClientSecret('secret-keep-me');
    const { addToCart } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toBeNull();
    expect(cartStore.cart?.products).toEqual([existingProduct]);
    expect(cartStore.orderClientSecret).toBe('secret-keep-me');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Could not update cart',
        description: 'Please try again.',
        variant: 'destructive',
      }),
    );
  });

  it('keeps the successful add when the follow-up refresh fails', async () => {
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method, body: options?.body });

      if (resource === '/cart' && options?.method === 'POST') {
        return { status: 'success' } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        throw new Error('Refresh unavailable');
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart, __resetAddToCartStateForTests } = await import('../composables/useCart');
    __resetAddToCartStateForTests();
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    const { addToCart } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toEqual({ status: 'success', changed: true });
    expect(cartStore.cart?.products?.[0]?.id).toBe('prod-2');
    expect(toast).not.toHaveBeenCalled();
  });

  it('silently ignores duplicate adds for the same product while in flight', async () => {
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
    expect(toast).not.toHaveBeenCalled();

    resolvePost({ status: 'success', data: refreshedCart });
    await first;
  });

  it('restores null cart snapshots as null on failure', async () => {
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/cart' && options?.method === 'POST') {
        throw new Error('Network unavailable');
      }
      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart, __resetAddToCartStateForTests } = await import('../composables/useCart');
    __resetAddToCartStateForTests();
    const { useCartStore } = await import('../store/cartStore');
    const cartStore = useCartStore();
    cartStore.setOrderClientSecret('secret-keep-me');
    const { addToCart } = useCart();

    await addToCart({ products: [product], userId: '' });

    expect(cartStore.cart).toBeNull();
    expect(cartStore.orderClientSecret).toBe('secret-keep-me');
  });

  it('applies optimistic unit prices from the payload', async () => {
    const { applyOptimisticCartAdd } = await import('../utils/cart');
    const next = applyOptimisticCartAdd(null, [
      {
        id: 'priced',
        stock: 2,
        unitPriceAfterDiscounts: 12.5,
        initialUnitPrice: 15,
        productEntity: { _id: 'priced' } as never,
      },
    ]);

    expect(next.products[0]).toMatchObject({
      id: 'priced',
      stock: 2,
      unitPriceAfterDiscounts: 12.5,
      initialUnitPrice: 15,
      total: 25,
      subtotal: 25,
      productEntity: { _id: 'priced' },
    });
  });
});
