import { createStripeIntentAdapter } from '~/server/domain/payments';
import { createStripeIntentProvider } from '~/server/domain/payments/stripe-provider';
import { markPaymentClaimRecoveryRequired } from './payment-recovery';

// #559 owns enabling this gate only after every unsafe shared-DB mock writer is isolated.
export const stripePaymentsEnabled = () => process.env.PAYMENTS_PROVIDER === 'stripe' && process.env.STRIPE_GATE_A_APPROVED === 'true';
export const stripePayments = createStripeIntentAdapter({
  provider: createStripeIntentProvider(),
  enabled: stripePaymentsEnabled,
  onRecoveryRequired: markPaymentClaimRecoveryRequired,
});
