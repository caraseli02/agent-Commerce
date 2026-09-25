import Stripe from 'stripe';
import type { StripeIntentProvider, StripePaymentIntent } from './stripe-intents';

const toIntent = (intent: Stripe.PaymentIntent): StripePaymentIntent => ({
  id: intent.id,
  amountMinor: intent.amount,
  currency: intent.currency,
  status: intent.status,
  clientSecret: intent.client_secret,
  metadata: { paymentId: intent.metadata.paymentId, orderId: intent.metadata.orderId },
});

export const createStripeIntentProvider = (): StripeIntentProvider => {
  let client: Stripe | null = null;
  const stripe = () => {
    if (client) return client;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || (!key.startsWith('rk_test_') && !key.startsWith('sk_test_')))
      throw new Error('A Stripe sandbox API key is required for the payment adapter.');
    client = new Stripe(key);
    return client;
  };

  return {
    async create(input, idempotencyKey) {
      const intent = await stripe().paymentIntents.create(
        {
          amount: input.amountMinor,
          currency: input.currency.toLowerCase(),
          allowed_payment_method_types: ['card'],
          metadata: { paymentId: input.paymentId, orderId: input.orderId },
        },
        { idempotencyKey },
      );
      return toIntent(intent);
    },
    async retrieve(intentId) {
      return toIntent(await stripe().paymentIntents.retrieve(intentId, {}, { timeout: 10_000, maxNetworkRetries: 0 }));
    },
    async cancel(intentId, reason) {
      return toIntent(
        await stripe().paymentIntents.cancel(
          intentId,
          { cancellation_reason: reason },
          { idempotencyKey: `payment:${intentId}:cancel:${reason}` },
        ),
      );
    },
  };
};
