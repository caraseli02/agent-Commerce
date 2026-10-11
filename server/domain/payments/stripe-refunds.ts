import { randomUUID } from 'node:crypto';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';
import { parsePersistedPaymentStatus, refundStatuses, refundReasons, type RefundStatus, type RefundReason } from './contracts';
export type { RefundStatus, RefundReason } from './contracts';

export type RefundResult =
  { kind: 'pending' | 'succeeded' | 'failed'; refundId: string } | { kind: 'recovery-required'; reason: 'unknown' | 'unsafe-replay' };
export type StripeRefund = {
  id: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
  status: string | null;
  metadata: { refundId?: string; paymentId?: string; orderId?: string };
};
export type StripeRefundProvider = {
  create(
    input: { refundId: string; paymentId: string; orderId: string; paymentIntentId: string; amountMinor: number; reason: RefundReason },
    key: string,
  ): Promise<StripeRefund>;
  retrieve(refundId: string): Promise<StripeRefund>;
};
export type RefundCompensationGate = <T>(input: { paymentId: string; orderId: string }, prepare: () => Promise<T>) => Promise<T | null>;
type PaymentRow = {
  id: string;
  order_id: string;
  status: unknown;
  amount_minor: number;
  currency: string;
  stripe_payment_intent_id: string | null;
};
export type RefundPreparation = Readonly<{
  refundId: string;
  paymentId: string;
  orderId: string;
  status: RefundStatus;
  amountMinor: number;
  currency: string;
}>;
type RefundRow = {
  id: string;
  payment_id: string;
  stripe_payment_intent_id: string;
  amount_minor: number;
  currency: string;
  reason: RefundReason;
  status: RefundStatus;
  stripe_refund_id: string | null;
  create_started_at: Date | null;
};
type Prepared = { refund: RefundRow; orderId: string };
const replayWindowMs = 24 * 60 * 60 * 1000;
const recovery: RefundResult = { kind: 'recovery-required', reason: 'unknown' };
const outcome = (refund: RefundRow): RefundResult => ({
  kind: refund.status === 'SUCCEEDED' ? 'succeeded' : refund.status === 'FAILED' ? 'failed' : 'pending',
  refundId: refund.id,
});
const matches = (refund: RefundRow, payment: PaymentRow) =>
  refund.payment_id === payment.id &&
  refund.stripe_payment_intent_id === payment.stripe_payment_intent_id &&
  Number.isSafeInteger(Number(refund.amount_minor)) &&
  Number(refund.amount_minor) > 0 &&
  Number(refund.amount_minor) === Number(payment.amount_minor) &&
  refund.currency === 'RON' &&
  payment.currency === refund.currency &&
  (refund.status === 'PENDING' || Boolean(refund.stripe_refund_id?.startsWith('re_'))) &&
  refundStatuses.includes(refund.status) &&
  refundReasons.includes(refund.reason);
const providerMatches = (value: StripeRefund, prepared: Prepared) =>
  Boolean(value) &&
  typeof value.id === 'string' &&
  value.id.startsWith('re_') &&
  value.id.length > 3 &&
  value.paymentIntentId === prepared.refund.stripe_payment_intent_id &&
  Number.isSafeInteger(value.amountMinor) &&
  value.amountMinor === Number(prepared.refund.amount_minor) &&
  (value.currency === 'ron' || value.currency === 'RON') &&
  value.metadata?.refundId === prepared.refund.id &&
  value.metadata?.paymentId === prepared.refund.payment_id &&
  value.metadata?.orderId === prepared.orderId;
const readPayment = async (paymentId: string, lock = false) => {
  const db = await getCheckoutDatabase();
  const [row] = await db.query<PaymentRow>(`SELECT * FROM checkout_payments WHERE id=$1${lock ? ' FOR UPDATE' : ''}`, [paymentId]);
  return row;
};
const readRefund = async (paymentId: string, lock = false) => {
  const db = await getCheckoutDatabase();
  const [row] = await db.query<RefundRow>(`SELECT * FROM checkout_refunds WHERE payment_id=$1${lock ? ' FOR UPDATE' : ''}`, [paymentId]);
  return row;
};

// Internal application preparation must be read under the caller's transaction.
export const getRefundPreparationForUpdate = async (paymentId: string): Promise<RefundPreparation | null> => {
  const payment = await readPayment(paymentId, true);
  const refund = await readRefund(paymentId, true);
  if (!payment || !refund || parsePersistedPaymentStatus(payment.status) !== 'PAID' || !matches(refund, payment)) return null;
  return {
    refundId: refund.id,
    paymentId,
    orderId: payment.order_id,
    status: refund.status,
    amountMinor: Number(refund.amount_minor),
    currency: refund.currency,
  };
};

export const readRefundContinuation = async (input: {
  paymentId: string;
  orderId: string;
  refundId: string;
}): Promise<{ kind: 'known'; status: RefundStatus } | { kind: 'unknown' }> => {
  const payment = await readPayment(input.paymentId);
  const refund = await readRefund(input.paymentId);
  return payment &&
    refund &&
    payment.order_id === input.orderId &&
    parsePersistedPaymentStatus(payment.status) === 'PAID' &&
    refund.id === input.refundId &&
    matches(refund, payment) &&
    refund.stripe_refund_id?.startsWith('re_')
    ? { kind: 'known', status: refund.status }
    : { kind: 'unknown' };
};

export const isSupportedStripeRefundEvent = (type: string) => ['refund.created', 'refund.updated', 'refund.failed'].includes(type);
export type VerifiedRefundEventResult = RefundResult;

export const createStripeRefundAdapter = (options: {
  provider: StripeRefundProvider;
  withRefundCompensation: RefundCompensationGate;
  enabled?: () => boolean;
  now?: () => Date;
  onSucceeded?: (input: { paymentId: string; orderId: string; refundId: string }) => Promise<{ kind: 'settled' | 'retry' }>;
  onRecoveryRequired?: (input: { paymentId: string; orderId: string }) => Promise<unknown>;
}) => {
  const now = options.now ?? (() => new Date());
  const applyConsequences = async (refund: RefundRow, orderId: string): Promise<RefundResult> => {
    const identity = { paymentId: refund.payment_id, orderId };
    if (refund.status === 'SUCCEEDED' && options.onSucceeded) {
      try {
        if ((await options.onSucceeded({ ...identity, refundId: refund.id })).kind !== 'settled') return recovery;
      } catch {
        return recovery;
      }
    }
    if (refund.status === 'FAILED') {
      try {
        const result = await options.onRecoveryRequired?.(identity);
        if (result && (result as { kind?: string }).kind === 'conflict') return recovery;
      } catch {
        return recovery;
      }
    }
    return outcome(refund);
  };
  const requestFullRefund = async (input: { paymentId: string; reason: RefundReason }): Promise<RefundResult> => {
    assertOutsideCheckoutTransaction('Full Refund request');
    if (!(options.enabled?.() ?? false) || !refundReasons.includes(input.reason)) return recovery;
    const routingPayment = await readPayment(input.paymentId);
    if (!routingPayment) return recovery;
    const identity = { paymentId: input.paymentId, orderId: routingPayment.order_id };
    const prepareRefund = async (allowCreate: boolean): Promise<Prepared | null> => {
      const payment = await readPayment(input.paymentId, true);
      if (
        !payment ||
        payment.order_id !== identity.orderId ||
        parsePersistedPaymentStatus(payment.status) !== 'PAID' ||
        !payment.stripe_payment_intent_id?.startsWith('pi_') ||
        payment.currency !== 'RON' ||
        !Number.isSafeInteger(Number(payment.amount_minor)) ||
        Number(payment.amount_minor) <= 0
      )
        return null;
      const db = await getCheckoutDatabase();
      let refund = await readRefund(payment.id, true);
      if (!refund && !allowCreate) return null;
      if (!refund) {
        const timestamp = now().toISOString();
        await db.execute(
          `INSERT INTO checkout_refunds (id,payment_id,stripe_payment_intent_id,amount_minor,currency,reason,status,create_started_at,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7::timestamptz,$7::timestamptz,$7::timestamptz)`,
          [
            `refund-${randomUUID()}`,
            payment.id,
            payment.stripe_payment_intent_id,
            Number(payment.amount_minor),
            payment.currency,
            input.reason,
            timestamp,
          ],
        );
        refund = await readRefund(payment.id, true);
      }
      if (!refund || !matches(refund, payment)) return null;
      if (!allowCreate && !refund.stripe_refund_id) return null;
      // Persisted parameters and create-start are never replaced during recovery.
      return { refund, orderId: payment.order_id };
    };
    // Reconciliation of an already known financial identity needs no new
    // commercial permission. Release Payments locks before entering Checkout.
    const known = await withCheckoutTransaction(() => prepareRefund(false));
    const prepared = known ?? (await options.withRefundCompensation(identity, () => prepareRefund(true)));
    if (!prepared) return recovery;
    assertOutsideCheckoutTransaction('Stripe Refund continuation');
    const fail = async (result: RefundResult = recovery) => {
      await options.onRecoveryRequired?.(identity);
      return result;
    };
    // Prefer an identity attached by another request after preparation commit.
    const current = await readRefund(input.paymentId);
    if (
      !current ||
      current.id !== prepared.refund.id ||
      !matches(current, routingPayment) ||
      (prepared.refund.stripe_refund_id && current.stripe_refund_id !== prepared.refund.stripe_refund_id)
    )
      return fail();
    prepared.refund = current;
    if (current.status !== 'PENDING') {
      return applyConsequences(current, prepared.orderId);
    }
    let observed: StripeRefund;
    try {
      if (current.stripe_refund_id) {
        observed = await options.provider.retrieve(current.stripe_refund_id);
      } else {
        const elapsed = now().getTime() - new Date(current.create_started_at ?? '').getTime();
        if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= replayWindowMs)
          return fail({ kind: 'recovery-required', reason: 'unsafe-replay' });
        observed = await options.provider.create(
          {
            refundId: current.id,
            paymentId: current.payment_id,
            orderId: prepared.orderId,
            paymentIntentId: current.stripe_payment_intent_id,
            amountMinor: Number(current.amount_minor),
            reason: current.reason,
          },
          `refund:${current.id}:full`,
        );
      }
    } catch (error) {
      const conflict = error as { statusCode?: unknown; code?: unknown } | null;
      // Stripe does not replay an in-flight create; another request owns it.
      if (!current.stripe_refund_id && conflict?.statusCode === 409 && conflict.code === 'idempotency_key_in_use') {
        const latest = await readRefund(input.paymentId);
        return latest && latest.id === current.id && matches(latest, routingPayment) ? outcome(latest) : recovery;
      }
      return fail();
    }
    if (!providerMatches(observed, prepared) || (current.stripe_refund_id && observed.id !== current.stripe_refund_id)) return fail();
    const status: RefundStatus | null =
      observed.status === 'succeeded'
        ? 'SUCCEEDED'
        : observed.status === 'failed' || observed.status === 'canceled'
          ? 'FAILED'
          : observed.status === 'pending'
            ? 'PENDING'
            : null;
    // Provider financial truth belongs to Payments even if Checkout has advanced.
    const persisted = await withCheckoutTransaction(async () => {
      const payment = await readPayment(input.paymentId, true);
      const refund = await readRefund(input.paymentId, true);
      if (
        !payment ||
        !refund ||
        !matches(refund, payment) ||
        parsePersistedPaymentStatus(payment.status) !== 'PAID' ||
        refund.id !== current.id ||
        payment.order_id !== prepared.orderId ||
        (refund.stripe_refund_id && refund.stripe_refund_id !== observed.id)
      )
        return null;
      if (refund.status !== 'PENDING') return refund;
      const db = await getCheckoutDatabase();
      await db.execute('UPDATE checkout_refunds SET stripe_refund_id=$1,status=$2,updated_at=$3::timestamptz WHERE id=$4', [
        observed.id,
        status ?? refund.status,
        now().toISOString(),
        refund.id,
      ]);
      return readRefund(input.paymentId, true);
    });
    if (!persisted) return fail();
    if (persisted.status === 'PENDING' && !status) return fail();
    return applyConsequences(persisted, prepared.orderId);
  };
  // Only known identities may reconcile. This operation never prepares or creates a Refund.
  const reconcileRefund = async (input: { paymentId: string }): Promise<RefundResult> => {
    assertOutsideCheckoutTransaction('Stripe Refund reconciliation');
    if (!(options.enabled?.() ?? false)) return recovery;
    const payment = await readPayment(input.paymentId);
    const refund = await readRefund(input.paymentId);
    if (!payment || !refund || !matches(refund, payment) || !refund.stripe_refund_id) return recovery;
    return observeRefund({ refund, orderId: payment.order_id });
  };
  const observeRefund = async (prepared: Prepared, event?: { eventId: string; eventType: string }): Promise<RefundResult> => {
    let observed: StripeRefund;
    const identity = { paymentId: prepared.refund.payment_id, orderId: prepared.orderId };
    const fail = async () => {
      await options.onRecoveryRequired?.(identity);
      return recovery;
    };
    try {
      observed = await options.provider.retrieve(prepared.refund.stripe_refund_id!);
    } catch {
      return fail();
    }
    if (!providerMatches(observed, prepared) || observed.id !== prepared.refund.stripe_refund_id) return fail();
    const status: RefundStatus | null =
      observed.status === 'succeeded'
        ? 'SUCCEEDED'
        : ['failed', 'canceled'].includes(observed.status ?? '')
          ? 'FAILED'
          : observed.status === 'pending'
            ? 'PENDING'
            : null;
    if (!status) return fail();
    const persisted = await withCheckoutTransaction(async () => {
      const payment = await readPayment(identity.paymentId, true);
      const refund = await readRefund(identity.paymentId, true);
      if (
        !payment ||
        !refund ||
        !matches(refund, payment) ||
        parsePersistedPaymentStatus(payment.status) !== 'PAID' ||
        payment.order_id !== identity.orderId ||
        refund.id !== prepared.refund.id ||
        (refund.stripe_refund_id && refund.stripe_refund_id !== observed.id)
      )
        return null;
      const db = await getCheckoutDatabase();
      if (event) {
        const [inserted] = await db.query(
          `INSERT INTO checkout_stripe_refund_events (event_id,event_type,stripe_refund_id,refund_id,observed_at)
          VALUES ($1,$2,$3,$4,$5::timestamptz) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
          [event.eventId, event.eventType, observed.id, refund.id, now().toISOString()],
        );
        if (!inserted) {
          const [stored] = await db.query('SELECT * FROM checkout_stripe_refund_events WHERE event_id=$1', [event.eventId]);
          if (stored?.event_type !== event.eventType || stored?.stripe_refund_id !== observed.id || stored?.refund_id !== refund.id)
            return null;
          return refund;
        }
      }
      // A bank-return failure is authoritative even after success. Failure is
      // absorbing; stale pending/success reads cannot erase terminal failure.
      const next =
        refund.status === 'FAILED' ? 'FAILED' : status === 'FAILED' ? 'FAILED' : refund.status === 'SUCCEEDED' ? 'SUCCEEDED' : status;
      await db.execute('UPDATE checkout_refunds SET stripe_refund_id=$1,status=$2,updated_at=$3::timestamptz WHERE id=$4', [
        observed.id,
        next,
        now().toISOString(),
        refund.id,
      ]);
      return readRefund(identity.paymentId, true);
    });
    return persisted ? applyConsequences(persisted, identity.orderId) : fail();
  };
  // Internal boundary: signature verification must precede this call. Event
  // snapshots route identity only; one bounded provider read supplies truth.
  const applyVerifiedRefundEvent = async (input: {
    eventId: string;
    eventType: string;
    refund: StripeRefund;
  }): Promise<VerifiedRefundEventResult> => {
    assertOutsideCheckoutTransaction('Stripe verified Refund event');
    if (!(options.enabled?.() ?? false) || !input.eventId || !isSupportedStripeRefundEvent(input.eventType)) return recovery;
    const db = await getCheckoutDatabase();
    const [known] = await db.query<{ payment_id: string }>('SELECT payment_id FROM checkout_refunds WHERE stripe_refund_id=$1', [
      input.refund.id,
    ]);
    const paymentId = known?.payment_id ?? input.refund.metadata?.paymentId;
    if (!paymentId) return recovery;
    const payment = await readPayment(paymentId);
    const refund = await readRefund(paymentId);
    if (!payment || !refund || !matches(refund, payment) || parsePersistedPaymentStatus(payment.status) !== 'PAID') return recovery;
    const prepared = { refund, orderId: payment.order_id };
    if (!providerMatches(input.refund, prepared) || (refund.stripe_refund_id && refund.stripe_refund_id !== input.refund.id)) {
      await options.onRecoveryRequired?.({ paymentId, orderId: payment.order_id });
      return recovery;
    }
    const [duplicate] = await db.query('SELECT * FROM checkout_stripe_refund_events WHERE event_id=$1', [input.eventId]);
    if (duplicate) {
      if (duplicate.event_type !== input.eventType || duplicate.stripe_refund_id !== input.refund.id || duplicate.refund_id !== refund.id)
        return recovery;
      return applyConsequences(refund, payment.order_id);
    }
    // A signed event can recover the exact identity after a lost create response.
    return observeRefund({ ...prepared, refund: { ...refund, stripe_refund_id: input.refund.id } }, input);
  };
  return { requestFullRefund, reconcileRefund, applyVerifiedRefundEvent };
};
