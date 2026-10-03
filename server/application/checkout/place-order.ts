import { parseCheckoutClaim, type CheckoutState, type PersistedCheckoutState } from './contracts';
import type { CheckoutErrorCode } from '~/types/order/checkout-error';
import { createHash } from 'node:crypto';
import type { UserInterface } from '~/types/auth/user-interface';
import { PaymentStatusEnum, PaymentTypeEnum } from '~/types/order-summary/item';
import { cart as defaultCart } from '~/server/domain/cart';
import { catalog as defaultCatalog } from '~/server/domain/catalog';
import { inventory as defaultInventory } from '~/server/domain/inventory';
import { orders as defaultOrders } from '~/server/domain/orders';
import { payments as defaultPayments, type PaymentPreparation } from '~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
import { createCheckoutReviewFingerprint } from './review-fingerprint';

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
  /** The server-issued cart revision attached to the buyer's reviewed quote. */
  reviewedCartRevision?: string;
  /** Server-generated fingerprint of the payable quote the buyer reviewed. */
  reviewedQuoteFingerprint?: string;
  user: UserInterface;
  order: LegacyOrderInput;
};
export type PlaceOrderResult = ReturnType<typeof toLegacyPaymentResult>;
export class PlaceOrderError extends Error {
  constructor(
    public readonly code: CheckoutErrorCode,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'PlaceOrderError';
  }
}

type PlaceOrderDependencies = {
  cart: Pick<typeof defaultCart, 'getSnapshot' | 'completeCheckout'>;
  catalog: Pick<typeof defaultCatalog, 'quoteCheckout'>;
  inventory: Pick<typeof defaultInventory, 'reserve' | 'commit' | 'release'>;
  orders: Pick<typeof defaultOrders, 'createPending' | 'confirmPayment' | 'getPaymentPreparation'>;
  payments: Pick<
    typeof defaultPayments,
    'preparePayment' | 'getPaymentPreparation' | 'continuePayment' | 'completePayment' | 'failPayment'
  >;
};
type ClaimRow = CheckoutState & {
  owner_id: string;
  request_id: string;
  fingerprint: string;
  cart_id: string;
  cart_revision: number;
  order_id: string | null;
  reservation_id: string | null;
  payment_id: string | null;
  result_json: string | null;
};
type PersistedClaimRow = Omit<ClaimRow, keyof CheckoutState> & PersistedCheckoutState;
const requireKnownClaim = (row: PersistedClaimRow | undefined): ClaimRow | null => {
  if (!row) return null;
  const claim = parseCheckoutClaim(row);
  if (!claim) throw new PlaceOrderError('payment_recovery_required', 409, 'The persisted checkout state requires recovery.');
  return claim;
};
export type PlaceOrderCoordinator = ReturnType<typeof createPlaceOrderCoordinator>;

const normalize = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(normalize)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([, entry]) => entry !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, entry]) => [key, normalize(entry)]),
        )
      : value;
const stableFingerprint = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(normalize(value)))
    .digest('hex');
const resolvePaymentType = (order: LegacyOrderInput) => {
  const value =
    order.paymentDetails && typeof order.paymentDetails === 'object' ? (order.paymentDetails as Record<string, unknown>).type : undefined;
  return typeof value === 'number' ? value : undefined;
};
const toLegacyPaymentResult = (payment: PaymentPreparation, order: LegacyOrderInput) => ({
  orderId: payment.orderId,
  status: PaymentStatusEnum.Paid,
  useExistingPaymentMethod: Boolean(order.stripeCardId),
  clientSecret: undefined as string | undefined,
  result: resolvePaymentType(order) === PaymentTypeEnum.Card ? { status: 'succeeded' as const } : undefined,
});
const resolveDeliveryServiceId = (order: LegacyOrderInput) => {
  const value =
    order.shippingDetails && typeof order.shippingDetails === 'object'
      ? (order.shippingDetails as Record<string, unknown>).deliveryTypeId
      : undefined;
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
};
const resolveNotes = (order: LegacyOrderInput) =>
  Array.isArray(order.notes)
    ? order.notes
        .filter((note): note is Record<string, unknown> => Boolean(note && typeof note === 'object'))
        .map((note) => ({
          sender: typeof note.sender === 'string' ? note.sender : undefined,
          message: typeof note.message === 'string' ? note.message : undefined,
        }))
    : undefined;
const requestFingerprint = (command: PlaceOrderCommand) =>
  stableFingerprint({
    cartId: command.cartId,
    cartOwnerId: command.cartOwnerId,
    reviewedCartRevision: command.reviewedCartRevision,
    reviewedQuoteFingerprint: command.reviewedQuoteFingerprint,
    shippingDetails: command.order.shippingDetails,
    paymentType: resolvePaymentType(command.order),
    stripeCardId: command.order.stripeCardId,
    deliveryServiceId: resolveDeliveryServiceId(command.order),
    type: command.order.type,
    notes: resolveNotes(command.order),
  });

export const createPlaceOrderCoordinator = () => ({
  async lookup(ownerId: string, requestKey: string, fingerprint: string): Promise<ClaimRow | null> {
    const database = await getCheckoutDatabase();
    const rows = await database.query<PersistedClaimRow>(
      `SELECT claim.* FROM checkout_claim_aliases alias JOIN checkout_claims claim ON claim.owner_id = alias.owner_id AND claim.request_id = alias.claim_request_id WHERE alias.owner_id = $1 AND alias.request_id = $2`,
      [ownerId, requestKey],
    );
    const claim = requireKnownClaim(rows[0]);
    if (!claim) return null;
    const aliases = await database.query<{ fingerprint: string }>(
      'SELECT fingerprint FROM checkout_claim_aliases WHERE owner_id = $1 AND request_id = $2',
      [ownerId, requestKey],
    );
    if (aliases[0]?.fingerprint !== fingerprint)
      throw new PlaceOrderError(
        'idempotency_conflict',
        409,
        'The checkout request ID was already used with different checkout parameters.',
      );
    return claim;
  },
  async lookupSemantic(ownerId: string, cartId: string, cartRevision: number): Promise<ClaimRow | null> {
    const database = await getCheckoutDatabase();
    const rows = await database.query<PersistedClaimRow>(
      'SELECT * FROM checkout_claims WHERE owner_id = $1 AND cart_id = $2 AND cart_revision = $3',
      [ownerId, cartId, cartRevision],
    );
    return requireKnownClaim(rows[0]);
  },
});

const requirePreparedClaim = (row: ClaimRow) => {
  const claim = parseCheckoutClaim(row);
  if (!claim) throw new PlaceOrderError('payment_recovery_required', 409, 'The persisted checkout state requires recovery.');
  if (!claim.order_id || !claim.reservation_id || !claim.payment_id)
    throw new PlaceOrderError('checkout_repair_required', 500, 'The persisted checkout claim is incomplete and requires repair.');
  return { ...claim, order_id: claim.order_id, reservation_id: claim.reservation_id, payment_id: claim.payment_id };
};

export const createPlaceOrderUseCase =
  (dependencies: PlaceOrderDependencies, coordinator: PlaceOrderCoordinator = createPlaceOrderCoordinator()) =>
  async (command: PlaceOrderCommand): Promise<PlaceOrderResult> => {
    assertOutsideCheckoutTransaction('PlaceOrder');
    const cartId = command.cartId.trim();
    const ownerId = command.cartOwnerId.trim();
    if (!cartId) throw new PlaceOrderError('cart_required', 400, 'A cart is required to place an order.');
    if (!ownerId) throw new PlaceOrderError('cart_owner_required', 400, 'A trusted cart owner is required to place an order.');
    const fingerprint = requestFingerprint(command);
    const explicitKey = command.checkoutRequestId?.trim();
    let claim = explicitKey ? await coordinator.lookup(ownerId, explicitKey, fingerprint) : null;
    let preparationCart: Awaited<ReturnType<typeof dependencies.cart.getSnapshot>> | null = null;

    if (!claim) {
      claim = await withCheckoutTransaction(async () => {
        if (explicitKey) {
          const raced = await coordinator.lookup(ownerId, explicitKey, fingerprint);
          if (raced) return raced;
        }
        const cartResult = preparationCart ?? (await dependencies.cart.getSnapshot({ cartId, ownerId }));
        preparationCart = cartResult;
        if (cartResult.kind === 'not-found') throw new PlaceOrderError('cart_not_found', 404, 'The checkout cart was not found.');
        if (cartResult.kind === 'forbidden')
          throw new PlaceOrderError('cart_forbidden', 403, 'The checkout cart does not belong to the current session.');
        if (command.reviewedCartRevision && command.reviewedCartRevision !== cartResult.snapshot.revision) {
          throw new PlaceOrderError(
            'cart_changed',
            409,
            'Your cart changed after you reviewed this order. Return to the order summary to review the updated items and total before placing your order.',
          );
        }
        const requestKey =
          explicitKey ?? `legacy-${stableFingerprint({ ownerId, cartId, revision: cartResult.snapshot.revision, fingerprint })}`;
        const database = await getCheckoutDatabase();
        await database.execute('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${ownerId}:${cartId}`]);
        const semantic = await coordinator.lookupSemantic(ownerId, cartId, Number(cartResult.snapshot.revision));
        if (semantic) {
          if (semantic.fingerprint !== fingerprint)
            throw new PlaceOrderError(
              'checkout_already_started',
              409,
              'This cart revision already has a checkout with different parameters.',
            );
          await database.execute(
            'INSERT INTO checkout_claim_aliases (owner_id, request_id, fingerprint, claim_request_id, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [ownerId, requestKey, fingerprint, semantic.request_id, new Date().toISOString()],
          );
          const bound = await coordinator.lookup(ownerId, requestKey, fingerprint);
          if (!bound || bound.request_id !== semantic.request_id)
            throw new PlaceOrderError('idempotency_conflict', 409, 'The checkout alias is bound to another checkout.');
          return bound;
        }
        if (!cartResult.snapshot.items.length) throw new PlaceOrderError('cart_empty', 409, 'An empty cart cannot be checked out.');
        const quoteResult = await dependencies.catalog.quoteCheckout({
          customer: command.user,
          deliveryServiceId: resolveDeliveryServiceId(command.order),
          items: cartResult.snapshot.items.map((item) => ({
            productId: item.productId,
            quantity: item.immediateQuantity + item.backorderQuantity,
          })),
        });
        if (quoteResult.kind === 'unavailable')
          throw new PlaceOrderError('product_unavailable', 409, `Product ${quoteResult.productId} is no longer available for checkout.`);
        if (quoteResult.kind === 'delivery-unavailable')
          throw new PlaceOrderError('delivery_unavailable', 409, 'The selected delivery service is no longer available.');
        if (
          command.reviewedQuoteFingerprint &&
          command.reviewedQuoteFingerprint !== createCheckoutReviewFingerprint(cartResult.snapshot.revision, quoteResult.quote)
        ) {
          throw new PlaceOrderError(
            'quote_changed',
            409,
            'Pricing changed after you reviewed this order. Return to the order summary to review the updated items and total before placing your order.',
          );
        }
        const timestamp = new Date().toISOString();
        const insertedClaim = await database.query<{ request_id: string }>(
          `INSERT INTO checkout_claims (owner_id, request_id, fingerprint, cart_id, cart_revision, result_json, created_at, updated_at, workflow_status)
           VALUES ($1,$2,$3,$4,$5,NULL,$6,$6,'recovery_required')
           ON CONFLICT DO NOTHING RETURNING request_id`,
          [ownerId, requestKey, fingerprint, cartId, Number(cartResult.snapshot.revision), timestamp],
        );
        if (!insertedClaim.length)
          throw Object.assign(new Error('The checkout claim raced another request; retry its durable identity.'), { code: '40001' });
        await database.execute(
          'INSERT INTO checkout_claim_aliases (owner_id, request_id, fingerprint, claim_request_id, created_at) VALUES ($1,$2,$3,$2,$4)',
          [ownerId, requestKey, fingerprint, timestamp],
        );
        const reservationResult = await dependencies.inventory.reserve({
          reservationKey: `${ownerId}:${requestKey}`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: cartResult.snapshot.items,
        });
        if (reservationResult.kind === 'conflict')
          throw new PlaceOrderError('reservation_conflict', 409, 'The reservation conflicts with existing inventory.');
        if (reservationResult.kind === 'unavailable')
          throw new PlaceOrderError('inventory_unavailable', 409, `Insufficient inventory for product ${reservationResult.productId}.`);
        const items = quoteResult.quote.lines.map((line) => {
          const item = cartResult.snapshot.items.find((entry) => entry.productId === line.productId);
          if (!item) throw new PlaceOrderError('quote_cart_mismatch', 409, 'The authoritative quote no longer matches the cart.');
          return {
            productId: line.productId,
            sku: line.sku,
            name: line.name,
            immediateQuantity: item.immediateQuantity,
            backorderQuantity: item.backorderQuantity,
            listUnitPriceMinor: line.listUnitPrice.minor,
            discountPercent: line.discountPercent,
            discountTotalMinor: line.discountTotal.minor,
            vatTotalMinor: line.vatTotal.minor,
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
          shippingDetails: {
            ...(command.order.shippingDetails && typeof command.order.shippingDetails === 'object'
              ? (command.order.shippingDetails as Record<string, unknown>)
              : {}),
            deliveryTypeId: String(quoteResult.quote.deliveryOption.service.id),
            stockorderShippingType: quoteResult.quote.deliveryOption,
          },
          paymentDetails:
            command.order.paymentDetails && typeof command.order.paymentDetails === 'object'
              ? (command.order.paymentDetails as Record<string, unknown>)
              : undefined,
          money: {
            currency: quoteResult.quote.currency,
            merchandiseTotalMinor: quoteResult.quote.merchandiseTotal.minor,
            discountTotalMinor: quoteResult.quote.discountTotal.minor,
            shippingTotalMinor: quoteResult.quote.shippingTotal.minor,
            smallOrderChargeMinor: quoteResult.quote.smallOrderCharge.minor,
            vatRate: quoteResult.quote.vatRate,
            vatTotalMinor: quoteResult.quote.vatTotal.minor,
            grandTotalMinor: quoteResult.quote.grandTotal.minor,
          },
          orderType: typeof command.order.type === 'number' ? command.order.type : undefined,
          notes: resolveNotes(command.order),
        });
        if (orderResult.kind === 'conflict')
          throw new PlaceOrderError('order_idempotency_conflict', 409, 'The checkout request conflicts with an existing Order.');
        const order = await dependencies.orders.getPaymentPreparation(orderResult.orderId);
        if (!order) throw new PlaceOrderError('order_recovery_required', 500, 'The prepared Order could not be read.');
        const paymentResult = await dependencies.payments.preparePayment({
          orderId: order.orderId,
          amountMinor: order.grandTotalMinor,
          currency: order.currency,
          legacyPaymentType: resolvePaymentType(command.order),
          legacyUseExistingPaymentMethod: Boolean(command.order.stripeCardId),
        });
        if (paymentResult.kind === 'recovery-required')
          throw new PlaceOrderError('payment_recovery_required', 409, 'The persisted Payment status requires recovery.');
        await database.execute(
          `UPDATE checkout_claims SET order_id=$1,reservation_id=$2,payment_id=$3,workflow_status='payment_pending',updated_at=$4 WHERE owner_id=$5 AND request_id=$6`,
          [order.orderId, reservationResult.reservation.id, paymentResult.payment.paymentId, new Date().toISOString(), ownerId, requestKey],
        );
        return requireKnownClaim(
          (
            await database.query<PersistedClaimRow>('SELECT * FROM checkout_claims WHERE owner_id=$1 AND request_id=$2', [
              ownerId,
              requestKey,
            ])
          )[0],
        )!;
      });
    }

    const prepared = requirePreparedClaim(claim);
    let payment = await dependencies.payments.getPaymentPreparation(prepared.payment_id);
    if (!payment) throw new PlaceOrderError('checkout_repair_required', 500, 'The persisted checkout Payment is missing.');
    if (!payment.status) throw new PlaceOrderError('payment_recovery_required', 409, 'The persisted Payment status requires recovery.');
    const completeCartCheckout = async () => {
      try {
        await withCheckoutTransaction(async () => {
          await dependencies.cart.completeCheckout({
            cartId: prepared.cart_id,
            ownerId: prepared.owner_id,
            expectedRevision: String(prepared.cart_revision),
          });
        });
      } catch {
        // Cart cleanup is a best-effort retryable step after durable order finalization.
      }
    };
    if (
      prepared.paid_recovery_decision === 'REFUND' ||
      ['compensation_pending', 'compensation_recovery_required'].includes(prepared.workflow_status)
    )
      throw new PlaceOrderError('payment_recovery_required', 409, 'The paid checkout is held for compensation.');
    if (prepared.workflow_status === 'finalized') {
      if (payment.status !== 'PAID')
        throw new PlaceOrderError('payment_recovery_required', 409, 'The finalized checkout Payment requires recovery.');
      await completeCartCheckout();
      const result = toLegacyPaymentResult(payment, command.order);
      if (!prepared.result_json) return result;
      const persisted = JSON.parse(prepared.result_json) as Partial<PlaceOrderResult>;
      return {
        ...result,
        clientSecret: typeof persisted.clientSecret === 'string' ? persisted.clientSecret : undefined,
      };
    }
    if (prepared.workflow_status === 'canceled' || payment.status === 'FAILED' || payment.status === 'CANCELED')
      throw new PlaceOrderError('payment_failed', 409, 'The prepared Payment is terminal and cannot be resumed.');
    if (payment.status === 'PROCESSING')
      throw new PlaceOrderError('payment_recovery_required', 409, 'The Payment is still processing and requires recovery.');
    if (payment.status === 'PENDING') {
      const continuation = await dependencies.payments.continuePayment({ paymentId: payment.paymentId });
      if (continuation.kind === 'failed') {
        const failure = await withCheckoutTransaction(async () =>
          dependencies.payments.failPayment({ paymentId: payment!.paymentId, providerReference: continuation.providerReference }),
        );
        if (failure.kind !== 'failed') throw new PlaceOrderError('payment_recovery_required', 409, 'The Payment state requires recovery.');
        throw new PlaceOrderError('payment_failed', 409, 'The prepared Payment failed.');
      }
      if (continuation.kind === 'recovery-required')
        throw new PlaceOrderError('payment_recovery_required', 409, 'The Payment state requires recovery.');
      const completed = await withCheckoutTransaction(async () =>
        dependencies.payments.completePayment({ paymentId: payment!.paymentId, providerReference: continuation.providerReference }),
      );
      if (completed.kind !== 'paid') throw new PlaceOrderError('payment_recovery_required', 409, 'The Payment state requires recovery.');
      payment = completed.payment;
    }
    if (payment.status !== 'PAID') throw new PlaceOrderError('payment_recovery_required', 409, 'The Payment state requires recovery.');
    try {
      await withCheckoutTransaction(async () => {
        const database = await getCheckoutDatabase();
        const [persistedCurrent] = await database.query<PersistedClaimRow>(
          'SELECT * FROM checkout_claims WHERE owner_id=$1 AND request_id=$2 FOR UPDATE',
          [prepared.owner_id, prepared.request_id],
        );
        const current = parseCheckoutClaim(persistedCurrent);
        if (
          !current ||
          current.paid_recovery_decision === 'REFUND' ||
          !['payment_pending', 'recovery_required', 'finalized'].includes(current.workflow_status)
        )
          throw new PlaceOrderError('payment_recovery_required', 409, 'The paid checkout cannot enter fulfillment.');
        const commit = await dependencies.inventory.commit(prepared.reservation_id);
        if (commit.kind !== 'committed' && commit.kind !== 'already-committed')
          throw new PlaceOrderError('inventory_recovery_required', 409, 'Paid checkout inventory requires recovery.');
        const confirmation = await dependencies.orders.confirmPayment({ orderId: prepared.order_id, paymentId: prepared.payment_id });
        if (confirmation.kind === 'not-found')
          throw new PlaceOrderError('order_recovery_required', 500, 'The paid Order could not be finalized.');
        const result = toLegacyPaymentResult(payment!, command.order);
        await database.execute(
          `UPDATE checkout_claims SET workflow_status='finalized',result_json=$1,updated_at=$2 WHERE owner_id=$3 AND request_id=$4`,
          [JSON.stringify(result), new Date().toISOString(), prepared.owner_id, prepared.request_id],
        );
      });
    } catch (error) {
      await withCheckoutTransaction(async () => {
        const database = await getCheckoutDatabase();
        await database.execute(
          `UPDATE checkout_claims SET workflow_status='recovery_required',updated_at=$1
            WHERE owner_id=$2 AND request_id=$3 AND workflow_status IN ('prepared','payment_pending','recovery_required')
              AND (paid_recovery_decision IS NULL OR paid_recovery_decision IN ('ALLOCATE','BACKORDER'))`,
          [new Date().toISOString(), prepared.owner_id, prepared.request_id],
        );
      });
      throw error;
    }
    await completeCartCheckout();
    return toLegacyPaymentResult(payment, command.order);
  };

const defaultCoordinator = createPlaceOrderCoordinator();
export const placeOrder = createPlaceOrderUseCase(
  { cart: defaultCart, catalog: defaultCatalog, inventory: defaultInventory, orders: defaultOrders, payments: defaultPayments },
  defaultCoordinator,
);
