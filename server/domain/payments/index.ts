import { randomUUID } from 'node:crypto';
import { PaymentStatusEnum, PaymentTypeEnum } from '~/types/order-summary/item';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

export type PaymentNextAction =
  Readonly<{ type: 'none' }> | Readonly<{ type: 'client-secret'; clientSecret: string }> | Readonly<{ type: 'redirect'; url: string }>;

export type PaymentPreparation = Readonly<{
  paymentId: string;
  orderId: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  amountMinor: number;
  currency: 'RON';
  paymentType?: number;
  useExistingPaymentMethod: boolean;
  providerReference: string | null;
}>;
export type PreparePaymentResult = { kind: 'prepared' | 'existing'; payment: PaymentPreparation };
export type ContinuePaymentResult =
  | { kind: 'succeeded'; nextAction: PaymentNextAction; providerReference: string | null }
  | { kind: 'failed'; providerReference: string | null };
export type CompletePaymentResult =
  { kind: 'paid'; payment: PaymentPreparation } | { kind: 'failed' | 'not-found'; payment?: PaymentPreparation };

type PaymentRow = {
  id: string;
  order_id: string;
  status: PaymentPreparation['status'];
  amount_minor: number;
  currency: 'RON';
  payment_type: number | null;
  use_existing_payment_method: boolean;
  provider_reference: string | null;
};
const toPreparation = (row: PaymentRow): PaymentPreparation => ({
  paymentId: row.id,
  orderId: row.order_id,
  status: row.status,
  amountMinor: Number(row.amount_minor),
  currency: row.currency,
  paymentType: row.payment_type === null ? undefined : Number(row.payment_type),
  useExistingPaymentMethod: row.use_existing_payment_method,
  providerReference: row.provider_reference,
});

const getPaymentPreparation = async (paymentId: string) => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<PaymentRow>('SELECT * FROM checkout_payments WHERE id = $1', [paymentId]);
  return rows[0] ? toPreparation(rows[0]) : null;
};

const preparePayment = async (input: {
  orderId: string;
  amountMinor: number;
  currency: 'RON';
  paymentType?: number;
  useExistingPaymentMethod: boolean;
}): Promise<PreparePaymentResult> => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<PaymentRow>('SELECT * FROM checkout_payments WHERE order_id = $1', [input.orderId]);
  const existing = rows[0];
  if (existing) {
    const payment = toPreparation(existing);
    if (payment.amountMinor !== input.amountMinor || payment.currency !== input.currency || payment.paymentType !== input.paymentType)
      throw new Error('The existing Payment does not match the immutable Order payment preparation.');
    return { kind: 'existing', payment };
  }
  const payment: PaymentPreparation = {
    paymentId: `pay-${randomUUID()}`,
    orderId: input.orderId,
    status: 'PENDING',
    amountMinor: input.amountMinor,
    currency: input.currency,
    paymentType: input.paymentType,
    useExistingPaymentMethod: input.useExistingPaymentMethod,
    providerReference: null,
  };
  const timestamp = new Date().toISOString();
  await database.execute(
    `INSERT INTO checkout_payments (id, order_id, payload_json, created_at, status, amount_minor, currency, payment_type, use_existing_payment_method, provider_reference, updated_at) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, NULL, $9)`,
    [
      payment.paymentId,
      input.orderId,
      JSON.stringify(payment),
      timestamp,
      input.amountMinor,
      input.currency,
      input.paymentType ?? null,
      input.useExistingPaymentMethod,
      timestamp,
    ],
  );
  return { kind: 'prepared', payment };
};

const continuePayment = async (input: { paymentId: string }): Promise<ContinuePaymentResult> => {
  assertOutsideCheckoutTransaction('Payment continuation');
  const payment = await getPaymentPreparation(input.paymentId);
  if (!payment) throw new Error('The prepared Payment was not found.');
  if (payment.status === 'FAILED') {
    return { kind: 'failed', providerReference: payment.providerReference };
  }
  return { kind: 'succeeded', nextAction: { type: 'none' }, providerReference: payment.providerReference };
};

const completePayment = async (input: { paymentId: string; providerReference: string | null }): Promise<CompletePaymentResult> => {
  const database = await getCheckoutDatabase();
  const updated = await database.execute(
    `UPDATE checkout_payments SET status = 'PAID', provider_reference = $1, updated_at = $2 WHERE id = $3 AND status = 'PENDING'`,
    [input.providerReference, new Date().toISOString(), input.paymentId],
  );
  const payment = await getPaymentPreparation(input.paymentId);
  if (!payment) return { kind: 'not-found' };
  if (!updated && payment.status !== 'PAID') return { kind: 'failed', payment };
  return { kind: 'paid', payment };
};

const failPayment = async (input: { paymentId: string; providerReference: string | null }) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `UPDATE checkout_payments SET status = 'FAILED', provider_reference = $1, updated_at = $2 WHERE id = $3 AND status = 'PENDING'`,
    [input.providerReference, new Date().toISOString(), input.paymentId],
  );
};

export const toLegacyPaymentResult = (payment: PaymentPreparation) => ({
  orderId: payment.orderId,
  status: PaymentStatusEnum.Paid,
  useExistingPaymentMethod: payment.useExistingPaymentMethod,
  clientSecret: undefined,
  result: payment.paymentType === PaymentTypeEnum.Card ? { status: 'succeeded' as const } : undefined,
});
export const payments = { preparePayment, getPaymentPreparation, continuePayment, completePayment, failPayment };
