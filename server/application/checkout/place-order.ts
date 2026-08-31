import { createHash } from 'node:crypto';
import type { UserInterface } from '~/types/auth/user-interface';
import { cart as defaultCart } from '~/server/domain/cart';
import { catalog as defaultCatalog } from '~/server/domain/catalog';
import { inventory as defaultInventory } from '~/server/domain/inventory';
import { orders as defaultOrders } from '~/server/domain/orders';
import { payments as defaultPayments } from '~/server/domain/payments';

type LegacyOrderInput = Record<string, unknown> & {
  checkoutRequestId?: unknown;
  shippingDetails?: unknown;
  paymentDetails?: unknown;
  stripeCardId?: unknown;
  shippingCost?: unknown;
  type?: unknown;
  notes?: unknown;
};

export type PlaceOrderCommand = {
  checkoutRequestId?: string;
  cartId: string;
  cartOwnerId: string;
  user: UserInterface;
  order: LegacyOrderInput;
};

export type PlaceOrderResult = {
  orderId: string;
  status: number;
  useExistingPaymentMethod: boolean;
  clientSecret?: string;
  result?: {
    status: string;
  };
};

export class PlaceOrderError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'PlaceOrderError';
  }
}

type PlaceOrderDependencies = {
  cart: typeof defaultCart;
  catalog: typeof defaultCatalog;
  inventory: typeof defaultInventory;
  orders: typeof defaultOrders;
  payments: typeof defaultPayments;
};

type ExecutionRecord = {
  fingerprint: string;
  semanticKey: string;
  promise: Promise<PlaceOrderResult>;
};

export type PlaceOrderCoordinator = ReturnType<typeof createPlaceOrderCoordinator>;

const normalizeForFingerprint = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeForFingerprint);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeForFingerprint(entry)]),
    );
  }

  return value;
};

const stableFingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(normalizeForFingerprint(value))).digest('hex');

const resolvePaymentType = (order: LegacyOrderInput) => {
  if (!order.paymentDetails || typeof order.paymentDetails !== 'object') {
    return undefined;
  }

  const paymentType = (order.paymentDetails as Record<string, unknown>).type;
  return typeof paymentType === 'number' ? paymentType : undefined;
};

const resolveShippingCostMinor = (order: LegacyOrderInput) => {
  const shippingCost = Number(order.shippingCost ?? 0);

  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    throw new PlaceOrderError('invalid_shipping_cost', 400, 'Shipping cost must be a valid non-negative amount.');
  }

  return Math.round(shippingCost * 100);
};

const resolveOrderType = (order: LegacyOrderInput) => (typeof order.type === 'number' ? order.type : undefined);

const resolveNotes = (order: LegacyOrderInput) => {
  if (!Array.isArray(order.notes)) {
    return undefined;
  }

  return order.notes
    .filter((note): note is Record<string, unknown> => Boolean(note && typeof note === 'object'))
    .map((note) => ({
      sender: typeof note.sender === 'string' ? note.sender : undefined,
      message: typeof note.message === 'string' ? note.message : undefined,
    }));
};

const requestFingerprint = (command: PlaceOrderCommand) =>
  stableFingerprint({
    cartId: command.cartId,
    cartOwnerId: command.cartOwnerId,
    shippingDetails: command.order.shippingDetails,
    paymentType: resolvePaymentType(command.order),
    stripeCardId: command.order.stripeCardId,
    shippingCost: command.order.shippingCost,
    type: command.order.type,
    notes: resolveNotes(command.order),
  });

export const createPlaceOrderCoordinator = () => {
  const byRequest = new Map<string, ExecutionRecord>();
  const bySemanticKey = new Map<string, string>();

  const lookup = (requestKey: string, fingerprint: string) => {
    const existing = byRequest.get(requestKey);

    if (!existing) {
      return null;
    }

    if (existing.fingerprint !== fingerprint) {
      throw new PlaceOrderError(
        'idempotency_conflict',
        409,
        'The checkout request ID was already used with different checkout parameters.',
      );
    }

    return existing.promise;
  };

  const run = (input: {
    requestKey: string;
    fingerprint: string;
    semanticKey: string;
    operation: () => Promise<PlaceOrderResult>;
  }) => {
    const existing = lookup(input.requestKey, input.fingerprint);

    if (existing) {
      return existing;
    }

    const semanticOwner = bySemanticKey.get(input.semanticKey);

    if (semanticOwner && semanticOwner !== input.requestKey) {
      throw new PlaceOrderError(
        'checkout_already_started',
        409,
        'This cart revision already has an active checkout.',
      );
    }

    const promise = Promise.resolve().then(input.operation);

    byRequest.set(input.requestKey, {
      fingerprint: input.fingerprint,
      semanticKey: input.semanticKey,
      promise,
    });
    bySemanticKey.set(input.semanticKey, input.requestKey);

    return promise;
  };

  return {
    lookup,
    run,
  };
};

export const createPlaceOrderUseCase = (
  dependencies: PlaceOrderDependencies,
  coordinator: PlaceOrderCoordinator = createPlaceOrderCoordinator(),
) => {
  return async (command: PlaceOrderCommand): Promise<PlaceOrderResult> => {
    const cartId = command.cartId.trim();
    const ownerId = command.cartOwnerId.trim();

    if (!cartId) {
      throw new PlaceOrderError('cart_required', 400, 'A cart is required to place an order.');
    }

    if (!ownerId) {
      throw new PlaceOrderError('cart_owner_required', 400, 'A trusted cart owner is required to place an order.');
    }

    const fingerprint = requestFingerprint(command);
    const explicitRequestKey = command.checkoutRequestId?.trim();

    if (explicitRequestKey) {
      const previous = coordinator.lookup(explicitRequestKey, fingerprint);

      if (previous) {
        return previous;
      }
    }

    const cartResult = await dependencies.cart.getSnapshot({
      cartId,
      ownerId,
    });

    if (cartResult.kind === 'not-found') {
      throw new PlaceOrderError('cart_not_found', 404, 'The checkout cart was not found.');
    }

    if (cartResult.kind === 'forbidden') {
      throw new PlaceOrderError('cart_forbidden', 403, 'The checkout cart does not belong to the current session.');
    }

    if (!cartResult.snapshot.items.length) {
      throw new PlaceOrderError('cart_empty', 409, 'An empty cart cannot be checked out.');
    }

    const requestKey =
      explicitRequestKey ??
      `legacy-${stableFingerprint({
        ownerId,
        cartId,
        revision: cartResult.snapshot.revision,
        fingerprint,
      })}`;

    const quoteResult = await dependencies.catalog.quoteItems({
      items: cartResult.snapshot.items.map((item) => ({
        productId: item.productId,
        quantity: item.immediateQuantity + item.backorderQuantity,
      })),
    });

    if (quoteResult.kind === 'unavailable') {
      throw new PlaceOrderError(
        'product_unavailable',
        409,
        `Product ${quoteResult.productId} is no longer available for checkout.`,
      );
    }

    const semanticKey = `${ownerId}:${cartId}:${cartResult.snapshot.revision}`;

    return coordinator.run({
      requestKey,
      fingerprint,
      semanticKey,
      operation: async () => {
        const reservationResult = await dependencies.inventory.reserve({
          reservationKey: requestKey,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: cartResult.snapshot.items,
        });

        if (reservationResult.kind === 'conflict') {
          throw new PlaceOrderError(
            'reservation_conflict',
            409,
            'The checkout reservation key was already used with different inventory.',
          );
        }

        if (reservationResult.kind === 'unavailable') {
          throw new PlaceOrderError(
            'inventory_unavailable',
            409,
            `Insufficient inventory for product ${reservationResult.productId}.`,
          );
        }

        const reservation = reservationResult.reservation;
        let orderId: string | null = null;

        try {
          const items = quoteResult.quote.lines.map((line) => {
            const cartItem = cartResult.snapshot.items.find((item) => item.productId === line.productId);

            if (!cartItem) {
              throw new PlaceOrderError('quote_cart_mismatch', 409, 'The authoritative quote no longer matches the cart.');
            }

            return {
              productId: line.productId,
              sku: line.sku,
              name: line.name,
              immediateQuantity: cartItem.immediateQuantity,
              backorderQuantity: cartItem.backorderQuantity,
              unitPriceMinor: line.unitPrice.minor,
              lineTotalMinor: line.lineTotal.minor,
            };
          });

          const orderResult = await dependencies.orders.createPending({
            checkoutRequestId: requestKey,
            cartId,
            cartRevision: cartResult.snapshot.revision,
            user: command.user,
            items,
            shippingDetails:
              command.order.shippingDetails && typeof command.order.shippingDetails === 'object'
                ? (command.order.shippingDetails as Record<string, unknown>)
                : undefined,
            paymentDetails:
              command.order.paymentDetails && typeof command.order.paymentDetails === 'object'
                ? (command.order.paymentDetails as Record<string, unknown>)
                : undefined,
            shippingCostMinor: resolveShippingCostMinor(command.order),
            orderType: resolveOrderType(command.order),
            notes: resolveNotes(command.order),
          });

          if (orderResult.kind === 'conflict') {
            await dependencies.inventory.release(reservation.id);
            throw new PlaceOrderError(
              'order_idempotency_conflict',
              409,
              'The checkout request ID conflicts with an existing order.',
            );
          }

          orderId = orderResult.orderId;

          const payment = await dependencies.payments.ensurePayment({
            orderId,
            paymentType: resolvePaymentType(command.order),
            useExistingPaymentMethod: Boolean(command.order.stripeCardId),
          });

          const commitResult = await dependencies.inventory.commit(reservation.id);

          if (commitResult.kind !== 'committed' && commitResult.kind !== 'already-committed') {
            throw new PlaceOrderError(
              'inventory_recovery_required',
              409,
              'Payment succeeded but the inventory reservation could not be committed.',
            );
          }

          const orderPaymentResult = await dependencies.orders.confirmPayment({
            orderId,
            paymentId: payment.paymentId,
          });

          if (orderPaymentResult.kind === 'not-found') {
            throw new PlaceOrderError(
              'order_recovery_required',
              500,
              'Payment succeeded but the order could not be finalized.',
            );
          }

          await dependencies.cart.completeCheckout({
            cartId,
            ownerId,
            expectedRevision: cartResult.snapshot.revision,
          });

          return {
            orderId,
            status: payment.status,
            useExistingPaymentMethod: payment.useExistingPaymentMethod,
            clientSecret: payment.clientSecret,
            result: payment.result,
          };
        } catch (error) {
          if (!orderId) {
            await dependencies.inventory.release(reservation.id);
          }

          throw error;
        }
      },
    });
  };
};

const defaultCoordinator = createPlaceOrderCoordinator();

export const placeOrder = createPlaceOrderUseCase(
  {
    cart: defaultCart,
    catalog: defaultCatalog,
    inventory: defaultInventory,
    orders: defaultOrders,
    payments: defaultPayments,
  },
  defaultCoordinator,
);
