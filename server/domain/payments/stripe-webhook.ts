import Stripe from 'stripe';
import { isStripeEnvironment, type StripeEnvironment } from './stripe-environment';
import { isSupportedStripeRefundEvent, type StripeRefund, type VerifiedRefundEventResult } from './stripe-refunds';
import { isSupportedStripeIntentEvent, type VerifiedIntentEventResult } from './stripe-intents';

export type StripeWebhookResult = Readonly<{ kind: 'accepted' | 'retry' | 'invalid-signature' }>;

export const handleStripeWebhook = async (input: {
  rawBody: Buffer | undefined;
  signature: string | undefined;
  signingSecret: string | undefined;
  enabled: boolean;
  environment?: StripeEnvironment;
  applyVerifiedIntentEvent: (event: { eventId: string; eventType: string; intentId: string }) => Promise<VerifiedIntentEventResult>;
  applyVerifiedRefundEvent?: (event: { eventId: string; eventType: string; refund: StripeRefund }) => Promise<VerifiedRefundEventResult>;
  finalizePaidCheckout?: (input: { paymentId: string; orderId: string }) => Promise<{ kind: 'finalized' | 'retry' }>;
  terminalizeCanceledCheckout?: (input: { paymentId: string; orderId: string }) => Promise<{ kind: 'terminalized' | 'retry' }>;
}): Promise<StripeWebhookResult> => {
  if (!input.enabled || !input.signingSecret) return { kind: 'retry' };
  if (!input.rawBody || !input.signature) return { kind: 'invalid-signature' };

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(input.rawBody, input.signature, input.signingSecret);
  } catch {
    return { kind: 'invalid-signature' };
  }

  const routedObject = event.data.object;
  if (input.environment && (routedObject.object === 'payment_intent' || routedObject.object === 'refund')) {
    const environment = routedObject.metadata?.agentCommerceEnvironment;
    // Untagged historical/manual objects keep the existing conservative path.
    // Only a verified, recognized foreign environment can be acknowledged here.
    if (environment !== undefined) {
      if (!isStripeEnvironment(environment)) return { kind: 'retry' };
      if (environment !== input.environment) return { kind: 'accepted' };
    }
  }

  if (event.type.startsWith('refund.')) {
    if (!isSupportedStripeRefundEvent(event.type) || !input.applyVerifiedRefundEvent) return { kind: 'retry' };
    const object = event.data.object;
    if (object.object !== 'refund') return { kind: 'retry' };
    try {
      const result = await input.applyVerifiedRefundEvent({
        eventId: event.id,
        eventType: event.type,
        refund: {
          id: object.id,
          paymentIntentId: typeof object.payment_intent === 'string' ? object.payment_intent : (object.payment_intent?.id ?? null),
          amountMinor: object.amount,
          currency: object.currency,
          status: object.status ?? null,
          metadata: { refundId: object.metadata?.refundId, paymentId: object.metadata?.paymentId, orderId: object.metadata?.orderId },
        },
      });
      return result.kind === 'recovery-required' ? { kind: 'retry' } : { kind: 'accepted' };
    } catch {
      return { kind: 'retry' };
    }
  }
  if (!isSupportedStripeIntentEvent(event.type)) return { kind: 'accepted' };

  const object = event.data.object;
  if (object.object !== 'payment_intent' || !object.id.startsWith('pi_')) return { kind: 'retry' };

  const result = await input.applyVerifiedIntentEvent({ eventId: event.id, eventType: event.type, intentId: object.id });
  if (result.kind === 'paid' && input.finalizePaidCheckout) {
    try {
      const finalization = await input.finalizePaidCheckout({ paymentId: result.paymentId, orderId: result.orderId });
      return finalization.kind === 'finalized' ? { kind: 'accepted' } : { kind: 'retry' };
    } catch {
      return { kind: 'retry' };
    }
  }
  if (result.kind === 'canceled' && input.terminalizeCanceledCheckout) {
    try {
      const terminalization = await input.terminalizeCanceledCheckout({ paymentId: result.paymentId, orderId: result.orderId });
      return terminalization.kind === 'terminalized' ? { kind: 'accepted' } : { kind: 'retry' };
    } catch {
      return { kind: 'retry' };
    }
  }
  if (
    (event.type === 'payment_intent.processing' || event.type === 'payment_intent.payment_failed') &&
    (result.kind === 'pending' || result.kind === 'processing')
  )
    return { kind: 'accepted' };
  return { kind: 'retry' };
};
