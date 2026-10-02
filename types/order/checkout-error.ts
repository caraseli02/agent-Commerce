// Public checkout codes are shared by HTTP producers and browser recovery policy.
// Provider result statuses and database diagnostics belong to their own boundaries.
export const checkoutErrorCodes = [
  'cart_required',
  'cart_owner_required',
  'cart_not_found',
  'cart_forbidden',
  'cart_changed',
  'quote_changed',
  'quote_cart_mismatch',
  'stale_cart',
  'cart_empty',
  'checkout_already_started',
  'idempotency_conflict',
  'order_idempotency_conflict',
  'product_unavailable',
  'delivery_unavailable',
  'reservation_conflict',
  'inventory_unavailable',
  'checkout_repair_required',
  'order_recovery_required',
  'inventory_recovery_required',
  'payment_recovery_required',
  'payment_failed',
  'checkout_not_payable',
  'checkout_not_canceled',
  'cart_recovery_required',
  'stripe_payments_disabled',
  'missing_order_id',
  'canceled',
  'unsupported_payment_type',
  'card_declined',
  'checkout_failed',
  'checkout_exception',
  'unknown_error',
] as const;
export type CheckoutErrorCode = (typeof checkoutErrorCodes)[number];
export const parseCheckoutErrorCode = (value: unknown): CheckoutErrorCode | null =>
  typeof value === 'string' && checkoutErrorCodes.some((code) => code === value) ? (value as CheckoutErrorCode) : null;
export const checkoutErrorData = (code: CheckoutErrorCode): { code: CheckoutErrorCode } => ({ code });

export type CheckoutFailure = {
  message?: string;
  type?: string;
  code?: CheckoutErrorCode;
  /** Unrecognized transport/provider diagnostics are retained without selecting a recovery policy. */
  diagnosticCode?: string;
};
