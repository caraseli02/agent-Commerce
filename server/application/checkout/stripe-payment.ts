import { createStripeIntentAdapter, createStripeRefundAdapter } from '~~/server/domain/payments';
import { createStripeIntentProvider, createStripeRefundProvider } from '~~/server/domain/payments/stripe-provider';
import { markPaymentClaimRecoveryRequired } from './payment-recovery';
import { withRefundCompensation } from './with-refund-compensation';
import { settleRefundCompensation } from './settle-refund-compensation';
import { requireRefundCompensationRecovery } from './require-refund-compensation-recovery';

// #559 owns enabling this gate only after every unsafe shared-DB mock writer is isolated.
export const stripePaymentsEnabled = () => process.env.PAYMENTS_PROVIDER === 'stripe' && process.env.STRIPE_GATE_A_APPROVED === 'true';
export const stripePayments = createStripeIntentAdapter({
  provider: createStripeIntentProvider(),
  enabled: stripePaymentsEnabled,
  onRecoveryRequired: markPaymentClaimRecoveryRequired,
});

export const stripeRefunds = createStripeRefundAdapter({
  provider: createStripeRefundProvider(),
  enabled: stripePaymentsEnabled,
  withRefundCompensation,
  onSucceeded: settleRefundCompensation,
  onRecoveryRequired: requireRefundCompensationRecovery,
});
