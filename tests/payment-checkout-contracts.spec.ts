import { describe, expect, it } from 'vitest';
import { parsePaymentStatus, parsePersistedPaymentStatus } from '~/server/domain/payments/contracts';
import { parseCheckoutWorkflowStatus, parsePaidRecoveryDecision } from '~/server/application/checkout/contracts';
import { checkoutErrorResponse, parseCheckoutErrorCode } from '~/types/order/checkout-error';
import { checkoutFailurePresentation } from '~/helpers/checkout-error-presentation';
import { getPaymentStatusById, PaymentStatusEnum } from '~/types/order-summary/item';

describe('Payment and checkout boundary contracts', () => {
  it.each(['PENDING', 'PROCESSING', 'PAID', 'CANCELED'])('retains persisted Payment %s', (status) => {
    expect(parsePaymentStatus(status)).toBe(status);
    expect(parsePersistedPaymentStatus(status)).toBe(status);
  });
  it('keeps legacy FAILED out of the target Payment model but accepts existing storage', () => {
    expect(parsePaymentStatus('FAILED')).toBeNull();
    expect(parsePersistedPaymentStatus('FAILED')).toBe('FAILED');
  });
  it.each([null, undefined, 1, {}, [], 'paid', 'REFUNDED', ' PAID ', '__proto__'])('rejects unknown Payment input %j', (value) => {
    expect(parsePersistedPaymentStatus(value)).toBeNull();
  });
  it.each([
    'prepared',
    'payment_pending',
    'finalized',
    'recovery_required',
    'canceled',
    'compensation_pending',
    'compensation_recovery_required',
  ])('retains workflow %s', (value) => expect(parseCheckoutWorkflowStatus(value)).toBe(value));
  it.each(['ALLOCATE', 'BACKORDER', 'REFUND'])('retains paid recovery decision %s', (value) => {
    expect(parsePaidRecoveryDecision(value)).toBe(value);
  });
  it('distinguishes absent decisions from corrupt or missing persisted values', () => {
    expect(parsePaidRecoveryDecision(null)).toBeNull();
    for (const value of [undefined, 'unknown', '', 1, {}, '__proto__']) expect(parsePaidRecoveryDecision(value)).toBeUndefined();
    for (const value of [undefined, null, 1, {}, 'paid', 'unknown']) expect(parseCheckoutWorkflowStatus(value)).toBeNull();
  });
});

describe('Public error and presentation contracts', () => {
  it.each([
    ['checkout_not_canceled', 'This checkout has not been canceled.'],
    ['cart_empty', 'The cart is empty. Add items before reviewing a new order.'],
    ['cart_recovery_required', 'The cart could not be prepared for review.'],
    [
      'cart_changed',
      'Your cart review is no longer current. Return to the order summary to review the latest items and total before placing your order.',
    ],
  ] as const)('preserves the existing %s HTTP response when moving copy into its owner', (code, statusMessage) => {
    expect(checkoutErrorResponse(code)).toEqual({ statusCode: 409, statusMessage, data: { code } });
  });
  it('shares the unavailable-payment wording with its UI consumer', () => {
    expect(checkoutFailurePresentation({ code: 'stripe_payments_disabled' }).message).toBe(
      checkoutErrorResponse('stripe_payments_disabled').statusMessage,
    );
  });
  it('uses stable codes for recovery independently of diagnostic copy', () => {
    expect(parseCheckoutErrorCode('cart_changed')).toBe('cart_changed');
    expect(checkoutFailurePresentation({ code: 'cart_changed', message: 'Different diagnostic text' })).toMatchObject({
      title: 'Your cart changed',
      action: 'Review updated cart',
      reviewRequired: true,
    });
    expect(checkoutFailurePresentation({ code: 'quote_changed' }).title).toBe('Your checkout price changed');
    expect(checkoutFailurePresentation({ code: 'cart_empty' }).action).toBe('Review cart');
  });
  it.each([
    'checkout_repair_required',
    'order_recovery_required',
    'inventory_recovery_required',
    'payment_recovery_required',
    'checkout_not_payable',
    'checkout_not_canceled',
    'cart_recovery_required',
  ])('presents %s as review rather than retry', (code) => {
    expect(checkoutFailurePresentation({ code })).toMatchObject({
      title: 'Checkout needs review',
      action: 'Review checkout',
      reviewRequired: true,
      cancelOnLeave: true,
    });
  });
  it.each(['invented_error', '__proto__', 'toString', '', null, 1, {}])('handles unknown error %j with safe copy', (code) => {
    expect(parseCheckoutErrorCode(code)).toBeNull();
    expect(checkoutFailurePresentation({ code, message: 'Internal provider secret or corrupt payload' })).toMatchObject({
      title: 'Payment failed',
      message: 'Unable to complete checkout. Please try again.',
      reviewRequired: false,
      cancelOnLeave: false,
    });
  });
  it('maps numeric legacy payment display states explicitly without changing their values', () => {
    expect([
      PaymentStatusEnum.Pending,
      PaymentStatusEnum.Paid,
      PaymentStatusEnum.Canceled,
      PaymentStatusEnum.Declined,
      PaymentStatusEnum.Failed,
      PaymentStatusEnum.Refunding,
      PaymentStatusEnum.Refunded,
    ]).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([0, 1, 2, 3, 4, 5, 6].map(getPaymentStatusById)).toEqual([
      'Pending',
      'Paid',
      'Canceled',
      'Declined',
      'Failed',
      'Refunding',
      'Refunded',
    ]);
    expect(getPaymentStatusById(99)).toBeNull();
    for (const value of ['1', [1], { toString: () => '1' }, null, undefined, NaN]) expect(getPaymentStatusById(value)).toBeNull();
  });
});
