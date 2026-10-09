import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStripeIntentAdapter } from '~~/server/domain/payments/stripe-intents';
import type { StripePaymentIntent } from '~~/server/domain/payments/stripe-intents';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

const paymentId = 'pay-verified-event';
const orderId = 'ord-verified-event';
const intentId = 'pi_verified_event';
const timestamp = '2026-09-24T12:00:00.000Z';
const intent = (status: string): StripePaymentIntent => ({
  id: intentId,
  amountMinor: 1234,
  currency: 'RON',
  status,
  clientSecret: null,
  metadata: { paymentId, orderId },
});
const event = (eventId = 'evt_verified_1', eventType = 'payment_intent.succeeded') => ({ eventId, eventType, intentId });
const adapter = (retrieve = vi.fn(async () => intent('succeeded'))) => ({
  service: createStripeIntentAdapter({
    enabled: () => true,
    now: () => new Date(timestamp),
    provider: { retrieve, create: vi.fn(), cancel: vi.fn() },
  }),
  retrieve,
});
const state = async () => {
  const database = await getCheckoutDatabase();
  const [payment] = await database.query<{ status: string }>('SELECT status FROM checkout_payments WHERE id=$1', [paymentId]);
  const events = await database.query<{ event_id: string }>('SELECT event_id FROM checkout_stripe_webhook_events ORDER BY event_id');
  return { status: payment?.status, events: events.map((row) => row.event_id) };
};

describe('verified Stripe PaymentIntent event ledger', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations CASCADE',
    );
    await database.execute(
      `INSERT INTO checkout_orders
      (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint,
       payload_json, created_at, updated_at, grand_total_minor, currency)
      VALUES ($1, 'owner-event', 'request-event', 'cart-event', 1, 'fingerprint-event', '{}', $2, $2, 1234, 'RON')`,
      [orderId, timestamp],
    );
    await database.execute(
      `INSERT INTO checkout_payments
      (id, order_id, payload_json, created_at, status, amount_minor, currency, updated_at, stripe_payment_intent_id)
      VALUES ($1, $2, '{}', $3, 'PENDING', 1234, 'RON', $3, $4)`,
      [paymentId, orderId, timestamp, intentId],
    );
  });

  it('atomically records a verified event and its provider-confirmed Payment transition', async () => {
    const { service, retrieve } = adapter();
    expect(await service.applyVerifiedIntentEvent(event())).toEqual({ kind: 'paid', paymentId, orderId, duplicate: false });
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_verified_1'] });
    expect(retrieve).toHaveBeenCalledExactlyOnceWith(intentId);
  });

  it('returns fresh Payment context for a duplicate without consulting an unavailable provider', async () => {
    const first = adapter();
    expect(await first.service.applyVerifiedIntentEvent(event())).toMatchObject({ kind: 'paid', duplicate: false });
    const unavailable = adapter(
      vi.fn(async () => {
        throw new Error('provider unavailable');
      }),
    );
    expect(await unavailable.service.applyVerifiedIntentEvent(event())).toEqual({ kind: 'paid', paymentId, orderId, duplicate: true });
    expect(unavailable.retrieve).not.toHaveBeenCalled();
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_verified_1'] });
  });

  it('deduplicates concurrent deliveries of one event ID across adapter instances', async () => {
    const first = adapter();
    const second = adapter();
    const results = await Promise.all([first.service.applyVerifiedIntentEvent(event()), second.service.applyVerifiedIntentEvent(event())]);
    expect(results.map((result) => result.kind)).toEqual(['paid', 'paid']);
    expect(results.map((result) => 'duplicate' in result && result.duplicate).sort()).toEqual([false, true]);
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_verified_1'] });
  });

  it('rejects reuse of one event ID for a different verified binding', async () => {
    const { service } = adapter();
    await service.applyVerifiedIntentEvent(event());
    expect(await service.applyVerifiedIntentEvent(event('evt_verified_1', 'payment_intent.payment_failed'))).toEqual({
      kind: 'recovery-required',
    });
    expect(await service.applyVerifiedIntentEvent({ ...event(), intentId: 'pi_other' })).toEqual({ kind: 'recovery-required' });
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_verified_1'] });
  });

  it('records an out-of-order failure as an observation without regressing paid truth', async () => {
    const { service } = adapter();
    await service.applyVerifiedIntentEvent(event());
    const later = adapter(vi.fn(async () => intent('requires_payment_method')));
    expect(await later.service.applyVerifiedIntentEvent(event('evt_verified_2', 'payment_intent.payment_failed'))).toEqual({
      kind: 'paid',
      paymentId,
      orderId,
      duplicate: false,
    });
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_verified_1', 'evt_verified_2'] });
  });

  it('rolls back event insertion when the Payment row changes during provider retrieval', async () => {
    const database = await getCheckoutDatabase();
    const retrieve = vi.fn(async () => {
      await database.execute("UPDATE checkout_payments SET status='PROCESSING' WHERE id=$1", [paymentId]);
      return intent('requires_payment_method');
    });
    const { service } = adapter(retrieve);
    expect(await service.applyVerifiedIntentEvent(event('evt_stale', 'payment_intent.payment_failed'))).toEqual({
      kind: 'recovery-required',
    });
    expect(await state()).toEqual({ status: 'PROCESSING', events: [] });
  });

  it('leaves a losing event ID unrecorded until redelivery observes fresh provider truth', async () => {
    let entered!: () => void;
    let release!: () => void;
    const atProvider = new Promise<void>((resolve) => (entered = resolve));
    const providerReleased = new Promise<void>((resolve) => (release = resolve));
    const stale = adapter(
      vi.fn(async () => {
        entered();
        await providerReleased;
        return intent('requires_payment_method');
      }),
    );
    const winning = adapter(vi.fn(async () => intent('succeeded')));

    const losingDelivery = stale.service.applyVerifiedIntentEvent(event('evt_losing', 'payment_intent.payment_failed'));
    await atProvider;
    expect(await winning.service.applyVerifiedIntentEvent(event('evt_winning'))).toEqual({
      kind: 'paid',
      paymentId,
      orderId,
      duplicate: false,
    });
    release();
    expect(await losingDelivery).toEqual({ kind: 'recovery-required' });
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_winning'] });

    const fresh = adapter(vi.fn(async () => intent('succeeded')));
    expect(await fresh.service.applyVerifiedIntentEvent(event('evt_losing', 'payment_intent.payment_failed'))).toEqual({
      kind: 'paid',
      paymentId,
      orderId,
      duplicate: false,
    });
    expect(await state()).toEqual({ status: 'PAID', events: ['evt_losing', 'evt_winning'] });
  });

  it('rolls back the event record when the Payment update fails', async () => {
    const database = await getCheckoutDatabase();
    await database.execute(`CREATE FUNCTION reject_verified_payment_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'payment update rejected'; END $$`);
    await database.execute(`CREATE TRIGGER reject_verified_payment_update
      AFTER UPDATE ON checkout_payments FOR EACH ROW EXECUTE FUNCTION reject_verified_payment_update()`);
    try {
      const { service } = adapter();
      await expect(service.applyVerifiedIntentEvent(event())).rejects.toThrow('payment update rejected');
      expect(await state()).toEqual({ status: 'PENDING', events: [] });
    } finally {
      await database.execute('DROP TRIGGER reject_verified_payment_update ON checkout_payments');
      await database.execute('DROP FUNCTION reject_verified_payment_update()');
    }
  });

  it('does not record provider uncertainty or mismatched provider identity', async () => {
    const timedOut = adapter(
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );
    expect(await timedOut.service.applyVerifiedIntentEvent(event())).toEqual({ kind: 'recovery-required' });
    const mismatch = adapter(vi.fn(async () => ({ ...intent('succeeded'), amountMinor: 999 })));
    expect(await mismatch.service.applyVerifiedIntentEvent(event())).toEqual({ kind: 'recovery-required' });
    expect(await state()).toEqual({ status: 'PENDING', events: [] });
  });

  it('keeps provider I/O outside transactions and rejects an already active transaction', async () => {
    const { service, retrieve } = adapter(
      vi.fn(async () => {
        assertOutsideCheckoutTransaction('fake provider retrieve');
        return intent('succeeded');
      }),
    );
    expect(await service.applyVerifiedIntentEvent(event())).toMatchObject({ kind: 'paid' });
    expect(retrieve).toHaveBeenCalledTimes(1);
    await expect(withCheckoutTransaction(() => service.applyVerifiedIntentEvent(event('evt_other')))).rejects.toThrow(
      'cannot run inside a checkout transaction',
    );
  });

  it('leaves verified event handling disabled without explicit activation', async () => {
    const retrieve = vi.fn(async () => intent('succeeded'));
    const service = createStripeIntentAdapter({ provider: { retrieve, create: vi.fn(), cancel: vi.fn() } });
    expect(await service.applyVerifiedIntentEvent(event())).toEqual({ kind: 'recovery-required' });
    expect(retrieve).not.toHaveBeenCalled();
    expect(await state()).toEqual({ status: 'PENDING', events: [] });
  });

  it('does not consume an unsupported event or conflict with terminal cancellation', async () => {
    const database = await getCheckoutDatabase();
    const { service, retrieve } = adapter();
    expect(await service.applyVerifiedIntentEvent(event('evt_unsupported', 'payment_intent.amount_capturable_updated'))).toEqual({
      kind: 'recovery-required',
    });
    expect(retrieve).not.toHaveBeenCalled();
    await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
    expect(await service.applyVerifiedIntentEvent(event())).toEqual({ kind: 'recovery-required' });
    expect(await state()).toEqual({ status: 'CANCELED', events: [] });
  });
});
