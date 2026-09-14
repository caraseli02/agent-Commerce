import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInterface } from '~/types/auth/user-interface';
import { createPlaceOrderCoordinator, createPlaceOrderUseCase, type PlaceOrderCommand } from '~/server/application/checkout/place-order';
import { inventory as realInventory } from '~/server/domain/inventory';
import { orders as realOrders } from '~/server/domain/orders';
import { payments as realPayments } from '~/server/domain/payments';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';
import { createCheckoutReviewFingerprint } from '~/server/application/checkout/review-fingerprint';
import type { SmallOrderChargeTier } from '~/helpers/order-money';

const user = {
  _id: 'customer-1',
} as UserInterface;

const makeCommand = (overrides: Partial<PlaceOrderCommand> = {}): PlaceOrderCommand => ({
  checkoutRequestId: 'checkout-1',
  cartId: 'cart-1',
  cartOwnerId: 'customer-1',
  reviewedCartRevision: '7',
  user,
  order: {
    total: 0.01,
    subtotal: 0.01,
    products: [{ id: 'attacker-controlled-product', unitPriceAfterDiscounts: 0.01 }],
    shippingCost: 9.99,
    type: 0,
    shippingDetails: {
      deliveryTypeId: '1',
      address: {
        name1: 'Main Street 1',
      },
    },
    paymentDetails: {
      type: 0,
    },
  },
  ...overrides,
});

const makeDependencies = () => {
  const createPending = vi.fn(realOrders.createPending);
  const confirmPayment = vi.fn(realOrders.confirmPayment);
  const getOrderPaymentPreparation = vi.fn(realOrders.getPaymentPreparation);
  const preparePayment = vi.fn(realPayments.preparePayment);
  const getPaymentPreparation = vi.fn(realPayments.getPaymentPreparation);
  const continuePayment = vi.fn(realPayments.continuePayment);
  const completePayment = vi.fn(realPayments.completePayment);
  const failPayment = vi.fn(realPayments.failPayment);

  return {
    createPending,
    confirmPayment,
    dependencies: {
      cart: {
        getSnapshot: vi.fn(async () => ({
          kind: 'found' as const,
          snapshot: {
            cartId: 'cart-1',
            ownerId: 'customer-1',
            revision: '7',
            items: [
              {
                productId: 'prod-1',
                immediateQuantity: 1,
                backorderQuantity: 0,
              },
            ],
          },
        })),
        completeCheckout: vi.fn(async () => ({
          kind: 'completed' as const,
        })),
      },
      catalog: {
        quoteCheckout: vi.fn(async () => ({
          kind: 'quoted' as const,
          quote: {
            currency: 'RON' as const,
            quotedAt: new Date('2026-08-31T00:00:00.000Z'),
            lines: [
              {
                productId: 'prod-1',
                sku: 'MCU-001',
                name: 'Microcontroller',
                quantity: 1,
                listUnitPrice: {
                  minor: 105_00,
                  currency: 'RON' as const,
                },
                discountPercent: 5,
                discountTotal: {
                  minor: 5_00,
                  currency: 'RON' as const,
                },
                unitPrice: {
                  minor: 100_00,
                  currency: 'RON' as const,
                },
                lineTotal: {
                  minor: 100_00,
                  currency: 'RON' as const,
                },
                vatTotal: {
                  minor: 19_00,
                  currency: 'RON' as const,
                },
              },
            ],
            merchandiseTotal: {
              minor: 100_00,
              currency: 'RON' as const,
            },
            discountTotal: {
              minor: 5_00,
              currency: 'RON' as const,
            },
            smallOrderCharge: {
              minor: 0,
              currency: 'RON' as const,
            },
            smallOrderTier: null as SmallOrderChargeTier | null,
            deliveryOption: {
              service: { id: 1, courierName: 'Demo Express', name: 'Standard Delivery' },
              price: { total: 19.9, noVat: 16.72 },
            },
            shippingTotal: { minor: 19_90, currency: 'RON' as const },
            vatRate: 0.19,
            vatTotal: { minor: 19_00, currency: 'RON' as const },
            grandTotal: { minor: 138_90, currency: 'RON' as const },
          },
        })),
      },
      inventory: {
        reserve: vi.fn(realInventory.reserve),
        commit: vi.fn(realInventory.commit),
        release: vi.fn(realInventory.release),
      },
      orders: {
        createPending,
        confirmPayment,
        getPaymentPreparation: getOrderPaymentPreparation,
      },
      payments: {
        preparePayment,
        getPaymentPreparation,
        continuePayment,
        completePayment,
        failPayment,
      },
    },
  };
};

describe('PlaceOrder application workflow', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
  });

  it('returns the same logical order for the same request, preserving durable side effects while retrying cart cleanup', async () => {
    const { dependencies, createPending } = makeDependencies();
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());
    const command = makeCommand();

    const first = await placeOrder(command);
    const second = await placeOrder(command);

    expect(first).toEqual(second);
    expect(first.orderId).toBeTruthy();
    expect(createPending).toHaveBeenCalledTimes(1);
    expect(dependencies.inventory.reserve).toHaveBeenCalledTimes(1);
    expect(dependencies.payments.preparePayment).toHaveBeenCalledTimes(1);
    expect(dependencies.cart.completeCheckout).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse of the same checkoutRequestId with different checkout parameters', async () => {
    const { dependencies, createPending } = makeDependencies();
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    await placeOrder(makeCommand());

    await expect(
      placeOrder(
        makeCommand({
          order: {
            ...makeCommand().order,
            shippingDetails: {
              deliveryTypeId: '2',
              address: { name1: 'Main Street 1' },
            },
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: 'idempotency_conflict',
      statusCode: 409,
    });

    expect(createPending).toHaveBeenCalledTimes(1);
  });

  it('converges same-input request IDs on one cart revision', async () => {
    const { dependencies, createPending } = makeDependencies();
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    const first = await placeOrder(makeCommand({ checkoutRequestId: 'checkout-a' }));
    const second = await placeOrder(makeCommand({ checkoutRequestId: 'checkout-b' }));
    expect(second.orderId).toBe(first.orderId);

    expect(createPending).toHaveBeenCalledTimes(1);
  });

  it('rejects a stale reviewed cart before reserving inventory or creating an Order', async () => {
    const { dependencies, createPending } = makeDependencies();
    dependencies.cart.getSnapshot.mockResolvedValueOnce({
      kind: 'found',
      snapshot: {
        cartId: 'cart-1',
        ownerId: 'customer-1',
        revision: '8',
        items: [{ productId: 'prod-1', immediateQuantity: 2, backorderQuantity: 0 }],
      },
    });
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    await expect(placeOrder(makeCommand())).rejects.toMatchObject({
      code: 'cart_changed',
      statusCode: 409,
      message: expect.stringContaining('cart changed after you reviewed'),
    });

    expect(dependencies.catalog.quoteCheckout).not.toHaveBeenCalled();
    expect(dependencies.inventory.reserve).not.toHaveBeenCalled();
    expect(createPending).not.toHaveBeenCalled();
  });

  it('rejects a changed payable quote before reserving inventory or creating an Order', async () => {
    const { dependencies, createPending } = makeDependencies();
    const changedQuote = await dependencies.catalog.quoteCheckout();
    if (changedQuote.kind !== 'quoted') throw new Error('Expected test quote.');
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    await expect(
      placeOrder(
        makeCommand({
          reviewedQuoteFingerprint: createCheckoutReviewFingerprint('7', {
            ...changedQuote.quote,
            grandTotal: { minor: 1, currency: 'RON' },
          }),
        }),
      ),
    ).rejects.toMatchObject({ code: 'quote_changed', statusCode: 409 });

    expect(dependencies.inventory.reserve).not.toHaveBeenCalled();
    expect(createPending).not.toHaveBeenCalled();
  });

  it('builds the Order from the authoritative Catalog quote rather than client product totals', async () => {
    const { dependencies, createPending } = makeDependencies();
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    await placeOrder(makeCommand());

    expect(createPending).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            productId: 'prod-1',
            listUnitPriceMinor: 105_00,
            discountPercent: 5,
            discountTotalMinor: 5_00,
            vatTotalMinor: 19_00,
            unitPriceMinor: 100_00,
            lineTotalMinor: 100_00,
          }),
        ],
        money: {
          currency: 'RON',
          merchandiseTotalMinor: 100_00,
          discountTotalMinor: 5_00,
          shippingTotalMinor: 19_90,
          smallOrderChargeMinor: 0,
          vatRate: 0.19,
          vatTotalMinor: 19_00,
          grandTotalMinor: 138_90,
        },
      }),
    );

    const orderInput = createPending.mock.calls[0]?.[0];
    expect(orderInput).not.toHaveProperty('total');
    expect(orderInput).not.toHaveProperty('subtotal');
    expect(orderInput).not.toHaveProperty('products');
  });

  it('persists a server-quoted small-order charge instead of trusting the browser', async () => {
    const { dependencies, createPending } = makeDependencies();
    dependencies.catalog.quoteCheckout.mockResolvedValueOnce({
      kind: 'quoted',
      quote: {
        currency: 'RON',
        quotedAt: new Date('2026-08-31T00:00:00.000Z'),
        lines: [
          {
            productId: 'prod-1',
            sku: 'MCU-001',
            name: 'Microcontroller',
            quantity: 1,
            listUnitPrice: { minor: 40_00, currency: 'RON' },
            discountPercent: 0,
            discountTotal: { minor: 0, currency: 'RON' },
            unitPrice: { minor: 40_00, currency: 'RON' },
            lineTotal: { minor: 40_00, currency: 'RON' },
            vatTotal: { minor: 7_60, currency: 'RON' },
          },
        ],
        merchandiseTotal: { minor: 40_00, currency: 'RON' },
        discountTotal: { minor: 0, currency: 'RON' },
        smallOrderCharge: { minor: 4_99, currency: 'RON' },
        smallOrderTier: { _id: 'soc-001', min: 0, max: 50, price: 4.99 },
        deliveryOption: {
          service: { id: 1, courierName: 'Demo Express', name: 'Standard Delivery' },
          price: { total: 19.9, noVat: 16.72 },
        },
        shippingTotal: { minor: 19_90, currency: 'RON' },
        vatRate: 0.19,
        vatTotal: { minor: 7_60, currency: 'RON' },
        grandTotal: { minor: 72_49, currency: 'RON' },
      },
    });
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    await placeOrder(
      makeCommand({
        checkoutRequestId: 'checkout-small-order',
        order: { ...makeCommand().order, smallOrderChargeId: 'attacker-selected-tier' },
      }),
    );

    expect(createPending).toHaveBeenCalledWith(
      expect.objectContaining({ money: expect.objectContaining({ smallOrderChargeMinor: 499, grandTotalMinor: 7249 }) }),
    );
  });
});
