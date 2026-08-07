import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mapCartItems } from '../utils/cart';
import type { CartProductsInterface } from '~/types/cart';
import { __setMockApiClient, __setMockCookie, __setMockRouterPush, __setMockRuntimeConfig } from './mocks/nuxt-app';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

const source = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');

const accountModalOpenPaths = [
  'components/layout/header/MainRow.vue',
  'components/layout/header/main-menu/MobileSheet.vue',
  'composables/useCart.ts',
  'store/uiStore.ts',
];

const accountModalEmitterPatterns = [
  /Emitter\.on\(['"]open-account/,
  /Emitter\.emit\(['"]open-account/,
  /Emitter\.on\(['"]show-account/,
  /Emitter\.emit\(['"]show-account/,
  /Emitter\.on\(['"]account-modal/,
  /Emitter\.emit\(['"]account-modal/,
];

describe('account modal coordination (store-driven, no event bus)', () => {
  it('keeps buyer-path account modal opens off the global emitter bus', () => {
    for (const path of accountModalOpenPaths) {
      const fileSource = source(path);

      for (const pattern of accountModalEmitterPatterns) {
        expect(fileSource).not.toMatch(pattern);
      }
    }
  });

  it('wires MainRow to uiStore account modal requests instead of emitter listeners', () => {
    const headerRow = source('components/layout/header/MainRow.vue');
    const mobileSheet = source('components/layout/header/main-menu/MobileSheet.vue');

    expect(headerRow).toContain('uiStore.accountModalRequestId');
    expect(headerRow).toContain('openAccountModal');
    expect(headerRow).not.toMatch(/Emitter\.on\(/);
    expect(mobileSheet).toContain('requestOpenAccountModal');
  });
});

describe('account modal coordination runtime', () => {
  const routerPush = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    vi.stubGlobal('mapCartItems', mapCartItems);
    setActivePinia(createPinia());
    routerPush.mockReset();
    __setMockCookie('token', undefined);
    __setMockRuntimeConfig({ public: { MOCK_MODE: false } });
    __setMockRouterPush(routerPush);
    __setMockApiClient(async () => {
      throw new Error('unexpected api call');
    });
  });

  it('bumps uiStore when live guests hit the cart auth gate', async () => {
    const { useCart } = await import('../composables/useCart');
    const { useUiStore } = await import('../store/uiStore');
    const uiStore = useUiStore();
    const { addToCart } = useCart();

    await addToCart({ products: [product], userId: '' });

    expect(routerPush).toHaveBeenCalledWith('/');
    expect(uiStore.accountModalRequestId).toBe(1);
  });

  it('lets mock guests add to cart without an account modal request', async () => {
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
    __setMockApiClient(async <T>(resource: string, options?: { method?: string }): Promise<T> => {
      if (resource === '/cart' && options?.method === 'POST') {
        return { status: 'success', data: { _id: 'cart-mock', products: [product] } } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-mock', products: [product] } } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCart } = await import('../composables/useCart');
    const { useUiStore } = await import('../store/uiStore');
    const uiStore = useUiStore();
    const { addToCart } = useCart();

    const result = await addToCart({ products: [product], userId: '' });

    expect(result).toMatchObject({ status: 'success' });
    expect(uiStore.accountModalRequestId).toBe(0);
    expect(routerPush).not.toHaveBeenCalled();
  });
});
