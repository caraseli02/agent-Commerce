import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mapCartItems } from '../app/utils/cart';
import type { CartInterface, CartProductsInterface } from '~~/types/cart';
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

describe('buyer-path store coordination (no emitter bus)', () => {
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

  it('requests the account modal through uiStore when guests need to sign in', async () => {
    const { useCart } = await import('../app/composables/useCart');
    const { useUiStore } = await import('../app/store/uiStore');
    const uiStore = useUiStore();
    const { addToCart } = useCart();

    await addToCart({ products: [product], userId: '' });

    expect(routerPush).toHaveBeenCalledWith('/');
    expect(uiStore.accountModalRequestId).toBe(1);
  });

  it('clears cart state and notification unread count on sign out', async () => {
    const { useAuthStore } = await import('../app/store/authStore');
    const { useCartStore } = await import('../app/store/cartStore');
    const { useNotificationStore } = await import('../app/store/notificationStore');

    const authStore = useAuthStore();
    const cartStore = useCartStore();
    const notificationStore = useNotificationStore();

    cartStore.setCart(refreshedCart);
    notificationStore.unreadNotifications = 3;

    authStore.signOut();

    expect(cartStore.cart).toBeNull();
    expect(notificationStore.unreadNotifications).toBe(0);
  });

  it('bumps notification refresh when user cards are loaded', async () => {
    __setMockApiClient(async <T>(resource: string): Promise<T> => {
      if (resource === '/user/cards') {
        return { status: 'success', data: [] } as T;
      }
      throw new Error(`Unexpected API request: ${resource}`);
    });

    const { useAuthStore } = await import('../app/store/authStore');
    const { useNotificationStore } = await import('../app/store/notificationStore');
    const authStore = useAuthStore();
    const notificationStore = useNotificationStore();

    await authStore.addUserCards();

    expect(notificationStore.refreshRequestId).toBe(1);
  });
});
