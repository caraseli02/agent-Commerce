import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { PaymentTypeEnum } from '../types';
import { __setMockCartResponse, __setMockOrdersApi, __setMockRuntimeConfig } from './mocks/nuxt-app';

const routerPush = vi.fn();
const sentOrders: unknown[] = [];

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('../composables/useUser', () => ({
  useUser: () => ({
    user: ref({
      firebaseId: 'mock-customer-1',
      role: 2,
      accountType: 0,
      contactDetails: {
        firstName: 'Demo',
        lastName: 'Customer',
        phone: '+140****0101',
        email: 'customer@demo.com',
      },
      personalDetails: {
        firstName: 'Demo',
        lastName: 'Customer',
        address: {
          name1: 'Demo Street 10',
          name2: 'Floor 2',
          country: 'US',
          region: 'California',
          city: 'San Francisco',
          postcode: '94105',
        },
      },
    }),
    getShipping: () => ({
      name1: 'Demo Street 10',
      name2: 'Floor 2',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      postcode: '94105',
    }),
    getBilling: () => ({
      name1: 'Demo Street 10',
      name2: 'Floor 2',
      country: 'US',
      region: 'California',
      city: 'San Francisco',
      postcode: '94105',
    }),
  }),
}));

vi.mock('../components/ui/toast', () => ({
  toast: vi.fn(),
}));

describe('checkout order composable flow boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('piniaPluginPersistedstate', { localStorage: () => undefined });
    vi.stubGlobal('ref', ref);
    setActivePinia(createPinia());
    routerPush.mockReset();
    sentOrders.length = 0;
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
    __setMockCartResponse({ status: 'success', data: { _id: 'cart-after-checkout', products: [] } });
    __setMockOrdersApi({
      validateAddress: async () => ({ data: { valid: true } }),
      sendOrder: async (order: unknown) => {
        sentOrders.push(order);
        return {
          status: 'success',
          data: {
            orderId: 'ord-composable-1',
            result: { status: 'succeeded' },
          },
        };
      },
    });
  });

  it('builds a checkout order from summary data and routes mock payment to confirmation', async () => {
    const { useOrder } = await import('../composables/useOrder');
    const { makeCheckout } = useOrder();

    await makeCheckout(
      1,
      'mock-cart-mock-customer-1',
      { service: { id: 1 }, price: { total: 9.99, noVat: 9.99 } },
      null,
      null,
      {
        type: PaymentTypeEnum.Card,
        card: {
          id: 'card-demo-1',
          type: 'card',
          billing_details: {
            name1: 'Demo Street 10',
            name2: 'Floor 2',
            country: 'US',
            region: 'California',
            city: 'San Francisco',
            postcode: '94105',
            default: true,
          },
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2030,
            type: 'credit',
            is_expired: false,
          },
        },
      },
      'Please ship quickly',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [
          {
            id: 'prod-2',
            stock: 1,
            backorder_stock: 0,
            isFolder: false,
            initialUnitPrice: 1499.99,
            unitPriceAfterDiscounts: 1499.99,
            total: 1499.99,
            subtotal: 1499.99,
            discount: {
              value: 0,
              startDate: '2026-06-19T00:00:00.000Z',
              endDate: '2026-06-19T00:00:00.000Z',
            },
          },
        ],
      },
    );

    expect(sentOrders).toHaveLength(1);
    expect(sentOrders[0]).toMatchObject({
      cartId: 'mock-cart-mock-customer-1',
      subtotal: 1499.99,
      total: 1509.98,
      shippingCost: 9.99,
      stripeCardId: 'card-demo-1',
      products: [{ id: 'prod-2' }],
    });
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/success', query: { id: 'ord-composable-1' } });
  });
});
