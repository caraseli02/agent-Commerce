import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { PaymentTypeEnum } from '../types';
import { __setMockApiClient, __setMockOrdersApi, __setMockRuntimeConfig } from './mocks/nuxt-app';

const routerPush = vi.fn();
const sentOrders: unknown[] = [];
const apiRequests: Array<{ resource: string; method?: string; body?: unknown }> = [];

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
    apiRequests.length = 0;
    __setMockRuntimeConfig({ public: { MOCK_MODE: true } });
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      apiRequests.push({ resource, method: options?.method, body: options?.body });

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-after-checkout', products: [] } } as T;
      }

      if (resource === '/orders/validate-address' && options?.method === 'POST') {
        return { data: { valid: true } } as T;
      }

      if (resource === '/orders/new' && options?.method === 'POST') {
        sentOrders.push(options.body);
        return {
          status: 'success',
          data: {
            orderId: 'ord-composable-1',
            result: { status: 'succeeded' },
          },
        } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });
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

  it('submits checkout through the orders API adapter', async () => {
    __setMockOrdersApi({});
    const { useOrder } = await import('../composables/useOrder');
    const { makeCheckout } = useOrder();

    await makeCheckout(
      1,
      'mock-cart-mock-customer-1',
      { service: { id: 1 }, price: { total: 9.99, noVat: 9.99 } },
      null,
      null,
      { type: PaymentTypeEnum.Cash },
      '',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [],
      },
      { cartRevision: '7', quoteFingerprint: 'quote-7' },
    );

    expect(apiRequests).toMatchObject([
      { resource: '/orders/validate-address', method: 'POST' },
      { resource: '/orders/validate-address', method: 'POST' },
      { resource: '/orders/new', method: 'POST' },
      { resource: '/cart', method: 'GET' },
    ]);
    expect(sentOrders).toHaveLength(1);
    expect(sentOrders[0]).toMatchObject({ reviewedCartRevision: '7', reviewedQuoteFingerprint: 'quote-7' });
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/success', query: { id: 'ord-composable-1' } });
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

  it('surfaces a checkout error when the order API returns a failure response', async () => {
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/orders/new' && options?.method === 'POST') {
        return {
          status: 'failed',
          data: {
            message: 'Card was declined',
            type: 'payment_error',
            code: 'card_declined',
          },
        } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-after-checkout', products: [] } } as T;
      }

      if (resource === '/orders/validate-address' && options?.method === 'POST') {
        return { data: { valid: true } } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCartStore } = await import('../store/cartStore');
    const { useOrder } = await import('../composables/useOrder');
    const { makeCheckout } = useOrder();

    await makeCheckout(
      1,
      'mock-cart-mock-customer-1',
      { service: { id: 1 }, price: { total: 9.99, noVat: 9.99 } },
      null,
      null,
      { type: PaymentTypeEnum.Cash },
      '',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [],
      },
    );

    const cartStore = useCartStore();
    expect(cartStore.previousCheckoutError).toMatchObject({
      message: 'Card was declined',
      type: 'payment_error',
      code: 'card_declined',
    });
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/fail' });
  });

  it('surfaces a checkout error when order submission throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/orders/new' && options?.method === 'POST') {
        throw new Error('Gateway unreachable');
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-after-checkout', products: [] } } as T;
      }

      if (resource === '/orders/validate-address' && options?.method === 'POST') {
        return { data: { valid: true } } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCartStore } = await import('../store/cartStore');
    const { useOrder } = await import('../composables/useOrder');
    const { makeCheckout } = useOrder();

    await makeCheckout(
      1,
      'mock-cart-mock-customer-1',
      { service: { id: 1 }, price: { total: 9.99, noVat: 9.99 } },
      null,
      null,
      { type: PaymentTypeEnum.Cash },
      '',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [],
      },
    );

    const cartStore = useCartStore();
    expect(cartStore.previousCheckoutError).toMatchObject({
      message: 'Gateway unreachable',
      type: 'Error',
      code: 'Error',
    });
    expect(consoleError).toHaveBeenCalledWith('Checkout failed', expect.any(Error));
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/fail' });
    consoleError.mockRestore();
  });

  it('routes live card checkout without a Stripe result to the session page', async () => {
    __setMockRuntimeConfig({ public: { MOCK_MODE: false } });
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/orders/new' && options?.method === 'POST') {
        return {
          status: 'success',
          data: {
            orderId: 'ord-composable-1',
            clientSecret: 'sec_test_123',
          },
        } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-after-checkout', products: [] } } as T;
      }

      if (resource === '/orders/validate-address' && options?.method === 'POST') {
        return { data: { valid: true } } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCartStore } = await import('../store/cartStore');
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
      '',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [],
      },
    );

    const cartStore = useCartStore();
    expect(cartStore.orderClientSecret).toBe('sec_test_123');
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/session', query: { id: 'ord-composable-1' } });
  });

  it('surfaces a checkout error when card payment is canceled', async () => {
    __setMockRuntimeConfig({ public: { MOCK_MODE: false } });
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/orders/new' && options?.method === 'POST') {
        return {
          status: 'success',
          data: {
            orderId: 'ord-composable-1',
            result: { status: 'canceled' },
          },
        } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-after-checkout', products: [] } } as T;
      }

      if (resource === '/orders/validate-address' && options?.method === 'POST') {
        return { data: { valid: true } } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCartStore } = await import('../store/cartStore');
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
      '',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [],
      },
    );

    const cartStore = useCartStore();
    expect(cartStore.previousCheckoutError).toMatchObject({
      message: 'Payment was canceled. Please try again.',
      type: 'payment_canceled',
      code: 'canceled',
    });
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/fail' });
  });

  it('routes to checkout fail when the placed order has no orderId', async () => {
    __setMockRuntimeConfig({ public: { MOCK_MODE: false } });
    __setMockApiClient(async <T>(resource: string, options?: { method?: string; body?: unknown }): Promise<T> => {
      if (resource === '/orders/new' && options?.method === 'POST') {
        return {
          status: 'success',
          data: {
            orderId: '',
            result: { status: 'succeeded' },
          },
        } as T;
      }

      if (resource === '/cart' && options?.method === 'GET') {
        return { status: 'success', data: { _id: 'cart-after-checkout', products: [] } } as T;
      }

      if (resource === '/orders/validate-address' && options?.method === 'POST') {
        return { data: { valid: true } } as T;
      }

      throw new Error(`Unexpected cart API request: ${options?.method} ${resource}`);
    });

    const { useCartStore } = await import('../store/cartStore');
    const { useOrder } = await import('../composables/useOrder');
    const { makeCheckout } = useOrder();

    await makeCheckout(
      1,
      'mock-cart-mock-customer-1',
      { service: { id: 1 }, price: { total: 9.99, noVat: 9.99 } },
      null,
      null,
      { type: PaymentTypeEnum.Cash },
      '',
      {
        subtotal: 1499.99,
        total: 1509.98,
        products: [],
      },
    );

    const cartStore = useCartStore();
    expect(cartStore.previousCheckoutError).toMatchObject({
      message: 'Checkout completed without a valid order ID. Please try again.',
      type: 'invalid_order_id',
      code: 'missing_order_id',
    });
    expect(routerPush).toHaveBeenCalledWith({ path: '/checkout/fail' });
    expect(routerPush).not.toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining('/order-summary/') }));
  });
});
