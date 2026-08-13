import { describe, expect, it } from 'vitest';
import { PaymentTypeEnum } from '../types';
import { resolveCheckoutOutcome } from '../helpers/checkout-outcome';
import type { PlaceOrderInterface } from '../types/order';

const baseResponse = (overrides: Partial<PlaceOrderInterface['data']> = {}): PlaceOrderInterface => ({
  status: 'success',
  data: {
    orderId: 'ord-1',
    useExistingPaymentMethod: false,
    status: 0,
    ...overrides,
  },
});

describe('resolveCheckoutOutcome', () => {
  it('returns checkout-success for mock mode regardless of payment type', () => {
    const outcome = resolveCheckoutOutcome(baseResponse(), 'ord-1', PaymentTypeEnum.Card, { mockMode: true });

    expect(outcome).toEqual({ kind: 'success', destination: 'checkout-success', orderId: 'ord-1' });
  });

  it('returns session when live card payment has no Stripe result', () => {
    const outcome = resolveCheckoutOutcome(baseResponse({ clientSecret: 'sec_test', result: undefined }), 'ord-2', PaymentTypeEnum.Card, {
      mockMode: false,
    });

    expect(outcome).toEqual({ kind: 'session', orderId: 'ord-2', clientSecret: 'sec_test' });
  });

  it('returns order-summary success for live card payment that succeeded', () => {
    const outcome = resolveCheckoutOutcome(baseResponse({ result: { status: 'succeeded' } }), 'ord-3', PaymentTypeEnum.Card, {
      mockMode: false,
    });

    expect(outcome).toEqual({ kind: 'success', destination: 'order-summary', orderId: 'ord-3' });
  });

  it('returns fail for live card payment that was canceled', () => {
    const outcome = resolveCheckoutOutcome(baseResponse({ result: { status: 'canceled' } }), 'ord-4', PaymentTypeEnum.Card, {
      mockMode: false,
    });

    expect(outcome).toMatchObject({
      kind: 'fail',
      error: {
        message: 'Payment was canceled. Please try again.',
        type: 'payment_canceled',
        code: 'canceled',
      },
    });
  });

  it('returns session when live card payment requires a new payment method', () => {
    const outcome = resolveCheckoutOutcome(baseResponse({ result: { status: 'requires_payment_method' } }), 'ord-5', PaymentTypeEnum.Card, {
      mockMode: false,
    });

    expect(outcome).toEqual({ kind: 'session' });
  });

  it('returns redirect when live card payment requires action with a URL', () => {
    const outcome = resolveCheckoutOutcome(
      baseResponse({
        result: {
          status: 'requires_action',
          next_action: { redirect_to_url: { url: 'https://stripe.test/redirect' } },
        },
      }),
      'ord-6',
      PaymentTypeEnum.Card,
      { mockMode: false },
    );

    expect(outcome).toEqual({ kind: 'redirect', url: 'https://stripe.test/redirect' });
  });

  it('returns order-summary success for non-card live payment types', () => {
    const outcome = resolveCheckoutOutcome(baseResponse(), 'ord-7', PaymentTypeEnum.Cash, { mockMode: false });

    expect(outcome).toEqual({ kind: 'success', destination: 'order-summary', orderId: 'ord-7' });
  });

  it('returns fail for unsupported live payment types', () => {
    const outcome = resolveCheckoutOutcome(baseResponse(), 'ord-8', 99 as PaymentTypeEnum, { mockMode: false });

    expect(outcome).toMatchObject({
      kind: 'fail',
      error: {
        message: 'Unsupported payment method. Please try again.',
        type: 'unsupported_payment_type',
        code: 'unsupported_payment_type',
      },
    });
  });

  it('returns fail when orderId is missing or empty', () => {
    const outcome = resolveCheckoutOutcome(baseResponse(), '   ', PaymentTypeEnum.Cash, { mockMode: false });

    expect(outcome).toMatchObject({
      kind: 'fail',
      error: {
        message: 'Checkout completed without a valid order ID. Please try again.',
        type: 'invalid_order_id',
        code: 'missing_order_id',
      },
    });
  });
});
