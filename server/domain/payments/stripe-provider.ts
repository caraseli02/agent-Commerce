import Stripe from 'stripe';
import type { StripeIntentProvider, StripePaymentIntent } from './stripe-intents';
import type { StripeRefundProvider, StripeRefund } from './stripe-refunds';

const toIntent = (intent: Stripe.PaymentIntent): StripePaymentIntent => ({
  id: intent.id,
  amountMinor: intent.amount,
  currency: intent.currency,
  status: intent.status,
  clientSecret: intent.client_secret,
  metadata: { paymentId: intent.metadata.paymentId, orderId: intent.metadata.orderId },
});

const sandboxClient = () => {
  let client: Stripe | null = null;
  const stripe = () => {
    if (client) return client;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || (!key.startsWith('rk_test_') && !key.startsWith('sk_test_')))
      throw new Error('A Stripe sandbox API key is required for the payment adapter.');
    client = new Stripe(key);
    return client;
  };

  return stripe;
};

export const createStripeIntentProvider = (): StripeIntentProvider => {
  const stripe = sandboxClient();

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

const toRefund = (refund: Stripe.Refund): StripeRefund => ({
  id: refund.id,
  paymentIntentId: typeof refund.payment_intent === 'string' ? refund.payment_intent : (refund.payment_intent?.id ?? null),
  amountMinor: refund.amount,
  currency: refund.currency,
  status: refund.status ?? null,
  metadata: { refundId: refund.metadata?.refundId, paymentId: refund.metadata?.paymentId, orderId: refund.metadata?.orderId },
});

export const createStripeRefundProvider = (): StripeRefundProvider => {
  const stripe = sandboxClient();
  return {
    async create(input, idempotencyKey) {
      return toRefund(
        await stripe().refunds.create(
          {
            payment_intent: input.paymentIntentId,
            amount: input.amountMinor,
            reason: input.reason,
            metadata: { refundId: input.refundId, paymentId: input.paymentId, orderId: input.orderId },
          },
          { idempotencyKey, timeout: 10_000, maxNetworkRetries: 0 },
        ),
      );
    },
    async retrieve(refundId) {
      return toRefund(await stripe().refunds.retrieve(refundId, {}, { timeout: 10_000, maxNetworkRetries: 0 }));
    },
  };
};
