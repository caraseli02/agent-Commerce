import { randomUUID } from 'node:crypto';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

import { parsePersistedPaymentStatus, type PersistedPaymentStatus } from './contracts';
export type { PaymentStatus, PersistedPaymentStatus } from './contracts';

export { createStripeIntentAdapter } from './stripe-intents';
export { createStripeRefundAdapter, getRefundPreparationForUpdate, readRefundContinuation } from './stripe-refunds';
export type { RefundResult, RefundReason, RefundStatus } from './stripe-refunds';
export type { CancelPaymentResult, InitiatePaymentResult, ReconcilePaymentResult } from './stripe-intents';
export { handleStripeWebhook } from './stripe-webhook';

export type PaymentNextAction =
  Readonly<{ type: 'none' }> | Readonly<{ type: 'client-secret'; clientSecret: string }> | Readonly<{ type: 'redirect'; url: string }>;

export type PaymentPreparation = Readonly<{
  paymentId: string;
  orderId: string;
  // null retains an existing row's identity while refusing unknown stored state.
  status: PersistedPaymentStatus | null;
  amountMinor: number;
  currency: 'RON';
}>;
export type PreparePaymentResult = { kind: 'prepared' | 'existing' | 'recovery-required'; payment: PaymentPreparation };
export type ContinuePaymentResult =
  | { kind: 'succeeded'; nextAction: PaymentNextAction; providerReference: string | null }
  | { kind: 'failed'; providerReference: string | null }
  | { kind: 'recovery-required' };
export type CompletePaymentResult =
  { kind: 'paid'; payment: PaymentPreparation } | { kind: 'failed' | 'not-found' | 'recovery-required'; payment?: PaymentPreparation };
export type FailPaymentResult = { kind: 'failed' } | { kind: 'recovery-required' };

type PaymentRow = {
  id: string;
  order_id: string;
  status: unknown;
  amount_minor: number;
  currency: 'RON';
  stripe_payment_intent_id: string | null;
  stripe_payment_intent_create_started_at: Date | null;
  cancellation_requested_at: Date | null;
};
const toPreparation = (row: PaymentRow): PaymentPreparation => {
  const status = parsePersistedPaymentStatus(row.status);
  return {
    paymentId: row.id,
    orderId: row.order_id,
    status,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
  };
};

const getPaymentRow = async (paymentId: string) => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<PaymentRow>('SELECT * FROM checkout_payments WHERE id = $1', [paymentId]);
  return rows[0] ?? null;
};
const getPaymentPreparation = async (paymentId: string) => {
  const row = await getPaymentRow(paymentId);
  return row ? toPreparation(row) : null;
};

const getPaymentPreparationForUpdate = async (paymentId: string) => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<PaymentRow>('SELECT * FROM checkout_payments WHERE id = $1 FOR UPDATE', [paymentId]);
  return row ? toPreparation(row) : null;
};

const preparePayment = async (input: {
  orderId: string;
  amountMinor: number;
  currency: 'RON';
  legacyPaymentType?: number;
  legacyUseExistingPaymentMethod: boolean;
}): Promise<PreparePaymentResult> => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<PaymentRow>('SELECT * FROM checkout_payments WHERE order_id = $1', [input.orderId]);
  const existing = rows[0];
  if (existing) {
    const payment = toPreparation(existing);
    if (!payment.status) return { kind: 'recovery-required', payment };
    if (payment.amountMinor !== input.amountMinor || payment.currency !== input.currency)
      throw new Error('The existing Payment does not match the immutable Order payment preparation.');
    return { kind: 'existing', payment };
  }
  const payment: PaymentPreparation = {
    paymentId: `pay-${randomUUID()}`,
    orderId: input.orderId,
    status: 'PENDING',
    amountMinor: input.amountMinor,
    currency: input.currency,
  };
  const timestamp = new Date().toISOString();
  await database.execute(
    `INSERT INTO checkout_payments (id, order_id, payload_json, created_at, status, amount_minor, currency, payment_type, use_existing_payment_method, updated_at) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9)`,
    [
      payment.paymentId,
      input.orderId,
      JSON.stringify(payment),
      timestamp,
      input.amountMinor,
      input.currency,
      input.legacyPaymentType ?? null,
      input.legacyUseExistingPaymentMethod,
      timestamp,
    ],
  );
  return { kind: 'prepared', payment };
};

const continuePayment = async (input: { paymentId: string }): Promise<ContinuePaymentResult> => {
  assertOutsideCheckoutTransaction('Payment continuation');
  const payment = await getPaymentRow(input.paymentId);
  if (!payment) throw new Error('The prepared Payment was not found.');
  if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
    return { kind: 'failed', providerReference: null };
  }
  if (
    payment.status !== 'PENDING' ||
    payment.stripe_payment_intent_id !== null ||
    payment.stripe_payment_intent_create_started_at !== null ||
    payment.cancellation_requested_at !== null
  )
    return { kind: 'recovery-required' };
  return { kind: 'succeeded', nextAction: { type: 'none' }, providerReference: null };
};

const completePayment = async (input: { paymentId: string; providerReference: string | null }): Promise<CompletePaymentResult> => {
  const database = await getCheckoutDatabase();
  const updated = await database.execute(
    `UPDATE checkout_payments SET status = 'PAID', provider_reference = $1, updated_at = $2
      WHERE id = $3 AND status = 'PENDING'
        AND stripe_payment_intent_id IS NULL
        AND stripe_payment_intent_create_started_at IS NULL
        AND cancellation_requested_at IS NULL`,
    [input.providerReference, new Date().toISOString(), input.paymentId],
  );
  const payment = await getPaymentPreparation(input.paymentId);
  if (!payment) return { kind: 'not-found' };
  if (!payment.status) return { kind: 'recovery-required', payment };
  if (!updated && payment.status !== 'PAID') return { kind: 'failed', payment };
  return { kind: 'paid', payment };
};

const failPayment = async (input: { paymentId: string; providerReference: string | null }): Promise<FailPaymentResult> => {
  const database = await getCheckoutDatabase();
  const updated = await database.execute(
    `UPDATE checkout_payments SET status = 'FAILED', provider_reference = $1, updated_at = $2
      WHERE id = $3 AND status = 'PENDING'
        AND stripe_payment_intent_id IS NULL
        AND stripe_payment_intent_create_started_at IS NULL
        AND cancellation_requested_at IS NULL`,
    [input.providerReference, new Date().toISOString(), input.paymentId],
  );
  if (updated) return { kind: 'failed' };
  const payment = await getPaymentPreparation(input.paymentId);
  return payment?.status === 'FAILED' ? { kind: 'failed' } : { kind: 'recovery-required' };
};

export const payments = {
  preparePayment,
  getPaymentPreparation,
  getPaymentPreparationForUpdate,
  continuePayment,
  completePayment,
  failPayment,
};
