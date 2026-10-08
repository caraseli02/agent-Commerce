// Payments owns the local financial fact. Refund is a separate fact, never a Payment status.
export const paymentStatuses = ['PENDING', 'PROCESSING', 'PAID', 'CANCELED'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];
export type PersistedPaymentStatus = PaymentStatus | 'FAILED';

export const parsePaymentStatus = (value: unknown): PaymentStatus | null =>
  typeof value === 'string' && paymentStatuses.some((status) => status === value) ? (value as PaymentStatus) : null;
export const parsePersistedPaymentStatus = (value: unknown): PersistedPaymentStatus | null =>
  value === 'FAILED' ? value : parsePaymentStatus(value);

export const refundStatuses = ['PENDING', 'SUCCEEDED', 'FAILED'] as const;
export type RefundStatus = (typeof refundStatuses)[number];
export const refundReasons = ['requested_by_customer', 'duplicate', 'fraudulent'] as const;
export type RefundReason = (typeof refundReasons)[number];
