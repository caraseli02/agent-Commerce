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
  'payment_method_unavailable',
  'card_declined',
  'checkout_failed',
  'checkout_exception',
  'unknown_error',
] as const;
export type CheckoutErrorCode = (typeof checkoutErrorCodes)[number];
export const parseCheckoutErrorCode = (value: unknown): CheckoutErrorCode | null =>
  typeof value === 'string' && checkoutErrorCodes.some((code) => code === value) ? (value as CheckoutErrorCode) : null;
export const checkoutErrorData = (code: CheckoutErrorCode): { code: CheckoutErrorCode } => ({ code });

// Public HTTP copy belongs to this contract; routes select a response by code.
// UI recovery copy can differ, but identical wording should reuse this owner.
export const checkoutHttpErrors = {
  payment_method_unavailable: {
    statusCode: 422,
    statusMessage: 'This payment method is temporarily unavailable. Select a card to continue.',
  },
  stripe_payments_disabled: { statusCode: 503, statusMessage: 'Stripe payments are unavailable.' },
  checkout_not_payable: { statusCode: 409, statusMessage: 'This order cannot accept another payment.' },
  inventory_unavailable: { statusCode: 409, statusMessage: 'The order is no longer available for payment.' },
  payment_recovery_required: { statusCode: 409, statusMessage: 'Payment recovery requires review.' },
  checkout_not_canceled: { statusCode: 409, statusMessage: 'This checkout has not been canceled.' },
  cart_empty: { statusCode: 409, statusMessage: 'The cart is empty. Add items before reviewing a new order.' },
  cart_recovery_required: { statusCode: 409, statusMessage: 'The cart could not be prepared for review.' },
  cart_changed: {
    statusCode: 409,
    statusMessage:
      'Your cart review is no longer current. Return to the order summary to review the latest items and total before placing your order.',
  },
} as const satisfies Partial<Record<CheckoutErrorCode, { statusCode: number; statusMessage: string }>>;

export const checkoutErrorResponse = (code: keyof typeof checkoutHttpErrors) => ({
  ...checkoutHttpErrors[code],
  data: checkoutErrorData(code),
});

export type CheckoutFailure = {
  message?: string;
  type?: string;
  code?: CheckoutErrorCode;
  /** Unrecognized transport/provider diagnostics are retained without selecting a recovery policy. */
  diagnosticCode?: string;
};
