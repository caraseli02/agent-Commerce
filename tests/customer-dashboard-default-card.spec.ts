import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { __setMockApiClient, __setMockRuntimeConfig } from './mocks/nuxt-app';

describe('useCustomerDashboard default card', () => {
  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    setActivePinia(createPinia());
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
  });

  it('starts activity widgets with render-safe empty values', async () => {
    const { useCustomerDashboard } = await import('../app/composables/useCustomerDashboard');
    const { myActivityData } = useCustomerDashboard();

    expect(myActivityData.value).toEqual({
      favorites: { products: 0, folders: 0 },
      monthOrder: 0,
      returns: 0,
      totalOrders: 0,
    });
  });

  it('refetches cards from the API when persisted card state is absent', async () => {
    const defaultCard = {
      id: 'card-default',
      default: true,
      type: 'card',
      card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
    };

    __setMockApiClient(async <T>(resource: string): Promise<T> => {
      if (resource === '/user/cards') {
        return { status: 'success', data: [defaultCard] } as T;
      }
      throw new Error(`Unexpected API request: ${resource}`);
    });

    const { useAuthStore } = await import('../app/store/authStore');
    const authStore = useAuthStore();
    authStore.userCards = null;

    const { useCustomerDashboard } = await import('../app/composables/useCustomerDashboard');
    const { myCard, getDefaultCard } = useCustomerDashboard();

    await getDefaultCard();

    expect(authStore.userCards).toEqual([defaultCard]);
    expect(myCard.value).toEqual(defaultCard);
  });
});
