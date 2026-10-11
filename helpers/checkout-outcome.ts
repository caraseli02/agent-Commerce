import { PaymentTypeEnum } from '~~/types';
import type { PlaceOrderInterface } from '~~/types/order';

import type { CheckoutFailure } from '~~/types/order/checkout-error';
export type { CheckoutFailure } from '~~/types/order/checkout-error';

export type CheckoutOutcome =
  | { kind: 'success'; destination: 'checkout-success' | 'order-summary'; orderId: string }
  | { kind: 'session'; orderId?: string; clientSecret?: string }
  | { kind: 'fail'; error: CheckoutFailure }
  | { kind: 'redirect'; url: string }
  | { kind: 'noop' };

const isValidOrderId = (orderId: string | undefined | null): orderId is string => typeof orderId === 'string' && orderId.trim().length > 0;

/**
 * Maps a placed-order API response to a checkout outcome.
 * Mock mode always short-circuits to checkout success; live mode interprets
 * payment type and Stripe result status without router side effects.
 */
export function resolveCheckoutOutcome(
  response: PlaceOrderInterface,
  orderId: string,
  paymentType: PaymentTypeEnum,
  options: { mockMode: boolean },
): CheckoutOutcome {
  if (!isValidOrderId(orderId)) {
    return {
      kind: 'fail',
      error: {
        message: 'Checkout completed without a valid order ID. Please try again.',
        type: 'invalid_order_id',
        code: 'missing_order_id',
      },
    };
  }

  if (response.data.paymentSession === true) {
    return { kind: 'session', orderId };
  }

  if (options.mockMode) {
    return { kind: 'success', destination: 'checkout-success', orderId };
  }

  if (paymentType === PaymentTypeEnum.Card) {
    const result = response.data.result;

    if (!result) {
      return {
        kind: 'session',
        orderId,
        clientSecret: response.data.clientSecret,
      };
    }

    switch (result.status) {
      case 'succeeded':
        return { kind: 'success', destination: 'order-summary', orderId };
      case 'canceled':
        return {
          kind: 'fail',
          error: {
            message: 'Payment was canceled. Please try again.',
            type: 'payment_canceled',
            code: 'canceled',
          },
        };
      case 'requires_action': {
        const url = result.next_action?.redirect_to_url?.url;
        return url ? { kind: 'redirect', url } : { kind: 'noop' };
      }
      case 'requires_payment_method':
        return { kind: 'session' };
      default:
        return { kind: 'success', destination: 'order-summary', orderId };
    }
  }

  if (paymentType === PaymentTypeEnum.Credit || paymentType === PaymentTypeEnum.Bank || paymentType === PaymentTypeEnum.Cash) {
    return { kind: 'success', destination: 'order-summary', orderId };
  }

  return {
    kind: 'fail',
    error: {
      message: 'Unsupported payment method. Please try again.',
      type: 'unsupported_payment_type',
      code: 'unsupported_payment_type',
    },
  };
}
