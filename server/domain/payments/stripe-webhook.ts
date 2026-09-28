import Stripe from 'stripe';
import { isSupportedStripeIntentEvent, type VerifiedIntentEventResult } from './stripe-intents';

export type StripeWebhookResult = Readonly<{ kind: 'accepted' | 'retry' | 'invalid-signature' }>;

export const handleStripeWebhook = async (input: {
  rawBody: Buffer | undefined;
  signature: string | undefined;
  signingSecret: string | undefined;
  enabled: boolean;
  applyVerifiedIntentEvent: (event: { eventId: string; eventType: string; intentId: string }) => Promise<VerifiedIntentEventResult>;
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

  // Refund delivery belongs to #558; never silently acknowledge it in this slice.
  if (event.type.startsWith('refund.')) return { kind: 'retry' };
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
