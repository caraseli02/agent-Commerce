import { format } from 'date-fns';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderType, PaymentTypeEnum } from '../types';

const getOrderById = vi.fn();
const downloadDocument = vi.fn();
const toast = vi.fn();

vi.mock('~/store/authStore', () => ({
  useAuthStore: () => ({
    getUserDetails: {
      contactDetails: {
        firstName: 'Demo',
        lastName: 'Buyer',
        email: 'buyer@example.com',
      },
      adminSettings: {},
    },
    userCards: [],
  }),
}));

vi.mock('~/composables/api/orders', () => ({
  getOrderById: (...args: unknown[]) => getOrderById(...args),
}));

vi.mock('~/composables/api/documents', () => ({
  downloadDocument: (...args: unknown[]) => downloadDocument(...args),
}));

vi.mock('~/components/ui/toast', () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

function buildStockOrderResponse() {
  return {
    status: 'success',
    data: {
      order: {
        _id: 'order-stock-1',
        shortId: 'ORD-STOCK',
        type: OrderType.Stock,
        subtotal: 100,
        total: 119,
        margin: 0,
        currency: 'ron',
        status: 'Completed',
        notes: [{ sender: 'buyer', message: 'Ring the bell' }],
        createdAt: '2026-07-10T10:30:00.000Z',
        discount: { value: 0 },
        shippingCost: 19,
        smallOrderCost: 0,
        user: {
          contactDetails: {
            firstName: 'Demo',
            lastName: 'Buyer',
            email: 'buyer@example.com',
            phone: '+40 000 000',
          },
        },
        shippingDetails: {
          phone: '+40 000 000',
          address: {
            name1: 'Ship One',
            name2: '',
            postcode: '100000',
            country: 'RO',
            default: true,
          },
          billingAddress: {
            name1: 'Bill One',
            name2: 'Suite 2',
            postcode: '100001',
            country: 'RO',
          },
          deliveryTypeId: 'delivery-1',
          stockorderShippingType: {
            service: { courierName: 'FastShip' },
          },
        },
        paymentDetails: {
          type: PaymentTypeEnum.Bank,
          invoiceId: 'inv-stock-1',
        },
        products: [
          {
            id: 'product-stock-1',
            stock: 1,
            backorder_stock: 0,
            isFolder: false,
            initialUnitPrice: 100,
            unitPriceAfterDiscounts: 100,
            total: 100,
            subtotal: 100,
            discount: { value: 0 },
          },
        ],
      },
      children: [],
    },
  };
}

function buildMixedOrderResponse() {
  return {
    status: 'success',
    data: {
      order: {
        _id: 'order-mixed-1',
        shortId: 'ORD-MIXED',
        type: OrderType.Mixed,
        subtotal: 250,
        total: 298,
        margin: 0,
        currency: 'ron',
        status: 'Processing',
        notes: [{ sender: 'buyer', message: 'Backorder items can wait' }],
        createdAt: '2026-07-10T10:30:00.000Z',
        discount: { value: 0 },
        shippingCost: 48,
        smallOrderCost: 0,
        user: {
          contactDetails: {
            firstName: 'Demo',
            lastName: 'Buyer',
            email: 'buyer@example.com',
            phone: '+40 000 000',
          },
        },
        shippingDetails: {
          phone: '+40 000 000',
          address: {
            name1: 'Ship One',
            name2: '',
            postcode: '100000',
            country: 'RO',
            default: true,
          },
          billingAddress: {
            name1: 'Bill One',
            name2: 'Suite 2',
            postcode: '100001',
            country: 'RO',
          },
          deliveryTypeId: 'delivery-2',
          stockorderShippingType: {
            service: { courierName: 'MixedShip' },
          },
        },
        paymentDetails: {
          type: PaymentTypeEnum.Card,
          invoiceId: 'inv-mixed-1',
          card: {
            id: 'card-1',
            type: 'card',
            billing_details: {
              name1: 'Ship One',
              name2: '',
              postcode: '100000',
              country: 'RO',
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
        products: [],
      },
      children: [
        {
          _id: 'order-mixed-stock-child',
          shortId: 'ORD-MIXED-STOCK',
          type: OrderType.Stock,
          subtotal: 150,
          total: 180,
          margin: 0,
          currency: 'ron',
          status: 'Processing',
          notes: [],
          user: {
            contactDetails: {
              firstName: 'Demo',
              lastName: 'Buyer',
              email: 'buyer@example.com',
              phone: '+40 000 000',
            },
          },
          shippingDetails: {
            phone: '+40 000 000',
            address: {
              name1: 'Ship One',
              name2: '',
              postcode: '100000',
              country: 'RO',
              default: true,
            },
            billingAddress: {
              name1: 'Bill One',
              name2: 'Suite 2',
              postcode: '100001',
              country: 'RO',
            },
            deliveryTypeId: 'delivery-2',
            stockorderShippingType: {
              service: { courierName: 'MixedShip' },
            },
          },
          paymentDetails: {
            type: PaymentTypeEnum.Card,
            invoiceId: 'inv-mixed-stock-1',
            card: {
              id: 'card-1',
              type: 'card',
              billing_details: {
                name1: 'Ship One',
                name2: '',
                postcode: '100000',
                country: 'RO',
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
          products: [
            {
              id: 'stock-a',
              stock: 1,
              backorder_stock: 0,
              isFolder: false,
              initialUnitPrice: 150,
              unitPriceAfterDiscounts: 150,
              total: 150,
              subtotal: 150,
              discount: { value: 0 },
            },
          ],
        },
        {
          _id: 'order-mixed-back-child',
          shortId: 'ORD-MIXED-BACK',
          type: OrderType.Back,
          subtotal: 100,
          total: 118,
          margin: 0,
          currency: 'ron',
          status: 'Processing',
          notes: [],
          user: {
            contactDetails: {
              firstName: 'Demo',
              lastName: 'Buyer',
              email: 'buyer@example.com',
              phone: '+40 000 000',
            },
          },
          shippingDetails: {
            phone: '+40 000 000',
            address: {
              name1: 'Ship One',
              name2: '',
              postcode: '100000',
              country: 'RO',
              default: true,
            },
            billingAddress: {
              name1: 'Bill One',
              name2: 'Suite 2',
              postcode: '100001',
              country: 'RO',
            },
            deliveryTypeId: 'delivery-2',
            stockorderShippingType: {
              service: { courierName: 'MixedShip' },
            },
          },
          paymentDetails: {
            type: PaymentTypeEnum.Card,
            invoiceId: 'inv-mixed-back-1',
            card: {
              id: 'card-1',
              type: 'card',
              billing_details: {
                name1: 'Ship One',
                name2: '',
                postcode: '100000',
                country: 'RO',
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
          products: [
            {
              id: 'back-a',
              stock: 2,
              backorder_stock: 1,
              isFolder: false,
              initialUnitPrice: 50,
              unitPriceAfterDiscounts: 50,
              total: 100,
              subtotal: 100,
              discount: { value: 0 },
            },
          ],
        },
      ],
    },
  };
}

describe('order confirmation module', () => {
  beforeEach(() => {
    getOrderById.mockReset();
    downloadDocument.mockReset();
    toast.mockReset();
  });

  it('keeps the buyer component as an adapter over the shared module interface', async () => {
    const source = await readFile(resolve('components/order-confirm/BuyerConfirmation.vue'), 'utf8');
    const routeSource = await readFile(resolve('pages/order-summary/[id].vue'), 'utf8');

    expect(source).toContain('useOrderConfirmation(normalizedOrderId)');
    expect(source).toContain('onMounted(() =>');
    expect(source).not.toContain('getOrderById');
    expect(source).not.toContain('paymentInfoHelper');
    expect(source).not.toContain('downloadDocumentApi');
    expect(routeSource).toContain('<OrderConfirmBuyerConfirmation');
    expect(routeSource).not.toContain('<BuyerConfirmation');
  });

  it('loads the latest order id supplied by a reactive route adapter', async () => {
    getOrderById.mockResolvedValue(buildStockOrderResponse());
    const orderId = ref('order-stock-1');

    const { useOrderConfirmation } = await import('../composables/useOrderConfirmation');
    const confirmation = useOrderConfirmation(orderId);

    await confirmation.loadOrderConfirmation();
    orderId.value = 'order-stock-2';
    await confirmation.loadOrderConfirmation();

    expect(getOrderById).toHaveBeenNthCalledWith(1, 'order-stock-1');
    expect(getOrderById).toHaveBeenNthCalledWith(2, 'order-stock-2');
  });

  it('loads a stock order and derives the visible facts from the module interface', async () => {
    getOrderById.mockResolvedValue(buildStockOrderResponse());
    downloadDocument.mockResolvedValue(true);

    const { useOrderConfirmation } = await import('../composables/useOrderConfirmation');
    const confirmation = useOrderConfirmation('order-stock-1');

    await confirmation.loadOrderConfirmation();

    expect(confirmation.orderTypeValue.value).toBe(OrderType.Stock);
    expect(confirmation.stockOrder.value._id).toBe('order-stock-1');
    expect(confirmation.stockOrderItems.value).toHaveLength(1);
    expect(confirmation.backorderItems.value).toEqual([]);
    expect(confirmation.customerDetails.value).toMatchObject({
      name: 'Demo Buyer',
      email: 'buyer@example.com',
      phone: '+40 000 000',
    });
    expect(confirmation.addresses.value).toMatchObject({
      shippingAddress: {
        name1: 'Ship One',
        postcode: '100000',
      },
      billingAddress: {
        name1: 'Bill One',
        name2: 'Suite 2',
      },
    });
    expect(confirmation.notes.value).toEqual([{ sender: 'buyer', message: 'Ring the bell' }]);
    expect(confirmation.date.value).toBe(format(new Date('2026-07-10T10:30:00.000Z'), 'dd MMMM yyyy, HH:mm'));
    expect(confirmation.paymentSummary.value).toMatchObject({
      subtotal: 100,
      shippingCost: 19,
      shippingText: 'FastShip',
      orderTotal: 119,
      orderType: OrderType.Stock,
      stockItemsTotal: undefined,
      backorderItemsTotal: undefined,
    });
    expect(confirmation.paymentMethod.value).toMatchObject({
      type: PaymentTypeEnum.Bank,
      info: { text: 'Bank transfer' },
    });
    await expect(confirmation.downloadDocument()).resolves.toBe(true);
    expect(downloadDocument).toHaveBeenCalledWith('inv-stock-1');
  });

  it('splits a mixed order into stock and backorder children and builds the mixed summary', async () => {
    getOrderById.mockResolvedValue(buildMixedOrderResponse());
    downloadDocument.mockResolvedValue(true);

    const { useOrderConfirmation } = await import('../composables/useOrderConfirmation');
    const confirmation = useOrderConfirmation('order-mixed-1');

    await confirmation.loadOrderConfirmation();

    expect(confirmation.orderTypeValue.value).toBe(OrderType.Mixed);
    expect(confirmation.stockOrder.value._id).toBe('order-mixed-stock-child');
    expect(confirmation.backOrder.value._id).toBe('order-mixed-back-child');
    expect(confirmation.stockOrderItems.value.map((item) => item.id)).toEqual(['stock-a']);
    expect(confirmation.backorderItems.value.map((item) => item.id)).toEqual(['back-a']);
    expect(confirmation.hasMixedItems.value).toBe(false);
    expect(confirmation.paymentSummary.value).toMatchObject({
      subtotal: 250,
      shippingCost: 48,
      shippingText: 'MixedShip',
      orderTotal: 298,
      orderType: OrderType.Mixed,
      stockItemsTotal: 180,
      backorderItemsTotal: 118,
      payableNow: 180,
    });
    expect(confirmation.paymentMethod.value).toMatchObject({
      type: PaymentTypeEnum.Card,
      info: {
        provider: 'visa',
        last4: '4242',
      },
    });
  });

  it('owns invoice download success and missing-invoice failure handling', async () => {
    getOrderById.mockResolvedValue(buildStockOrderResponse());
    downloadDocument.mockResolvedValue(true);

    const { useOrderConfirmation } = await import('../composables/useOrderConfirmation');
    const confirmation = useOrderConfirmation('order-stock-1');

    await confirmation.loadOrderConfirmation();
    await expect(confirmation.downloadDocument()).resolves.toBe(true);

    confirmation.stockOrder.value.paymentDetails = { type: PaymentTypeEnum.Bank } as never;
    downloadDocument.mockResolvedValue(false);

    await expect(confirmation.downloadDocument()).resolves.toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: 'Invoice is not available for the moment',
      })
    );
  });
});
