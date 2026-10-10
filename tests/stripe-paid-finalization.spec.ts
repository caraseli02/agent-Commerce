import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireRefundCompensationRecovery } from '~~/server/application/checkout/require-refund-compensation-recovery';
import { commitRefundCompensation } from '~~/server/application/checkout/commit-refund-compensation';
import { finalizePaidCheckout } from '~~/server/application/checkout/finalize-paid-checkout';
import { createStripeIntentAdapter, handleStripeWebhook } from '~~/server/domain/payments';
import { getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

const paymentId = 'pay-paid-finalization';
const orderId = 'ord-paid-finalization';
const reservationId = 'res-paid-finalization';
const intentId = 'pi_paid_finalization';
const secret = 'whsec_paid_finalization';
const createdAt = '2026-09-27T12:00:00.000Z';

const signedSuccess = () => {
  const rawBody = Buffer.from(
    JSON.stringify({
      id: 'evt_paid_finalization',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: intentId, object: 'payment_intent' } },
    }),
  );
  return {
    rawBody,
    signature: Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString('utf8'), secret }),
  };
};

const state = async () => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<{
    payment_status: string;
    workflow_status: string;
    paid_recovery_decision: string | null;
    order_payload: string;
    reservation_status: string;
    paid_by_payment_id: string | null;
    on_hand: number;
    reserved: number;
    cart_revision: number;
    cart_payload: string;
  }>(
    `SELECT payment.status AS payment_status, claim.workflow_status, claim.paid_recovery_decision, orders.payload_json AS order_payload, reservation.status AS reservation_status,
            orders.paid_by_payment_id, inventory.on_hand, inventory.reserved,
            cart.revision AS cart_revision, cart.payload_json AS cart_payload
       FROM checkout_claims claim
       JOIN checkout_payments payment ON payment.id=claim.payment_id
       JOIN checkout_orders orders ON orders.id=claim.order_id
       JOIN checkout_reservations reservation ON reservation.id=claim.reservation_id
       JOIN checkout_inventory inventory ON inventory.product_id='prod-1'
       JOIN checkout_carts cart ON cart.cart_id=claim.cart_id
      WHERE claim.payment_id=$1`,
    [paymentId],
  );
  return row;
};

const webhookInput = (finalize: typeof finalizePaidCheckout = finalizePaidCheckout) => {
  const retrieve = vi.fn(async () => ({
    id: intentId,
    amountMinor: 1234,
    currency: 'RON',
    status: 'succeeded',
    clientSecret: null,
    metadata: { paymentId, orderId },
  }));
  const adapter = createStripeIntentAdapter({
    enabled: () => true,
    provider: { retrieve, create: vi.fn(), cancel: vi.fn() },
  });
  return {
    retrieve,
    input: {
      ...signedSuccess(),
      signingSecret: secret,
      enabled: true,
      applyVerifiedIntentEvent: adapter.applyVerifiedIntentEvent,
      finalizePaidCheckout: finalize,
    },
  };
};

describe('Stripe paid checkout finalization', () => {
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
       VALUES ($1, $2, '{}', $3, 'PENDING', 1234, 'RON', $3, $4)`,
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
  });

  it('acknowledges success only after Inventory, Order, and claim finalize', async () => {
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({
      payment_status: 'PAID',
      workflow_status: 'finalized',
      reservation_status: 'committed',
      paid_by_payment_id: paymentId,
      on_hand: 4,
      reserved: 0,
      cart_revision: 2,
    });
    expect(JSON.parse((await state())!.cart_payload).products).toEqual([]);
  });

  it('retries the same event after a crash between Payment commit and application finalization', async () => {
    const crashing = vi.fn(async () => {
      throw new Error('crash after provider transition');
    });
    const { input, retrieve } = webhookInput(crashing);
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({ payment_status: 'PAID', workflow_status: 'payment_pending', on_hand: 5 });
    expect(await handleStripeWebhook({ ...input, finalizePaidCheckout })).toEqual({ kind: 'accepted' });
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(await state()).toMatchObject({ workflow_status: 'finalized', on_hand: 4 });
    expect(await handleStripeWebhook({ ...input, finalizePaidCheckout })).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ on_hand: 4, reserved: 0 });
  });

  it('serializes concurrent duplicate finalization and never decrements stock twice', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    const results = await Promise.all([finalizePaidCheckout({ paymentId, orderId }), finalizePaidCheckout({ paymentId, orderId })]);
    expect(results).toEqual([{ kind: 'finalized' }, { kind: 'finalized' }]);
    expect(await state()).toMatchObject({ workflow_status: 'finalized', on_hand: 4, reserved: 0 });
  });

  it('keeps expired reservation success retryable without marking the Order paid', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET expires_at='2020-01-01T00:00:00.000Z' WHERE id=$1", [reservationId]);
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      payment_status: 'PAID',
      workflow_status: 'payment_pending',
      reservation_status: 'expired',
      paid_by_payment_id: null,
      on_hand: 5,
      reserved: 0,
    });
  });

  it('rolls back Inventory when Order finalization fails, then retries', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_orders SET payload_json='{}' WHERE id=$1", [orderId]);
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      payment_status: 'PAID',
      workflow_status: 'payment_pending',
      reservation_status: 'active',
      on_hand: 5,
      reserved: 1,
    });
    await database.execute(
      `UPDATE checkout_orders SET payload_json='{"order":{"status":"Pending","paymentDetails":{"status":0},"updatedAt":"2026-09-27T12:00:00.000Z"}}' WHERE id=$1`,
      [orderId],
    );
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', on_hand: 4 });
  });

  it('does not clear a newer Cart revision when finalizing the paid checkout', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_carts SET revision=2 WHERE cart_id='cart-paid'");
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', cart_revision: 2 });
    expect(JSON.parse((await state())!.cart_payload).products).toHaveLength(1);
  });

  it('acknowledges durable fulfillment even when best-effort Cart cleanup fails', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_carts SET payload_json='invalid-json' WHERE cart_id='cart-paid'");
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'accepted' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', paid_by_payment_id: paymentId, on_hand: 4 });
  });

  const markPaid = async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
  };

  it('commits REFUND, paid Order history and On Hold atomically without touching stock or Cart', async () => {
    await markPaid();
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'established' });
    const persisted = await state();
    expect(persisted).toMatchObject({
      payment_status: 'PAID',
      paid_recovery_decision: 'REFUND',
      workflow_status: 'compensation_pending',
      paid_by_payment_id: paymentId,
      on_hand: 5,
      reserved: 1,
      cart_revision: 1,
    });
    expect(JSON.parse(persisted!.order_payload).order).toMatchObject({ status: 'On Hold', paymentDetails: { status: 1 } });
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'established' });
    expect(await state()).toEqual(persisted);
  });

  it('rolls back both Order and claim when an enclosing recovery transaction fails', async () => {
    await markPaid();
    const before = await state();
    await expect(
      withCheckoutTransaction(async () => {
        await commitRefundCompensation({ paymentId, orderId });
        throw new Error('recovery transaction aborted');
      }),
    ).rejects.toThrow('recovery transaction aborted');
    expect(await state()).toEqual(before);
  });

  it('rolls back the compensation decision when the Order hold mutation fails', async () => {
    await markPaid();
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_orders SET payload_json='{}' WHERE id=$1", [orderId]);
    await expect(commitRefundCompensation({ paymentId, orderId })).rejects.toThrow();
    expect(await state()).toMatchObject({
      paid_recovery_decision: null,
      workflow_status: 'payment_pending',
      paid_by_payment_id: null,
      on_hand: 5,
    });
  });

  it.each(['ALLOCATE', 'BACKORDER'])('rejects compensation after the durable %s choice', async (decision) => {
    await markPaid();
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_claims SET paid_recovery_decision=$1 WHERE payment_id=$2', [decision, paymentId]);
    const before = await state();
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(before);
  });

  it('rejects an unpaid Payment or mismatched Order without mutation', async () => {
    const before = await state();
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(before);
    await markPaid();
    const paid = await state();
    expect(await commitRefundCompensation({ paymentId, orderId: 'other-order' })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(paid);
  });

  it('never converts completed fulfillment to refund compensation', async () => {
    await markPaid();
    expect(await finalizePaidCheckout({ paymentId, orderId })).toEqual({ kind: 'finalized' });
    const before = await state();
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(before);
  });

  it.each(['compensation_recovery_required', 'finalized'])('does not reset existing REFUND %s on replay', async (workflow) => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_claims SET workflow_status=$1 WHERE payment_id=$2', [workflow, paymentId]);
    const before = await state();
    expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'established' });
    expect(await state()).toEqual(before);
    expect(await finalizePaidCheckout({ paymentId, orderId })).toEqual({ kind: 'retry' });
  });

  it('retries duplicate signed success after REFUND without fulfillment or acknowledging missing provider identity', async () => {
    const { input, retrieve } = webhookInput();
    expect(await handleStripeWebhook({ ...input, finalizePaidCheckout: async () => ({ kind: 'retry' }) })).toEqual({ kind: 'retry' });
    await commitRefundCompensation({ paymentId, orderId });
    const before = await state();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(retrieve).toHaveBeenCalledTimes(1);
    expect(await state()).toEqual(before);
  });

  it('blocks fulfillment on the REFUND decision even when stock returns or workflow status is inconsistent', async () => {
    await markPaid();
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_claims SET paid_recovery_decision='REFUND' WHERE payment_id=$1", [paymentId]);
    await database.execute("UPDATE checkout_inventory SET on_hand=20 WHERE product_id='prod-1'");
    expect(await finalizePaidCheckout({ paymentId, orderId })).toEqual({ kind: 'retry' });
    expect(await state()).toMatchObject({
      on_hand: 20,
      reserved: 1,
      reservation_status: 'active',
      paid_by_payment_id: null,
      cart_revision: 1,
    });
  });

  it('serializes conflicting refund and fulfillment attempts so exactly one path wins', async () => {
    await markPaid();
    const [refund, fulfillment] = await Promise.all([
      commitRefundCompensation({ paymentId, orderId }),
      finalizePaidCheckout({ paymentId, orderId }),
    ]);
    const persisted = await state();
    if (refund.kind === 'established') {
      expect(fulfillment).toEqual({ kind: 'retry' });
      expect(persisted).toMatchObject({
        paid_recovery_decision: 'REFUND',
        workflow_status: 'compensation_pending',
        on_hand: 5,
        reserved: 1,
      });
    } else {
      expect(refund).toEqual({ kind: 'conflict' });
      expect(fulfillment).toEqual({ kind: 'finalized' });
      expect(persisted).toMatchObject({ paid_recovery_decision: null, workflow_status: 'finalized', on_hand: 4, reserved: 0 });
    }
  });

  it('marks unsafe compensation recoverable without rewriting held paid history, stock or Cart', async () => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    const before = await state();
    expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'recovery-required' });
    expect(await state()).toEqual({ ...before, workflow_status: 'compensation_recovery_required' });
    const persisted = await state();
    expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'recovery-required' });
    expect(await state()).toEqual(persisted);
    const { input } = webhookInput();
    expect(await handleStripeWebhook(input)).toEqual({ kind: 'retry' });
    expect(await finalizePaidCheckout({ paymentId, orderId })).toEqual({ kind: 'retry' });
    expect(await state()).toEqual(persisted);
  });

  it('rolls back a recovery-required transition when its enclosing transaction aborts', async () => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    const before = await state();
    await expect(
      withCheckoutTransaction(async () => {
        expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'recovery-required' });
        throw new Error('compensation recovery aborted');
      }),
    ).rejects.toThrow('compensation recovery aborted');
    expect(await state()).toEqual(before);
  });

  it.each([null, 'ALLOCATE', 'BACKORDER'])('rejects recovery without a durable REFUND choice (%s)', async (decision) => {
    await markPaid();
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_claims SET paid_recovery_decision=$1 WHERE payment_id=$2', [decision, paymentId]);
    const before = await state();
    expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(before);
  });

  it('rejects mismatched or missing identities and an unpaid Payment without mutation', async () => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    const before = await state();
    expect(await requireRefundCompensationRecovery({ paymentId, orderId: 'other-order' })).toEqual({ kind: 'conflict' });
    expect(await requireRefundCompensationRecovery({ paymentId: 'missing-payment', orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(before);
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PENDING' WHERE id=$1", [paymentId]);
    const unpaid = await state();
    expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(unpaid);
  });

  it.each(['finalized', 'canceled', 'payment_pending', 'recovery_required'])(
    'never reopens or converts REFUND workflow %s',
    async (workflow) => {
      await markPaid();
      await commitRefundCompensation({ paymentId, orderId });
      const database = await getCheckoutDatabase();
      await database.execute('UPDATE checkout_claims SET workflow_status=$1 WHERE payment_id=$2', [workflow, paymentId]);
      const before = await state();
      expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'conflict' });
      expect(await state()).toEqual(before);
    },
  );

  it.each(['lifecycle', 'history', 'marker'])('rejects inconsistent held Order %s', async (field) => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    const database = await getCheckoutDatabase();
    const payload = JSON.parse((await state())!.order_payload);
    if (field === 'lifecycle') payload.order.status = 'Pending';
    if (field === 'history') payload.order.paymentDetails.status = 0;
    await database.execute('UPDATE checkout_orders SET payload_json=$1, paid_by_payment_id=$2 WHERE id=$3', [
      JSON.stringify(payload),
      field === 'marker' ? null : paymentId,
      orderId,
    ]);
    const before = await state();
    expect(await requireRefundCompensationRecovery({ paymentId, orderId })).toEqual({ kind: 'conflict' });
    expect(await state()).toEqual(before);
  });

  it('serializes overlapping recovery reports and REFUND replay without allowing fulfillment', async () => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    const before = await state();
    const [first, second, replay, fulfillment] = await Promise.all([
      requireRefundCompensationRecovery({ paymentId, orderId }),
      requireRefundCompensationRecovery({ paymentId, orderId }),
      commitRefundCompensation({ paymentId, orderId }),
      finalizePaidCheckout({ paymentId, orderId }),
    ]);
    expect(first).toEqual({ kind: 'recovery-required' });
    expect(second).toEqual({ kind: 'recovery-required' });
    expect(replay).toEqual({ kind: 'established' });
    expect(fulfillment).toEqual({ kind: 'retry' });
    expect(await state()).toEqual({ ...before, workflow_status: 'compensation_recovery_required' });
  });

  it('does not reopen compensation when a concurrent completion owns the claim lock first', async () => {
    await markPaid();
    await commitRefundCompensation({ paymentId, orderId });
    let unlock!: () => void;
    let locked!: () => void;
    const claimLocked = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const continueCompletion = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const completion = withCheckoutTransaction(async () => {
      const database = await getCheckoutDatabase();
      await database.query('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [paymentId]);
      locked();
      await continueCompletion;
      // Simulate the future settlement writer at its coordinated claim boundary.
      await database.execute("UPDATE checkout_claims SET workflow_status='finalized' WHERE payment_id=$1", [paymentId]);
    });
    await claimLocked;
    const recovery = requireRefundCompensationRecovery({ paymentId, orderId });
    unlock();
    await completion;
    expect(await recovery).toEqual({ kind: 'conflict' });
    expect(await state()).toMatchObject({ workflow_status: 'finalized', paid_recovery_decision: 'REFUND', payment_status: 'PAID' });
  });
});
