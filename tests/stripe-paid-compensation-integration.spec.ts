import Stripe from 'stripe';
import { createApp, toWebHandler, defineEventHandler, readRawBody, getHeader, createError } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContinuePaidCheckout } from '~~/server/application/checkout/continue-paid-checkout';
import { settleRefundCompensation } from '~~/server/application/checkout/settle-refund-compensation';
import { requireRefundCompensationRecovery } from '~~/server/application/checkout/require-refund-compensation-recovery';
import { withRefundCompensation } from '~~/server/application/checkout/with-refund-compensation';
import { finalizePaidCheckout } from '~~/server/application/checkout/finalize-paid-checkout';
import {
  createStripeIntentAdapter,
  createStripeRefundAdapter,
  handleStripeWebhook,
  readRefundContinuation,
} from '~~/server/domain/payments';
import type { StripeRefund, StripeRefundProvider } from '~~/server/domain/payments/stripe-refunds';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';

const paymentId = 'pay-compensation-integration';
const orderId = 'ord-compensation-integration';
const intentId = 'pi_compensation_integration';
const ownerId = 'owner-compensation';
const secret = 'whsec_compensation_integration';
const identity = { paymentId, orderId };
let clock: Date;
let remote: StripeRefund | undefined;
let remoteStatus: string;
let loseResponse: boolean;
const create = vi.fn<StripeRefundProvider['create']>(async (input) => {
  assertOutsideCheckoutTransaction('Fake Refund creation');
  remote ??= {
    id: 're_compensation_integration',
    paymentIntentId: intentId,
    amountMinor: input.amountMinor,
    currency: 'ron',
    status: remoteStatus,
    metadata: { refundId: input.refundId, paymentId, orderId },
  };
  if (loseResponse) {
    loseResponse = false;
    throw new Error('provider response lost');
  }
  return { ...remote, status: remoteStatus };
});
const retrieve = vi.fn<StripeRefundProvider['retrieve']>(async (id) => {
  assertOutsideCheckoutTransaction('Fake Refund reconciliation');
  expect(id).toBe(remote?.id);
  return { ...remote!, status: remoteStatus };
});
const refunds = (onSucceeded = settleRefundCompensation) =>
  createStripeRefundAdapter({
    provider: { create, retrieve },
    enabled: () => true,
    now: () => clock,
    withRefundCompensation,
    onRecoveryRequired: requireRefundCompensationRecovery,
    onSucceeded,
  });
const signed = (type = 'payment_intent.succeeded', id = 'evt_compensation_paid') => {
  const object = type.startsWith('refund.')
    ? {
        object: 'refund',
        id: remote!.id,
        payment_intent: intentId,
        amount: remote!.amountMinor,
        currency: 'ron',
        status: remoteStatus,
        metadata: remote!.metadata,
      }
    : { object: 'payment_intent', id: intentId };
  const rawBody = Buffer.from(JSON.stringify({ id, object: 'event', type, data: { object } }));
  return { rawBody, signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString(), secret }) };
};
const webhook = (adapter = refunds(), continuation = createContinuePaidCheckout({ ...adapter, readRefundContinuation })) => {
  const intentRetrieve = vi.fn(async () => ({
    id: intentId,
    amountMinor: 1234,
    currency: 'RON',
    status: 'succeeded',
    clientSecret: null,
    metadata: { paymentId, orderId },
  }));
  const intents = createStripeIntentAdapter({
    provider: { retrieve: intentRetrieve, create: vi.fn(), cancel: vi.fn() },
    enabled: () => true,
  });
  const input = {
    ...signed(),
    enabled: true,
    signingSecret: secret,
    applyVerifiedIntentEvent: intents.applyVerifiedIntentEvent,
    applyVerifiedRefundEvent: adapter.applyVerifiedRefundEvent,
    finalizePaidCheckout: continuation,
  };
  return { input, intentRetrieve };
};
const state = async () => {
  const db = await getCheckoutDatabase();
  const [s] = await db.query(
    `SELECT c.workflow_status,c.paid_recovery_decision,p.status AS payment_status,o.payload_json,
    r.status AS refund_status,r.stripe_refund_id,i.on_hand,i.reserved,cart.revision AS cart_revision
    FROM checkout_claims c JOIN checkout_payments p ON p.id=c.payment_id JOIN checkout_orders o ON o.id=c.order_id
    JOIN checkout_inventory i ON i.product_id='prod-1' JOIN checkout_carts cart ON cart.cart_id=c.cart_id
    LEFT JOIN checkout_refunds r ON r.payment_id=p.id WHERE p.id=$1`,
    [paymentId],
  );
  return { ...s, orderStatus: JSON.parse(String(s!.payload_json)).order.status };
};

describe('late paid success delivery continues compensation without a browser', () => {
  beforeEach(async () => {
    clock = new Date('2026-10-09T12:00:00.000Z');
    remote = undefined;
    remoteStatus = 'pending';
    loseResponse = false;
    vi.clearAllMocks();
    const db = await getCheckoutDatabase();
    await db.execute(
      'TRUNCATE checkout_claims, checkout_orders, checkout_payments, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await db.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-1',0,0)");
    await db.execute(
      `INSERT INTO checkout_carts (owner_id,cart_id,revision,payload_json,updated_at)
      VALUES ($1,'cart-compensation',1,'{"products":[{"id":"prod-1","stock":1}]}',$2)`,
      [ownerId, clock.toISOString()],
    );
    await db.execute(`INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
      VALUES ('res-compensation','owner-compensation:request-compensation','fingerprint-compensation',
      '[{"productId":"prod-1","immediateQuantity":1,"backorderQuantity":0}]','2020-01-01T00:00:00.000Z','released')`);
    const payload = {
      order: {
        _id: orderId,
        status: 'Pending',
        paymentDetails: { status: 0 },
        products: [{ id: 'prod-1', stock: 1, backorder_stock: 0 }],
        shippingDetails: { backorderShippingTypeId: 'back-002' },
      },
      children: [],
    };
    await db.execute(
      `INSERT INTO checkout_orders (id,customer_id,checkout_request_id,source_cart_id,source_cart_revision,
      fingerprint,payload_json,created_at,updated_at,grand_total_minor,currency)
      VALUES ($1,$2,'request-compensation','cart-compensation',1,'fingerprint-compensation',$3,$4,$4,1234,'RON')`,
      [orderId, ownerId, JSON.stringify(payload), clock.toISOString()],
    );
    await db.execute(
      `INSERT INTO checkout_payments (id,order_id,payload_json,created_at,updated_at,status,amount_minor,currency,stripe_payment_intent_id)
      VALUES ($1,$2,'{}',$3,$3,'PENDING',1234,'RON',$4)`,
      [paymentId, orderId, clock.toISOString(), intentId],
    );
    await db.execute(
      `INSERT INTO checkout_claims (owner_id,request_id,fingerprint,cart_id,cart_revision,created_at,updated_at,
      order_id,payment_id,reservation_id,workflow_status)
      VALUES ($1,'request-compensation','fingerprint-compensation','cart-compensation',1,$2,$2,$3,$4,'res-compensation','payment_pending')`,
      [ownerId, clock.toISOString(), orderId, paymentId],
    );
  });

  it('recovers a crash after REFUND commits and before provider creation on duplicate paid delivery', async () => {
    const adapter = refunds();
    const crash = createContinuePaidCheckout({
      ...adapter,
      readRefundContinuation,
      requestFullRefund: async () => {
        throw new Error('crash after committed REFUND');
      },
    });
    const { input, intentRetrieve } = webhook(adapter, crash);
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      paid_recovery_decision: 'REFUND',
      workflow_status: 'compensation_pending',
      orderStatus: 'On Hold',
      payment_status: 'PAID',
      stripe_refund_id: null,
    });
    expect(create).not.toHaveBeenCalled();
    expect(
      await handleStripeWebhook({ ...input, finalizePaidCheckout: createContinuePaidCheckout({ ...adapter, readRefundContinuation }) }),
    ).toEqual({ kind: 'accepted' });
    expect(intentRetrieve).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({
      refund_status: 'PENDING',
      stripe_refund_id: 're_compensation_integration',
      on_hand: 0,
      reserved: 0,
    });
  });

  it('replays a lost create response with the same key and never acknowledges before durable identity', async () => {
    loseResponse = true;
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ stripe_refund_id: null, workflow_status: 'compensation_recovery_required' });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
    expect(await state()).toMatchObject({ stripe_refund_id: 're_compensation_integration', paid_recovery_decision: 'REFUND' });
  });

  it('keeps an in-flight same-key local-only refund retryable until the competing response persists identity', async () => {
    const realCreate = create.getMockImplementation()!;
    create.mockImplementationOnce(async () => {
      throw { statusCode: 409, code: 'idempotency_key_in_use' };
    });
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ stripe_refund_id: null, refund_status: 'PENDING', workflow_status: 'compensation_pending' });
    create.mockImplementation(realCreate);
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
  });

  it('continues a known pending Refund independently through signed events after paid acknowledgment', async () => {
    const adapter = refunds();
    const { input } = webhook(adapter);
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    remoteStatus = 'succeeded';
    expect(await handleStripeWebhook({ ...input, ...signed('refund.updated', 'evt_compensation_refund') })).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      orderStatus: 'Canceled',
      workflow_status: 'finalized',
      payment_status: 'PAID',
      refund_status: 'SUCCEEDED',
    });
    expect(await handleStripeWebhook({ ...input, ...signed('refund.updated', 'evt_compensation_refund') })).toEqual({ kind: 'accepted' });
    expect(create).toHaveBeenCalledOnce();
    expect(await finalizePaidCheckout(identity)).toEqual({ kind: 'retry' });
  });

  it('settles synchronous Refund success and replays without another create or fulfillment', async () => {
    remoteStatus = 'succeeded';
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(create).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({
      orderStatus: 'Canceled',
      workflow_status: 'finalized',
      payment_status: 'PAID',
      on_hand: 0,
      reserved: 0,
    });
  });

  it('retries paid delivery after Refund success commits but application settlement crashes', async () => {
    remoteStatus = 'succeeded';
    const crashed = refunds(async () => {
      throw new Error('settlement process crashed');
    });
    const { input } = webhook(crashed);
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      refund_status: 'SUCCEEDED',
      stripe_refund_id: 're_compensation_integration',
      orderStatus: 'On Hold',
    });
    expect(
      await handleStripeWebhook({ ...input, finalizePaidCheckout: createContinuePaidCheckout({ ...refunds(), readRefundContinuation }) }),
    ).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      refund_status: 'SUCCEEDED',
      orderStatus: 'Canceled',
      workflow_status: 'finalized',
      payment_status: 'PAID',
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('keeps failed Refund paid, held and non-fulfillable while acknowledging durable financial identity', async () => {
    remoteStatus = 'failed';
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      orderStatus: 'On Hold',
      workflow_status: 'compensation_recovery_required',
      refund_status: 'FAILED',
      payment_status: 'PAID',
    });
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET on_hand=20 WHERE product_id='prod-1'");
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(create).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({ on_hand: 20, reserved: 0, paid_recovery_decision: 'REFUND' });
  });

  it('refuses an unknown create after the safe replay window even when stock replenishes', async () => {
    loseResponse = true;
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    clock = new Date(clock.getTime() + 24 * 60 * 60 * 1000);
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET on_hand=20 WHERE product_id='prod-1'");
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(create).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({
      orderStatus: 'On Hold',
      workflow_status: 'compensation_recovery_required',
      on_hand: 20,
      reserved: 0,
      stripe_refund_id: null,
    });
  });

  it('maps signed paid continuation to real HTTP retry before identity and success after durable identity', async () => {
    const adapter = refunds();
    const { input } = webhook(adapter);
    let enabled = true;
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret);
    vi.stubGlobal('defineEventHandler', defineEventHandler);
    vi.stubGlobal('readRawBody', readRawBody);
    vi.stubGlobal('getHeader', getHeader);
    vi.stubGlobal('createError', createError);
    vi.doMock('~~/server/application/checkout/stripe-payment', () => ({
      stripePayments: { applyVerifiedIntentEvent: input.applyVerifiedIntentEvent },
      stripeRefunds: adapter,
      stripePaymentsEnabled: () => enabled,
    }));
    vi.doMock('~~/server/application/checkout/continue-paid-checkout', () => ({ continuePaidCheckout: input.finalizePaidCheckout }));
    try {
      const route = (await import('~~/server/api/payments/stripe/webhook.post')).default;
      const app = createApp();
      app.use('/api/payments/stripe/webhook', route);
      const request = toWebHandler(app);
      const send = (signature = input.signature) =>
        request(
          new Request('http://localhost/api/payments/stripe/webhook', {
            method: 'POST',
            body: input.rawBody.toString(),
            headers: { 'stripe-signature': signature },
          }),
        );
      expect((await send('bad')).status).toBe(400);
      expect(create).not.toHaveBeenCalled();
      loseResponse = true;
      expect((await send()).status).toBe(503);
      expect(await state()).toMatchObject({ stripe_refund_id: null, workflow_status: 'compensation_recovery_required' });
      const completed = await send();
      expect(completed.status).toBe(200);
      expect(await completed.json()).toEqual({ received: true });
      enabled = false;
      expect((await send()).status).toBe(503);
      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      vi.doUnmock('~~/server/application/checkout/continue-paid-checkout');
      vi.doUnmock('~~/server/application/checkout/stripe-payment');
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

  it('preserves normal finalization and revision-aware Cart cleanup', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET on_hand=5,reserved=1 WHERE product_id='prod-1'");
    await db.execute("UPDATE checkout_reservations SET status='active',expires_at='2100-01-01T00:00:00.000Z' WHERE id='res-compensation'");
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      workflow_status: 'finalized',
      paid_recovery_decision: null,
      payment_status: 'PAID',
      on_hand: 4,
      reserved: 0,
      cart_revision: 2,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('cleans up the matching Cart after late allocation without invoking refunds', async () => {
    const db = await getCheckoutDatabase();
    await db.execute("UPDATE checkout_inventory SET on_hand=5 WHERE product_id='prod-1'");
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ paid_recovery_decision: 'ALLOCATE', workflow_status: 'finalized', on_hand: 4, cart_revision: 2 });
    expect(create).not.toHaveBeenCalled();
  });
  it('fulfills the frozen permitted backorder and cleans the matching Cart without refund creation', async () => {
    const db = await getCheckoutDatabase();
    const [row] = await db.query('SELECT payload_json FROM checkout_orders WHERE id=$1', [orderId]);
    const payload = JSON.parse(String(row!.payload_json));
    payload.order.shippingDetails.backorderShippingTypeId = 'back-001';
    await db.execute('UPDATE checkout_orders SET payload_json=$1 WHERE id=$2', [JSON.stringify(payload), orderId]);
    const { input } = webhook();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      paid_recovery_decision: 'BACKORDER',
      workflow_status: 'finalized',
      on_hand: 0,
      reserved: 0,
      cart_revision: 2,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('concurrent success delivery converges on the same durable Refund and remains non-fulfillable', async () => {
    const { input } = webhook();
    const results = await Promise.all([handleStripeWebhook(input), handleStripeWebhook(input)]);
    expect(results).toEqual([{ kind: 'accepted' }, { kind: 'accepted' }]);
    const db = await getCheckoutDatabase();
    expect(await db.query('SELECT id FROM checkout_refunds WHERE payment_id=$1', [paymentId])).toHaveLength(1);
    expect(new Set(create.mock.calls.map((call) => call[1])).size).toBe(1);
    expect(await state()).toMatchObject({ paid_recovery_decision: 'REFUND', orderStatus: 'On Hold', on_hand: 0, reserved: 0 });
  });
});
