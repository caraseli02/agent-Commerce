import { randomUUID } from 'node:crypto';
import { PaymentStatusEnum, PaymentTypeEnum } from '~/types/order-summary/item';

export type EnsurePaymentResult = Readonly<{
  kind: 'succeeded';
  paymentId: string;
  status: PaymentStatusEnum.Paid;
  useExistingPaymentMethod: boolean;
  clientSecret?: undefined;
  result?: {
    status: 'succeeded';
  };
}>;

const paymentsByOrder = new Map<string, EnsurePaymentResult>();

const ensurePayment = async (input: {
  orderId: string;
  paymentType?: number;
  useExistingPaymentMethod: boolean;
}): Promise<EnsurePaymentResult> => {
  const existing = paymentsByOrder.get(input.orderId);

  if (existing) {
    return existing;
  }

  const result: EnsurePaymentResult = {
    kind: 'succeeded',
    paymentId: `pay-${randomUUID()}`,
    status: PaymentStatusEnum.Paid,
    useExistingPaymentMethod: input.useExistingPaymentMethod,
    clientSecret: undefined,
    result: input.paymentType === PaymentTypeEnum.Card ? { status: 'succeeded' } : undefined,
  };

  paymentsByOrder.set(input.orderId, result);
  return result;
};

export const payments = {
  ensurePayment,
};
