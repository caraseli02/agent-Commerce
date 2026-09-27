import { stripePayments, stripePaymentsEnabled } from '~/server/application/checkout/stripe-payment';
import { finalizePaidCheckout } from '~/server/application/checkout/finalize-paid-checkout';
import { handleStripeWebhook } from '~/server/domain/payments';

export default defineEventHandler(async (event) => {
  const result = await handleStripeWebhook({
    rawBody: await readRawBody(event, false),
    signature: getHeader(event, 'stripe-signature'),
    signingSecret: process.env.STRIPE_WEBHOOK_SECRET,
    enabled: stripePaymentsEnabled(),
    applyVerifiedIntentEvent: stripePayments.applyVerifiedIntentEvent,
    finalizePaidCheckout,
  });

  if (result.kind !== 'accepted')
    throw createError({
      statusCode: result.kind === 'invalid-signature' ? 400 : 503,
      statusMessage: result.kind === 'invalid-signature' ? 'Invalid Stripe signature' : 'Stripe webhook processing incomplete',
    });
  return { received: true };
});
