import { randomUUID } from 'node:crypto';
import { PaymentStatusEnum, PaymentTypeEnum } from '~/types/order-summary/item';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

export type EnsurePaymentResult = Readonly<{
  kind: 'succeeded';
  paymentId: string;
  status: PaymentStatusEnum.Paid;
  useExistingPaymentMethod: boolean;
  clientSecret?: undefined;
  result?: { status: 'succeeded' };
}>;

type PaymentRow = { id: string; payload_json: string };

const ensurePayment = async (input: {
  orderId: string;
  paymentType?: number;
  useExistingPaymentMethod: boolean;
}): Promise<EnsurePaymentResult> => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<PaymentRow>(`SELECT id, payload_json FROM checkout_payments WHERE order_id = ?`, [input.orderId]);
  if (rows[0]) return JSON.parse(rows[0].payload_json) as EnsurePaymentResult;

  const result: EnsurePaymentResult = {
    kind: 'succeeded',
    paymentId: `pay-${randomUUID()}`,
    status: PaymentStatusEnum.Paid,
    useExistingPaymentMethod: input.useExistingPaymentMethod,
    clientSecret: undefined,
    result: input.paymentType === PaymentTypeEnum.Card ? { status: 'succeeded' } : undefined,
  };

  await database.execute(`INSERT INTO checkout_payments (id, order_id, payload_json, created_at) VALUES (?, ?, ?, ?)`, [
    result.paymentId,
    input.orderId,
    JSON.stringify(result),
    new Date().toISOString(),
  ]);
  return result;
};

export const payments = { ensurePayment };
