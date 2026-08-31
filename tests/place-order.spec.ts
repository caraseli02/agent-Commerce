import { describe, expect, it, vi } from 'vitest';
import type { UserInterface } from '~/types/auth/user-interface';
import { PaymentStatusEnum } from '~/types/order-summary/item';
import type { CreatePendingOrderInput } from '~/server/domain/orders';
import type { EnsurePaymentResult } from '~/server/domain/payments';
import { createPlaceOrderCoordinator, createPlaceOrderUseCase, type PlaceOrderCommand } from '~/server/application/checkout/place-order';

const user = {
  _id: 'customer-1',
} as UserInterface;

const makeCommand = (overrides: Partial<PlaceOrderCommand> = {}): PlaceOrderCommand => ({
  checkoutRequestId: 'checkout-1',
  cartId: 'cart-1',
  cartOwnerId: 'customer-1',
  user,
  order: {
    total: 0.01,
    subtotal: 0.01,
    products: [{ id: 'attacker-controlled-product', unitPriceAfterDiscounts: 0.01 }],
    shippingCost: 9.99,
    type: 0,
    shippingDetails: {
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
  const createPending = vi.fn(async (_input: CreatePendingOrderInput) => ({
    kind: 'created' as const,
    orderId: 'order-1',
  }));

  const confirmPayment = vi.fn(async (_input: { orderId: string; paymentId: string }) => ({
    kind: 'confirmed' as const,
  }));

  const ensurePayment = vi.fn(async (): Promise<EnsurePaymentResult> => ({
    kind: 'succeeded',
    paymentId: 'payment-1',
    status: PaymentStatusEnum.Paid,
    useExistingPaymentMethod: false,
    clientSecret: undefined,
    result: {
      status: 'succeeded',
    },
  }));

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
        quoteItems: vi.fn(async () => ({
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
                unitPrice: {
                  minor: 100_00,
                  currency: 'RON' as const,
                },
                lineTotal: {
                  minor: 100_00,
                  currency: 'RON' as const,
                },
              },
            ],
            merchandiseTotal: {
              minor: 100_00,
              currency: 'RON' as const,
            },
          },
        })),
      },
      inventory: {
        reserve: vi.fn(async () => ({
          kind: 'created' as const,
          reservation: {
            id: 'reservation-1',
            reservationKey: 'checkout-1',
            items: [
              {
                productId: 'prod-1',
                immediateQuantity: 1,
                backorderQuantity: 0,
              },
            ],
            expiresAt: new Date('2026-08-31T00:15:00.000Z'),
            status: 'active' as const,
          },
        })),
        commit: vi.fn(async () => ({
          kind: 'committed' as const,
        })),
        release: vi.fn(async () => ({
          kind: 'released' as const,
        })),
      },
      orders: {
        createPending,
        confirmPayment,
      },
      payments: {
        ensurePayment,
      },
    },
  };
};

describe('PlaceOrder application workflow', () => {
  it('returns the same logical order for the same request and performs side effects once', async () => {
    const { dependencies, createPending } = makeDependencies();
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());
    const command = makeCommand();

    const first = await placeOrder(command);
    const second = await placeOrder(command);

    expect(first).toEqual(second);
    expect(first.orderId).toBe('order-1');
    expect(createPending).toHaveBeenCalledTimes(1);
    expect(dependencies.inventory.reserve).toHaveBeenCalledTimes(1);
    expect(dependencies.payments.ensurePayment).toHaveBeenCalledTimes(1);
    expect(dependencies.cart.completeCheckout).toHaveBeenCalledTimes(1);
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
            shippingCost: 19.99,
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: 'idempotency_conflict',
      statusCode: 409,
    });

    expect(createPending).toHaveBeenCalledTimes(1);
  });

  it('prevents two request IDs from creating two orders for the same cart revision', async () => {
    const { dependencies, createPending } = makeDependencies();
    const placeOrder = createPlaceOrderUseCase(dependencies, createPlaceOrderCoordinator());

    await placeOrder(makeCommand({ checkoutRequestId: 'checkout-a' }));

    await expect(placeOrder(makeCommand({ checkoutRequestId: 'checkout-b' }))).rejects.toMatchObject({
      code: 'checkout_already_started',
      statusCode: 409,
    });

    expect(createPending).toHaveBeenCalledTimes(1);
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
            unitPriceMinor: 100_00,
            lineTotalMinor: 100_00,
          }),
        ],
      }),
    );

    const orderInput = createPending.mock.calls[0]?.[0];
    expect(orderInput).not.toHaveProperty('total');
    expect(orderInput).not.toHaveProperty('subtotal');
    expect(orderInput).not.toHaveProperty('products');
  });
});
