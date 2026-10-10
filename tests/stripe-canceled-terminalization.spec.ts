import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { terminalizeCanceledCheckout } from '~~/server/application/checkout/terminalize-canceled-checkout';
import { createStripeIntentAdapter, handleStripeWebhook } from '~~/server/domain/payments';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';

const paymentId = 'pay-cancel-terminalization';
const orderId = 'ord-cancel-terminalization';
const reservationId = 'res-cancel-terminalization';
const intentId = 'pi_cancel_terminalization';
const secret = 'whsec_cancel_terminalization';
const createdAt = '2026-09-28T12:00:00.000Z';

const signedCancellation = () => {
  const rawBody = Buffer.from(
    JSON.stringify({
      id: 'evt_cancel_terminalization',
      object: 'event',
      type: 'payment_intent.canceled',
      data: { object: { id: intentId, object: 'payment_intent' } },
    }),
  );
  return { rawBody, signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString('utf8'), secret }) };
};

const webhookInput = (terminalize: typeof terminalizeCanceledCheckout = terminalizeCanceledCheckout) => {
  const retrieve = vi.fn(async () => ({
    id: intentId,
    amountMinor: 1234,
    currency: 'RON',
    status: 'canceled',
    clientSecret: null,
    metadata: { paymentId, orderId },
  }));
  const adapter = createStripeIntentAdapter({ enabled: () => true, provider: { retrieve, create: vi.fn(), cancel: vi.fn() } });
  return {
    retrieve,
    input: {
      ...signedCancellation(),
      signingSecret: secret,
      enabled: true,
      applyVerifiedIntentEvent: adapter.applyVerifiedIntentEvent,
      terminalizeCanceledCheckout: terminalize,
    },
  };
};

const state = async () => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<{
    payment_status: string;
    workflow_status: string;
    reservation_status: string;
    paid_by_payment_id: string | null;
    on_hand: number;
    reserved: number;
    cart_revision: number;
  }>(
    `SELECT payment.status AS payment_status, claim.workflow_status, reservation.status AS reservation_status,
            orders.paid_by_payment_id, inventory.on_hand, inventory.reserved, cart.revision AS cart_revision
       FROM checkout_claims claim
       JOIN checkout_payments payment ON payment.id=claim.payment_id
       JOIN checkout_orders orders ON orders.id=claim.order_id
       JOIN checkout_reservations reservation ON reservation.id=claim.reservation_id
       JOIN checkout_inventory inventory ON inventory.product_id='prod-1'
       JOIN checkout_carts cart ON cart.cart_id=claim.cart_id
      WHERE claim.payment_id=$1`,
    [paymentId],
  );
  const events = await database.query<{ event_id: string }>('SELECT event_id FROM checkout_stripe_webhook_events');
  return { ...row, events: events.map(({ event_id }) => event_id) };
};

describe('Stripe provider-canceled checkout terminalization', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await database.execute("INSERT INTO checkout_inventory (product_id, on_hand, reserved) VALUES ('prod-1', 5, 1)");
    await database.execute(
      `INSERT INTO checkout_carts (owner_id, cart_id, revision, payload_json, updated_at)
       VALUES ('owner-cancel', 'cart-cancel', 1, '{"products":[{"id":"prod-1","stock":1}]}', $1)`,
      [createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
       VALUES ($1, 'owner-cancel:request-cancel', 'fingerprint-cancel', '[{"productId":"prod-1","immediateQuantity":1,"backorderQuantity":0}]',
               '2100-01-01T00:00:00.000Z', 'active')`,
      [reservationId],
    );
    await database.execute(
      `INSERT INTO checkout_orders
         (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint,
          payload_json, created_at, updated_at, grand_total_minor, currency)
       VALUES ($1, 'owner-cancel', 'request-cancel', 'cart-cancel', 1, 'fingerprint-cancel',
               '{"order":{"paymentDetails":{"status":0}}}', $2, $2, 1234, 'RON')`,
      [orderId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_payments
         (id, order_id, payload_json, created_at, status, amount_minor, currency, updated_at, stripe_payment_intent_id)
       VALUES ($1, $2, '{}', $3, 'PENDING', 1234, 'RON', $3, $4)`,
      [paymentId, orderId, createdAt, intentId],
    );
    await database.execute(
      `INSERT INTO checkout_claims
         (owner_id, request_id, fingerprint, cart_id, cart_revision, created_at, updated_at,
          order_id, reservation_id, payment_id, workflow_status)
       VALUES ('owner-cancel', 'request-cancel', 'fingerprint-cancel', 'cart-cancel', 1, $1, $1,
               $2, $3, $4, 'payment_pending')`,
      [createdAt, orderId, reservationId, paymentId],
    );
  });

  it('acknowledges only after releasing Inventory and terminalizing the claim', async () => {
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      payment_status: 'CANCELED',
      workflow_status: 'canceled',
      reservation_status: 'released',
      paid_by_payment_id: null,
      on_hand: 5,
      reserved: 0,
      cart_revision: 1,
      events: ['evt_cancel_terminalization'],
    });
  });

  it('retries after a crash between Payment/event commit and application consequence', async () => {
    const crashing = vi.fn(async () => {
      throw new Error('crash after provider transition');
    });
    const { input, retrieve } = webhookInput(crashing);
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ payment_status: 'CANCELED', workflow_status: 'payment_pending', reserved: 1 });
    expect(await handleStripeWebhook({ ...input, terminalizeCanceledCheckout })).toEqual({ kind: 'accepted' });
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(await handleStripeWebhook({ ...input, terminalizeCanceledCheckout })).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ workflow_status: 'canceled', reserved: 0, events: ['evt_cancel_terminalization'] });
  });

  it('serializes concurrent duplicate terminalization without double release', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
    expect(
      await Promise.all([terminalizeCanceledCheckout({ paymentId, orderId }), terminalizeCanceledCheckout({ paymentId, orderId })]),
    ).toEqual([{ kind: 'terminalized' }, { kind: 'terminalized' }]);
    expect(await state()).toMatchObject({ workflow_status: 'canceled', reservation_status: 'released', reserved: 0, on_hand: 5 });
  });

  it('terminalizes an already-expired reservation without reallocating stock', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET expires_at='2020-01-01T00:00:00.000Z' WHERE id=$1", [reservationId]);
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ workflow_status: 'canceled', reservation_status: 'expired', reserved: 0, on_hand: 5 });
  });

  it('refuses fulfillment or an unproven canceled Payment', async () => {
    const database = await getCheckoutDatabase();
    expect(await terminalizeCanceledCheckout({ paymentId, orderId })).toEqual({ kind: 'retry' });
    await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
    await database.execute("UPDATE checkout_claims SET workflow_status='finalized' WHERE payment_id=$1", [paymentId]);
    expect(await terminalizeCanceledCheckout({ paymentId, orderId })).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', reservation_status: 'active', reserved: 1 });
  });

  it('keeps the webhook retryable when a contradictory committed reservation blocks release', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET status='committed' WHERE id=$1", [reservationId]);
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ payment_status: 'CANCELED', workflow_status: 'payment_pending' });
  });

  it('rolls back the Inventory release if the claim update fails, then retries the same event', async () => {
    const database = await getCheckoutDatabase();
    await database.execute(`CREATE FUNCTION fail_canceled_claim_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'claim write failed'; END $$`);
    await database.execute(`CREATE TRIGGER fail_canceled_claim_update BEFORE UPDATE ON checkout_claims
      FOR EACH ROW WHEN (NEW.workflow_status = 'canceled') EXECUTE FUNCTION fail_canceled_claim_update()`);
    const { input } = webhookInput();
    try {
      expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
      expect(await state()).toMatchObject({
        payment_status: 'CANCELED',
        workflow_status: 'payment_pending',
        reservation_status: 'active',
        reserved: 1,
      });
    } finally {
      await database.execute('DROP TRIGGER fail_canceled_claim_update ON checkout_claims');
      await database.execute('DROP FUNCTION fail_canceled_claim_update()');
    }
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ workflow_status: 'canceled', reservation_status: 'released', reserved: 0 });
  });

  it('does not regress a canceled Payment on a later success observation', async () => {
    const { input, retrieve } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    retrieve.mockResolvedValueOnce({
      id: intentId,
      amountMinor: 1234,
      currency: 'RON',
      status: 'succeeded',
      clientSecret: null,
      metadata: { paymentId, orderId },
    });
    const rawBody = Buffer.from(
      JSON.stringify({
        id: 'evt_late_success',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: { object: { id: intentId, object: 'payment_intent' } },
      }),
    );
    expect(
      await handleStripeWebhook({
        ...input,
        rawBody,
        signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString('utf8'), secret }),
      }),
    ).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ payment_status: 'CANCELED', workflow_status: 'canceled', reserved: 0 });
  });

  it('preserves already-paid truth when a canceled event arrives late', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ payment_status: 'PAID', workflow_status: 'payment_pending', reserved: 1 });
  });
});
