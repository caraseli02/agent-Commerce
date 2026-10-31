import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parse as parseSfc } from '@vue/compiler-sfc';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mapCartItems } from '../app/utils/cart';
import type { CartInterface, CartProductsInterface } from '~~/types/cart';
import { __setMockApiClient, __setMockCookie, __setMockRuntimeConfig } from './mocks/nuxt-app';

const cartPanelPath = resolve('app/components/layout/favorites-cart-modal/cart/Index.vue');
const productItemPath = resolve('app/components/layout/favorites-cart-modal/cart/CartProductItem.vue');

function scriptSetup(filePath: string) {
  const { descriptor } = parseSfc(readFileSync(filePath, 'utf8'));

  expect(descriptor.scriptSetup).toBeTruthy();

  return descriptor.scriptSetup!.content;
}

describe('cart drawer line removal (#871)', () => {
  it('lets the line item only announce the removal', () => {
    const itemScript = scriptSetup(productItemPath);

    // Removing here unmounted the row first, so the drawer's handler (and its catch) never ran.
    expect(itemScript).not.toContain('removeFromCart');
    expect(itemScript).not.toContain('useCart');
    expect(itemScript).toMatch(/emits\('delete-product', props\.product\)/);
  });

  it('removes the line once from the drawer', () => {
    const panelSource = readFileSync(cartPanelPath, 'utf8');
    const panelScript = scriptSetup(cartPanelPath);

    expect(panelSource).toContain('@delete-product="deleteProduct"');
    expect(panelScript.match(/removeFromCart\(/g)).toHaveLength(1);
    expect(panelScript).toMatch(/const deleteProduct = async[\s\S]*removeFromCart\(\{ products: \[object\.id\] \}\)/);
  });
});

const line = {
  id: 'prod-2',
  stock: 1,
  backorder_stock: 0,
  isFolder: false,
  initialUnitPrice: 1499.99,
  unitPriceAfterDiscounts: 1499.99,
  subtotal: 1499.99,
  total: 1499.99,
  discount: { value: 0, startDate: '2026-06-19T00:00:00.000Z', endDate: '2026-06-19T00:00:00.000Z' },
} as CartProductsInterface;

describe('cart line removal while a DELETE is in flight (#871)', () => {
  let serverProducts: CartProductsInterface[] = [];
  let deleteRequests = 0;
  let pendingDeletes: Array<{ settle: (ok: boolean) => void }> = [];

  const serverCart = () =>
    ({
      _id: 'cart-1',
      userId: 'mock-customer-1',
      products: [...serverProducts],
      startDate: '2026-06-19T00:00:00.000Z',
      endDate: '2026-06-19T00:00:00.000Z',
    }) as CartInterface;

  // Each DELETE waits until the test settles it, then applies (or fails) on the mock server.
  const settleDelete = async (ok: boolean) => {
    await vi.waitFor(() => expect(pendingDeletes).not.toHaveLength(0));
    pendingDeletes.shift()!.settle(ok);
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    vi.stubGlobal('mapCartItems', mapCartItems);
    setActivePinia(createPinia());
    serverProducts = [line];
    deleteRequests = 0;
    pendingDeletes = [];
    __setMockCookie('token', 'mock-token');
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/cart' && options?.method === 'DELETE') {
        deleteRequests += 1;
        const ids = (options.body as { products: string[] }).products;
        const ok = await new Promise<boolean>((resolve) => pendingDeletes.push({ settle: resolve }));
        if (!ok) throw new Error('Network unavailable');
        serverProducts = serverProducts.filter((product) => !ids.includes(product.id));
        return { status: 'success', data: serverCart() } as T;
      }

      if (resource === '/cart' && options?.method === 'POST') {
        serverProducts = [...serverProducts, line];
        return { status: 'success', data: serverCart() } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: serverCart() } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });
  });

  it('drops repeated removals, even from a remounted drawer, so a re-added line survives', async () => {
    const { useCart, __resetAddToCartStateForTests } = await import('../app/composables/useCart');
    const { useCartStore } = await import('../app/store/cartStore');
    __resetAddToCartStateForTests();
    const cartStore = useCartStore();

    const first = useCart().removeFromCart({ products: ['prod-2'] });
    // Double click, then the drawer closes and reopens with a fresh useCart().
    await expect(useCart().removeFromCart({ products: ['prod-2'] })).resolves.toBeNull();
    await expect(useCart().removeFromCart({ products: ['prod-2'] })).resolves.toBeNull();
    expect(deleteRequests).toBe(1);

    await settleDelete(true);
    await expect(first).resolves.toMatchObject({ status: 'success' });
    expect(cartStore.cart?.products).toHaveLength(0);

    await useCart().addToCart({ products: [line], userId: '' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deleteRequests).toBe(1);
    expect(pendingDeletes).toHaveLength(0);
    expect(cartStore.cart?.products?.map((product) => product.id)).toEqual(['prod-2']);
  });

  it('releases the guard after a failed removal so the shopper can retry', async () => {
    const { useCart } = await import('../app/composables/useCart');
    const { useCartStore } = await import('../app/store/cartStore');
    const cartStore = useCartStore();

    const failed = useCart()
      .removeFromCart({ products: ['prod-2'] })
      .catch((error: Error) => error);
    await settleDelete(false);
    expect(await failed).toMatchObject({ message: 'Network unavailable' });
    expect(cartStore.isProductRemoveInFlight('prod-2')).toBe(false);

    const retry = useCart().removeFromCart({ products: ['prod-2'] });
    await settleDelete(true);

    await expect(retry).resolves.toMatchObject({ status: 'success' });
    expect(deleteRequests).toBe(2);
    expect(cartStore.cart?.products).toHaveLength(0);
  });
});
