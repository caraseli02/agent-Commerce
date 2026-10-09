import Stripe from 'stripe';
import { createApp, toWebHandler, defineEventHandler, readRawBody, getHeader, createError } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStripeRefundAdapter, handleStripeWebhook, readRefundContinuation } from '~/server/domain/payments';
import type { StripeRefund, StripeRefundProvider } from '~/server/domain/payments/stripe-refunds';
import { withRefundCompensation } from '~/server/application/checkout/with-refund-compensation';
import { requireRefundCompensationRecovery } from '~/server/application/checkout/require-refund-compensation-recovery';
import { settleRefundCompensation } from '~/server/application/checkout/settle-refund-compensation';
import { commitRefundCompensation } from '~/server/application/checkout/commit-refund-compensation';
import { orders } from '~/server/domain/orders';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase } from '~/server/infrastructure/checkout-database';
const paymentId = 'pay-full-refund';
const orderId = 'ord-full-refund';
const reservationId = 'res-full-refund';
const intentId = 'pi_full_refund';
const createdAt = '2026-10-01T00:00:00.000Z';
const secret = 'whsec_refund_test';
let remote: StripeRefund;
const retrieve = vi.fn<StripeRefundProvider['retrieve']>(async () => {
  assertOutsideCheckoutTransaction('Refund test provider read');
  return remote;
});
const create = vi.fn<StripeRefundProvider['create']>();
const service = (onSucceeded = settleRefundCompensation) =>
  createStripeRefundAdapter({
    enabled: () => true,
    provider: { retrieve, create },
    withRefundCompensation,
    onRecoveryRequired: requireRefundCompensationRecovery,
    onSucceeded,
  });
const signed = (type = 'refund.updated', id = 'evt_refund', patch: Partial<StripeRefund> = {}) => {
  const value = { ...remote, ...patch };
  const rawBody = Buffer.from(
    JSON.stringify({
      id,
      object: 'event',
      type,
      data: {
        object: {
          object: 'refund',
          id: value.id,
          payment_intent: value.paymentIntentId,
          amount: value.amountMinor,
          currency: value.currency,
          status: value.status,
          metadata: value.metadata,
        },
      },
    }),
  );
  return { rawBody, signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString(), secret }) };
};
const ingress = (svc = service(), type = 'refund.updated', id = 'evt_refund', patch: Partial<StripeRefund> = {}) =>
  handleStripeWebhook({
    ...signed(type, id, patch),
    signingSecret: secret,
    enabled: true,
    applyVerifiedIntentEvent: vi.fn(),
    applyVerifiedRefundEvent: svc.applyVerifiedRefundEvent,
  });
const state = async () => {
  const db = await getCheckoutDatabase();
  const [row] = await db.query(
    `SELECT p.status AS payment_status,c.workflow_status,r.status AS refund_status,r.stripe_refund_id,
    o.payload_json, i.on_hand,i.reserved FROM checkout_payments p JOIN checkout_claims c ON c.payment_id=p.id
    JOIN checkout_refunds r ON r.payment_id=p.id JOIN checkout_orders o ON o.id=p.order_id JOIN checkout_inventory i ON i.product_id='prod-1' WHERE p.id=$1`,
    [paymentId],
  );
  if (!row) throw new Error('Refund test state missing');
  return { ...row, order_status: JSON.parse(String(row.payload_json)).order.status };
};
describe('signed Refund financial truth and compensation settlement', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await database.execute("INSERT INTO checkout_inventory (product_id, on_hand, reserved) VALUES ('prod-1', 5, 1)");
    await database.execute(
      `INSERT INTO checkout_carts (owner_id, cart_id, revision, payload_json, updated_at)
       VALUES ('owner-paid', 'cart-paid', 1, '{"products":[{"id":"prod-1","stock":1}]}', $1)`,
      [createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
       VALUES ($1, 'owner-paid:request-paid', 'fingerprint-paid', '[{"productId":"prod-1","immediateQuantity":1,"backorderQuantity":0}]',
               '2100-01-01T00:00:00.000Z', 'active')`,
      [reservationId],
    );
    await database.execute(
      `INSERT INTO checkout_orders
         (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint,
          payload_json, created_at, updated_at, grand_total_minor, currency)
       VALUES ($1, 'owner-paid', 'request-paid', 'cart-paid', 1, 'fingerprint-paid',
               '{"order":{"status":"Pending","paymentDetails":{"status":0},"updatedAt":"2026-09-27T12:00:00.000Z"}}', $2, $2, 1234, 'RON')`,
      [orderId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_payments
         (id, order_id, payload_json, created_at, status, amount_minor, currency, updated_at, stripe_payment_intent_id)
       VALUES ($1, $2, '{}', $3, 'PAID', 1234, 'RON', $3, $4)`,
      [paymentId, orderId, createdAt, intentId],
    );
    await database.execute(
      `INSERT INTO checkout_claims
         (owner_id, request_id, fingerprint, cart_id, cart_revision, created_at, updated_at,
          order_id, reservation_id, payment_id, workflow_status)
       VALUES ('owner-paid', 'request-paid', 'fingerprint-paid', 'cart-paid', 1, $1, $1,
               $2, $3, $4, 'payment_pending')`,
      [createdAt, orderId, reservationId, paymentId],
    );
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'established' });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const db = await getCheckoutDatabase();
    await db.execute(
      `INSERT INTO checkout_refunds (id,payment_id,stripe_payment_intent_id,amount_minor,currency,reason,status,stripe_refund_id,create_started_at,created_at,updated_at)
      VALUES ('refund-event',$1,$2,1234,'RON','requested_by_customer','PENDING','re_event',$3,$3,$3)`,
      [paymentId, intentId, createdAt],
    );
    remote = {
      id: 're_event',
      paymentIntentId: intentId,
      amountMinor: 1234,
      currency: 'ron',
      status: 'succeeded',
      metadata: { refundId: 'refund-event', paymentId, orderId },
    };
  });
  it('rejects a bad signature before provider, financial or application writes', async () => {
    expect(
      await handleStripeWebhook({
        ...signed(),
        signature: 'bad',
        signingSecret: secret,
        enabled: true,
        applyVerifiedIntentEvent: vi.fn(),
        applyVerifiedRefundEvent: service().applyVerifiedRefundEvent,
      }),
    ).toEqual({ kind: 'invalid-signature' });
    expect(retrieve).not.toHaveBeenCalled();
    expect(await state()).toMatchObject({ refund_status: 'PENDING', workflow_status: 'compensation_pending', order_status: 'On Hold' });
  });
  it.each(['refund.created', 'refund.updated', 'refund.failed'])(
    'dispatches signed %s using current authority and preserves paid history',
    async (type) => {
      expect(await ingress(service(), type)).toEqual({ kind: 'accepted' });
      expect(await state()).toMatchObject({
        refund_status: 'SUCCEEDED',
        payment_status: 'PAID',
        workflow_status: 'finalized',
        order_status: 'Canceled',
        on_hand: 5,
        reserved: 1,
      });
      expect(retrieve).toHaveBeenCalledExactlyOnceWith('re_event');
      expect(create).not.toHaveBeenCalled();
    },
  );
  it('crash before application settlement leaves financial dedup durable and duplicate retries it without another read', async () => {
    const settle = vi
      .fn<typeof settleRefundCompensation>()
      .mockRejectedValueOnce(new Error('crash'))
      .mockImplementation(settleRefundCompensation);
    const svc = service(settle);
    expect(await ingress(svc)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ refund_status: 'SUCCEEDED', workflow_status: 'compensation_pending', order_status: 'On Hold' });
    const db = await getCheckoutDatabase();
    expect(await db.query('SELECT * FROM checkout_stripe_refund_events')).toHaveLength(1);
    expect(await ingress(svc)).toEqual({ kind: 'accepted' });
    expect(retrieve).toHaveBeenCalledOnce();
    expect(settle).toHaveBeenCalledTimes(2);
    expect(await state()).toMatchObject({ workflow_status: 'finalized', order_status: 'Canceled' });
  });
  it('lost settlement response retries an already committed cancellation', async () => {
    const settle = vi
      .fn<typeof settleRefundCompensation>()
      .mockImplementationOnce(async (input) => {
        await settleRefundCompensation(input);
        throw new Error('lost response');
      })
      .mockImplementation(settleRefundCompensation);
    expect(await ingress(service(settle))).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', order_status: 'Canceled' });
    expect(await ingress(service(settle))).toEqual({ kind: 'accepted' });
    expect(retrieve).toHaveBeenCalledOnce();
  });
  it('pending continues through reconciliation independently of payment events and never creates', async () => {
    remote.status = 'pending';
    expect(await ingress()).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ refund_status: 'PENDING', order_status: 'On Hold' });
    remote.status = 'succeeded';
    expect(await service().reconcileRefund({ paymentId })).toMatchObject({ kind: 'succeeded' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', order_status: 'Canceled', payment_status: 'PAID' });
    expect(create).not.toHaveBeenCalled();
    expect(retrieve).toHaveBeenCalledTimes(2);
  });
  it('out-of-order pending and failure snapshots cannot regress current success', async () => {
    expect(await ingress()).toEqual({ kind: 'accepted' });
    expect(await ingress(service(), 'refund.created', 'evt_stale', { status: 'pending' })).toEqual({ kind: 'accepted' });
    expect(await ingress(service(), 'refund.failed', 'evt_stale_failure', { status: 'failed' })).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ refund_status: 'SUCCEEDED', workflow_status: 'finalized', order_status: 'Canceled' });
  });
  it('authoritative bank-return failure after settlement restores hold and survives older success delivery', async () => {
    await ingress();
    remote.status = 'failed';
    expect(await ingress(service(), 'refund.failed', 'evt_failed')).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      refund_status: 'FAILED',
      workflow_status: 'compensation_recovery_required',
      order_status: 'On Hold',
      payment_status: 'PAID',
      on_hand: 5,
      reserved: 1,
    });
    remote.status = 'succeeded';
    expect(await ingress(service(), 'refund.updated', 'evt_old_success')).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      refund_status: 'FAILED',
      workflow_status: 'compensation_recovery_required',
      order_status: 'On Hold',
    });
  });
  it('completion versus failure reporting races never reopen fulfillment or erase failure', async () => {
    let release!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const delayed = service(async (input) => {
      entered();
      await waiting;
      return settleRefundCompensation(input);
    });
    const success = ingress(delayed);
    await started;
    remote.status = 'failed';
    expect(await ingress(service(), 'refund.failed', 'evt_failure_race')).toEqual({ kind: 'accepted' });
    release();
    expect(await success).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      refund_status: 'FAILED',
      workflow_status: 'compensation_recovery_required',
      order_status: 'On Hold',
    });
    expect(await ingress()).toEqual({ kind: 'accepted' });
  });
  it('concurrent duplicate delivery commits one financial event', async () => {
    expect(await Promise.all([ingress(), ingress(), ingress()])).toEqual([
      { kind: 'accepted' },
      { kind: 'accepted' },
      { kind: 'accepted' },
    ]);
    const db = await getCheckoutDatabase();
    expect(await db.query('SELECT * FROM checkout_stripe_refund_events')).toHaveLength(1);
    expect(await state()).toMatchObject({ workflow_status: 'finalized', order_status: 'Canceled' });
  });
  it('unknown provider identity after lost create response is recovered by signed exact financial metadata', async () => {
    const db = await getCheckoutDatabase();
    await db.execute('UPDATE checkout_refunds SET stripe_refund_id=NULL');
    expect(await readRefundContinuation({ paymentId, orderId, refundId: 'refund-event' })).toEqual({ kind: 'unknown' });
    expect(await ingress()).toEqual({ kind: 'accepted' });
    expect(await readRefundContinuation({ paymentId, orderId, refundId: 'refund-event' })).toEqual({ kind: 'known', status: 'SUCCEEDED' });
  });
  it.each([{ amountMinor: 1 }, { currency: 'usd' }, { metadata: {} }, { paymentIntentId: 'pi_foreign' }])(
    'unsafe signed identity %j holds fulfillment without dedup consumption',
    async (patch) => {
      expect(await ingress(service(), 'refund.updated', 'evt_unsafe', patch)).toEqual({ kind: 'retry' });
      expect(await state()).toMatchObject({
        refund_status: 'PENDING',
        workflow_status: 'compensation_recovery_required',
        order_status: 'On Hold',
      });
      const db = await getCheckoutDatabase();
      expect(await db.query('SELECT * FROM checkout_stripe_refund_events')).toHaveLength(0);
      expect(retrieve).not.toHaveBeenCalled();
    },
  );
  it('unsafe retrieved identity reports recovery and does not settle', async () => {
    const original = remote;
    retrieve.mockResolvedValueOnce({ ...remote, amountMinor: 1 });
    expect(await ingress()).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      refund_status: 'PENDING',
      workflow_status: 'compensation_recovery_required',
      order_status: 'On Hold',
    });
    remote = original;
  });
  it('rolls back Order cancellation when claim finalization crashes', async () => {
    const db = await getCheckoutDatabase();
    await db.execute(
      `CREATE FUNCTION fail_refund_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.workflow_status='finalized' THEN RAISE EXCEPTION 'settlement crash'; END IF; RETURN NEW; END $$`,
    );
    await db.execute(
      'CREATE TRIGGER refund_settlement_crash BEFORE UPDATE ON checkout_claims FOR EACH ROW EXECUTE FUNCTION fail_refund_settlement()',
    );
    try {
      expect(await ingress()).toEqual({ kind: 'retry' });
      expect(await state()).toMatchObject({ refund_status: 'SUCCEEDED', workflow_status: 'compensation_pending', order_status: 'On Hold' });
    } finally {
      await db.execute('DROP TRIGGER refund_settlement_crash ON checkout_claims');
      await db.execute('DROP FUNCTION fail_refund_settlement()');
    }
    expect(await ingress()).toEqual({ kind: 'accepted' });
  });
  it('requestFullRefund success retries the application consequence with no new provider I/O', async () => {
    await ingress();
    expect(await service().requestFullRefund({ paymentId, reason: 'requested_by_customer' })).toMatchObject({ kind: 'succeeded' });
    expect(retrieve).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });
  it('settlement refuses conflicting decision and unknown stored state', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_refunds SET status='SUCCEEDED'");
    await db.execute("UPDATE checkout_claims SET paid_recovery_decision='ALLOCATE'");
    expect(await settleRefundCompensation({ paymentId, orderId, refundId: 'refund-event' })).toEqual({ kind: 'retry' });
    expect(await orders.getCheckoutStatePreparation(orderId)).toMatchObject({ paidHeld: true });
  });
  it('real webhook HTTP handler accepts signed Refund and rejects tampering/default-off before effects', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret);
    vi.stubGlobal('defineEventHandler', defineEventHandler);
    vi.stubGlobal('readRawBody', readRawBody);
    vi.stubGlobal('getHeader', getHeader);
    vi.stubGlobal('createError', createError);
    let enabled = true;
    vi.doMock('~/server/application/checkout/stripe-payment', () => ({
      stripePayments: { applyVerifiedIntentEvent: vi.fn() },
      stripeRefunds: service(),
      stripePaymentsEnabled: () => enabled,
    }));
    try {
      const route = (await import('~/server/api/payments/stripe/webhook.post')).default;
      const app = createApp();
      app.use('/api/payments/stripe/webhook', route);
      const request = toWebHandler(app);
      const send = (body: Buffer, signature: string) =>
        request(
          new Request('http://localhost/api/payments/stripe/webhook', {
            method: 'POST',
            body: body.toString(),
            headers: { 'stripe-signature': signature },
          }),
        );
      const value = signed();
      expect((await send(value.rawBody, 'bad')).status).toBe(400);
      expect((await send(Buffer.from(value.rawBody.toString() + ' '), value.signature)).status).toBe(400);
      expect(retrieve).not.toHaveBeenCalled();
      const accepted = await send(value.rawBody, value.signature);
      expect(accepted.status).toBe(200);
      expect(await accepted.json()).toEqual({ received: true });
      expect(await state()).toMatchObject({ payment_status: 'PAID', workflow_status: 'finalized', order_status: 'Canceled' });
      enabled = false;
      expect((await send(value.rawBody, value.signature)).status).toBe(503);
      expect(retrieve).toHaveBeenCalledOnce();
    } finally {
      vi.doUnmock('~/server/application/checkout/stripe-payment');
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
