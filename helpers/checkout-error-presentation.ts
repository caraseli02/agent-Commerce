import { checkoutHttpErrors, parseCheckoutErrorCode, type CheckoutErrorCode } from '~/types/order/checkout-error';

export type CheckoutFailurePresentation = Readonly<{
  title: string;
  message: string;
  action: string;
  reviewRequired: boolean;
  cancelOnLeave: boolean;
}>;
const paymentFailure: CheckoutFailurePresentation = {
  title: 'Payment failed',
  message: 'Unable to complete checkout. Please try again.',
  action: 'Try again',
  reviewRequired: false,
  cancelOnLeave: true,
};
const unknownFailure: CheckoutFailurePresentation = { ...paymentFailure, cancelOnLeave: false };
const reviewRequired: CheckoutFailurePresentation = {
  title: 'Checkout needs review',
  message: 'Return to the order summary to review your cart and checkout details.',
  action: 'Review updated cart',
  reviewRequired: true,
  cancelOnLeave: true,
};
const cartChanged: CheckoutFailurePresentation = {
  ...reviewRequired,
  title: 'Your cart changed',
  message: 'Your cart changed after you reviewed this order. Review the updated items and total before placing your order.',
};
const quoteChanged: CheckoutFailurePresentation = {
  ...reviewRequired,
  title: 'Your checkout price changed',
  message: 'Pricing changed after you reviewed this order. Review the updated items and total before placing your order.',
};
const recoveryRequired: CheckoutFailurePresentation = {
  ...paymentFailure,
  message: 'This checkout requires review before payment can continue.',
};

export const checkoutErrorPresentation = {
  cart_required: paymentFailure,
  cart_owner_required: paymentFailure,
  cart_not_found: paymentFailure,
  cart_forbidden: paymentFailure,
  cart_changed: cartChanged,
  quote_changed: quoteChanged,
  quote_cart_mismatch: quoteChanged,
  stale_cart: reviewRequired,
  cart_empty: {
    ...reviewRequired,
    title: 'Your cart is empty',
    message: 'An empty cart cannot be checked out. Add items before reviewing a new order.',
    action: 'Review cart',
  },
  checkout_already_started: reviewRequired,
  idempotency_conflict: reviewRequired,
  order_idempotency_conflict: paymentFailure,
  product_unavailable: reviewRequired,
  delivery_unavailable: paymentFailure,
  reservation_conflict: paymentFailure,
  inventory_unavailable: reviewRequired,
  checkout_repair_required: recoveryRequired,
  order_recovery_required: recoveryRequired,
  inventory_recovery_required: recoveryRequired,
  payment_recovery_required: recoveryRequired,
  payment_failed: paymentFailure,
  checkout_not_payable: recoveryRequired,
  checkout_not_canceled: recoveryRequired,
  cart_recovery_required: recoveryRequired,
  stripe_payments_disabled: { ...paymentFailure, message: checkoutHttpErrors.stripe_payments_disabled.statusMessage },
  missing_order_id: { ...paymentFailure, message: 'Checkout completed without a valid order ID. Please try again.' },
  canceled: { ...paymentFailure, message: 'Payment was canceled. Please try again.' },
  unsupported_payment_type: { ...paymentFailure, message: 'Unsupported payment method. Please try again.' },
  card_declined: { ...paymentFailure, message: 'Card was declined. Please review your payment method.' },
  checkout_failed: paymentFailure,
  checkout_exception: unknownFailure,
  unknown_error: unknownFailure,
} satisfies Record<CheckoutErrorCode, CheckoutFailurePresentation>;

// Parse again here: browser persistence and older server versions are untrusted.
export const checkoutFailurePresentation = (
  failure: { code?: unknown; message?: unknown } | null | undefined,
): CheckoutFailurePresentation => {
  const code = parseCheckoutErrorCode(failure?.code);
  return code ? checkoutErrorPresentation[code] : unknownFailure;
};
