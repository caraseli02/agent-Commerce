import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStripeIntentAdapter, handleStripeWebhook } from '~~/server/domain/payments';
import type { StripePaymentIntent } from '~~/server/domain/payments/stripe-intents';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';

const paymentId = 'pay-webhook-ingress';
const orderId = 'ord-webhook-ingress';
const intentId = 'pi_webhook_ingress';
const secret = 'whsec_webhook_ingress_test';
const timestamp = '2026-09-25T12:00:00.000Z';

const signedEvent = (type: string, eventId = 'evt_webhook_ingress') => {
  const rawBody = Buffer.from(
    JSON.stringify({ id: eventId, object: 'event', type, data: { object: { id: intentId, object: 'payment_intent' } } }),
  );
  return {
    rawBody,
    signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString('utf8'), secret }),
  };
};

const currentState = async () => {
  const database = await getCheckoutDatabase();
  const [payment] = await database.query<{ status: string }>('SELECT status FROM checkout_payments WHERE id=$1', [paymentId]);
  const events = await database.query<{ event_id: string }>('SELECT event_id FROM checkout_stripe_webhook_events ORDER BY event_id');
  return { status: payment?.status, events: events.map((row) => row.event_id) };
};

const adapter = (status: string) => {
  const retrieve = vi.fn(async (): Promise<StripePaymentIntent> => ({
    id: intentId,
    amountMinor: 1234,
    currency: 'RON',
    status,
    clientSecret: null,
    metadata: { paymentId, orderId },
  }));
  return {
    service: createStripeIntentAdapter({ enabled: () => true, provider: { retrieve, create: vi.fn(), cancel: vi.fn() } }),
    retrieve,
  };
};

describe('signed Stripe webhook ingress', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations CASCADE',
    );
    await database.execute(
      `INSERT INTO checkout_orders
        (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint,
         payload_json, created_at, updated_at, grand_total_minor, currency)
       VALUES ($1, 'owner-webhook', 'request-webhook', 'cart-webhook', 1, 'fingerprint-webhook', '{}', $2, $2, 1234, 'RON')`,
      [orderId, timestamp],
    );
    await database.execute(
      `INSERT INTO checkout_payments
        (id, order_id, payload_json, created_at, status, amount_minor, currency, updated_at, stripe_payment_intent_id)
       VALUES ($1, $2, '{}', $3, 'PENDING', 1234, 'RON', $3, $4)`,
      [paymentId, orderId, timestamp, intentId],
    );
  });

  it('rejects a changed raw payload and missing signature before touching Payments', async () => {
    const signed = signedEvent('payment_intent.succeeded');
    const applyVerifiedIntentEvent = vi.fn();
    expect(
      await handleStripeWebhook({
        ...signed,
        rawBody: Buffer.from(`${signed.rawBody.toString('utf8')} `),
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent,
      }),
    ).toEqual({ kind: 'invalid-signature' });
    expect(
      await handleStripeWebhook({ ...signed, signature: undefined, signingSecret: secret, enabled: true, applyVerifiedIntentEvent }),
    ).toEqual({ kind: 'invalid-signature' });
    expect(applyVerifiedIntentEvent).not.toHaveBeenCalled();
    expect(await currentState()).toEqual({ status: 'PENDING', events: [] });
  });

  it('stays unavailable without both the activation gate and signing secret', async () => {
    const signed = signedEvent('payment_intent.processing');
    const applyVerifiedIntentEvent = vi.fn();
    expect(await handleStripeWebhook({ ...signed, signingSecret: secret, enabled: false, applyVerifiedIntentEvent })).toEqual({
      kind: 'retry',
    });
    expect(await handleStripeWebhook({ ...signed, signingSecret: undefined, enabled: true, applyVerifiedIntentEvent })).toEqual({
      kind: 'retry',
    });
    expect(applyVerifiedIntentEvent).not.toHaveBeenCalled();
    expect(await currentState()).toEqual({ status: 'PENDING', events: [] });
  });

  it('acknowledges a signed processing observation after its Payment transition commits', async () => {
    const { service, retrieve } = adapter('processing');
    expect(
      await handleStripeWebhook({
        ...signedEvent('payment_intent.processing'),
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent: service.applyVerifiedIntentEvent,
      }),
    ).toEqual({ kind: 'accepted' });
    expect(retrieve).toHaveBeenCalledExactlyOnceWith(intentId);
    expect(await currentState()).toEqual({ status: 'PROCESSING', events: ['evt_webhook_ingress'] });
  });

  it('keeps duplicate success delivery retryable after the Payment transition', async () => {
    const { service, retrieve } = adapter('succeeded');
    const input = {
      ...signedEvent('payment_intent.succeeded'),
      signingSecret: secret,
      enabled: true,
      applyVerifiedIntentEvent: service.applyVerifiedIntentEvent,
    };
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await currentState()).toEqual({ status: 'PAID', events: ['evt_webhook_ingress'] });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(await currentState()).toEqual({ status: 'PAID', events: ['evt_webhook_ingress'] });
  });

  it('keeps provider cancellation retryable until the old checkout is terminalized', async () => {
    const { service } = adapter('canceled');
    const input = {
      ...signedEvent('payment_intent.canceled'),
      signingSecret: secret,
      enabled: true,
      applyVerifiedIntentEvent: service.applyVerifiedIntentEvent,
    };
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await currentState()).toEqual({ status: 'CANCELED', events: ['evt_webhook_ingress'] });
  });

  it('does not acknowledge a non-success event that observes already-paid truth', async () => {
    const { service } = adapter('succeeded');
    await handleStripeWebhook({
      ...signedEvent('payment_intent.succeeded', 'evt_success'),
      signingSecret: secret,
      enabled: true,
      applyVerifiedIntentEvent: service.applyVerifiedIntentEvent,
    });
    expect(
      await handleStripeWebhook({
        ...signedEvent('payment_intent.payment_failed', 'evt_late_failure'),
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent: service.applyVerifiedIntentEvent,
      }),
    ).toEqual({ kind: 'retry' });
    expect(await currentState()).toEqual({ status: 'PAID', events: ['evt_late_failure', 'evt_success'] });
  });

  it('does not consume future refund events or dispatch unrelated signed events', async () => {
    const applyVerifiedIntentEvent = vi.fn();
    expect(
      await handleStripeWebhook({
        ...signedEvent('refund.created'),
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent,
      }),
    ).toEqual({ kind: 'retry' });
    expect(
      await handleStripeWebhook({
        ...signedEvent('customer.created'),
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent,
      }),
    ).toEqual({ kind: 'accepted' });
    expect(applyVerifiedIntentEvent).not.toHaveBeenCalled();
    expect(await currentState()).toEqual({ status: 'PENDING', events: [] });
  });
});
