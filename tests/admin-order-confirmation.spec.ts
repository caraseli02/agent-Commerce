import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderType, PaymentStatusEnum, PaymentTypeEnum } from '../types';

const getOrderById = vi.fn();

vi.mock('~/store/authStore', () => ({
  useAuthStore: () => ({
    getUserDetails: {
      role: 2,
      contactDetails: {
        firstName: 'Demo',
        lastName: 'Admin',
        email: 'admin@example.com',
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
  downloadDocument: vi.fn(),
}));

vi.mock('~/components/ui/toast', () => ({
  toast: vi.fn(),
}));

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
          deliveryTypeId: 'delivery-1',
          stockorderShippingType: {
            service: { courierName: 'MixedShip' },
          },
        },
        paymentDetails: {
          type: PaymentTypeEnum.Card,
          status: PaymentStatusEnum.Paid,
          invoiceId: 'inv-mixed-1',
        },
        products: [],
      },
      children: [
        {
          _id: 'order-mixed-stock-child',
          type: OrderType.Stock,
          total: 180,
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
              initialUnitPrice: 180,
              unitPriceAfterDiscounts: 180,
              total: 180,
              subtotal: 180,
              discount: { value: 0 },
            },
          ],
        },
        {
          _id: 'order-mixed-back-child',
          type: OrderType.Back,
          total: 118,
          paymentDetails: {
            type: PaymentTypeEnum.Card,
            invoiceId: 'inv-mixed-back-1',
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

describe('admin order confirmation adapter', () => {
  beforeEach(() => {
    getOrderById.mockReset();
  });

  it('normalizes route order ids for the admin adapter', async () => {
    const { normalizeOrderConfirmationOrderId } = await import('../app/composables/useOrderConfirmation');

    expect(normalizeOrderConfirmationOrderId('order-123')).toBe('order-123');
    expect(normalizeOrderConfirmationOrderId(['order-456', 'ignored'])).toBe('order-456');
    expect(normalizeOrderConfirmationOrderId(undefined)).toBe('');
  });

  it('keeps the admin page as a thin adapter around AdminConfirmation', async () => {
    const source = await readFile(resolve('app/pages/dashboard/orders/[id].vue'), 'utf-8');

    expect(source).toContain('<OrderConfirmAdminConfirmation');
    expect(source).toContain(':order-id="route.params.id"');
    expect(source).not.toContain('getOrderById');
    expect(source).not.toContain('paymentInfoHelper');
    expect(source).not.toContain('downloadDocument');
    expect(source).toContain("layout: 'dashboard'");
  });

  it('wires admin-only payment status through the shared module adapter', async () => {
    const source = await readFile(resolve('app/components/order-confirm/AdminConfirmation.vue'), 'utf-8');

    expect(source).toContain('useOrderConfirmation');
    expect(source).toContain('useOrderConfirmation(normalizedOrderId)');
    expect(source).toContain('onMounted(() =>');
    expect(source).toContain('OrderConfirmAdminBtns');
    expect(source).toContain(':payment-status="paymentStatus"');
    expect(source).not.toContain('getOrderById');
    expect(source).not.toContain('paymentInfoHelper');
  });

  it('consumes the shared order confirmation module for mixed-order parity', async () => {
    const response = buildMixedOrderResponse();
    getOrderById.mockResolvedValue(response);

    const { useOrderConfirmation } = await import('../app/composables/useOrderConfirmation');
    const confirmation = useOrderConfirmation('order-mixed-1');
    await confirmation.loadOrderConfirmation();

    expect(confirmation.orderTypeValue.value).toBe(OrderType.Mixed);
    expect(confirmation.stockOrder.value._id).toBe('order-mixed-stock-child');
    expect(confirmation.backOrder.value._id).toBe('order-mixed-back-child');
    expect(confirmation.stockOrderItems.value.map((item) => item.id)).toEqual(['stock-a']);
    expect(confirmation.backorderItems.value.map((item) => item.id)).toEqual(['back-a']);
    expect(confirmation.paymentSummary.value).toMatchObject({
      stockItemsTotal: 180,
      backorderItemsTotal: 118,
      payableNow: 180,
      shippingText: 'MixedShip',
      orderTotal: 298,
    });
    expect(confirmation.customerDetails.value).toMatchObject({
      name: 'Demo Buyer',
      email: 'buyer@example.com',
      phone: '+40 000 000',
    });
    expect(confirmation.orderResponse.value.data?.order.paymentDetails?.status).toBe(PaymentStatusEnum.Paid);
  });
});
