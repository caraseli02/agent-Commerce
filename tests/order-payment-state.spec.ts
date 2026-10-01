import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readOrderPaymentState } from '~/server/application/checkout/read-order-payment-state';
import { finalizePaidCheckout } from '~/server/application/checkout/finalize-paid-checkout';
import { commitRefundCompensation } from '~/server/application/checkout/commit-refund-compensation';
import { requireRefundCompensationRecovery } from '~/server/application/checkout/require-refund-compensation-recovery';
import { orders } from '~/server/domain/orders';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

const paymentId = 'pay-paid-finalization';
const orderId = 'ord-paid-finalization';
const reservationId = 'res-paid-finalization';
const intentId = 'pi_paid_finalization';
const createdAt = '2026-09-27T12:00:00.000Z';
const input = { ownerId: 'owner-paid', orderId };

describe('Owner-scoped local payment and checkout state', () => {
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

  it('distinguishes received payment from unfinished checkout after a crash', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'paid-finalizing' });
  });
  it.each([
    ['PENDING', 'pending'],
    ['PROCESSING', 'processing'],
  ])('reports local %s without offering a payment action', async (status, kind) => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET status=$1 WHERE id=$2', [status, paymentId]);
    expect(await readOrderPaymentState(input)).toEqual({ kind });
  });

  it('reports completed checkout only after critical finalization', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await finalizePaidCheckout({ paymentId, orderId })).toEqual({ kind: 'finalized' });
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'completed' });
  });

  it.each(['compensation_pending', 'compensation_recovery_required', 'finalized'])(
    'never reports REFUND %s as ordinary completion',
    async (status) => {
      const database = await getCheckoutDatabase();
      await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
      expect(await commitRefundCompensation({ paymentId, orderId })).toEqual({ kind: 'established' });
      if (status === 'compensation_recovery_required') await requireRefundCompensationRecovery({ paymentId, orderId });
      // Future-settlement fixture: this does not claim a successful provider refund.
      if (status === 'finalized') await database.execute("UPDATE checkout_claims SET workflow_status='finalized'");
      expect(await readOrderPaymentState(input)).toEqual({
        kind: 'compensation',
        recoveryRequired: status === 'compensation_recovery_required',
      });
    },
  );

  it('reports canceled payment independently of unfinished cancellation cleanup', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'canceled' });
    await database.execute("UPDATE checkout_claims SET workflow_status='canceled'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'canceled' });
  });
  it.each([
    { ownerId: 'foreign-owner', orderId },
    { ...input, orderId: 'missing-order' },
  ])('hides missing and foreign checkout state: %j', async (lookup) => {
    expect(await readOrderPaymentState(lookup)).toEqual({ kind: 'not-found' });
  });

  it.each([
    "UPDATE checkout_claims SET workflow_status='recovery_required', payment_id=NULL",
    'UPDATE checkout_payments SET amount_minor=9999',
    "UPDATE checkout_payments SET currency='USD'",
    "UPDATE checkout_orders SET checkout_request_id='different-request'",
    "UPDATE checkout_orders SET payload_json='invalid-json'",
    "UPDATE checkout_orders SET payload_json='null'",
    "UPDATE checkout_orders SET payload_json='{}'",
    "UPDATE checkout_claims SET workflow_status='prepared'",
    "UPDATE checkout_claims SET workflow_status='finalized'",
    "UPDATE checkout_claims SET workflow_status='compensation_pending'",
    "UPDATE checkout_claims SET workflow_status='compensation_recovery_required'",
    "UPDATE checkout_claims SET workflow_status='canceled'",
    "UPDATE checkout_claims SET workflow_status='recovery_required'",
    "UPDATE checkout_claims SET paid_recovery_decision='REFUND'",
    "UPDATE checkout_claims SET paid_recovery_decision='BACKORDER'",
    "UPDATE checkout_payments SET status='FAILED'",
    "UPDATE checkout_orders SET paid_by_payment_id='pay-paid-finalization'",
  ])('fails conservatively for an inconsistent or unresolved snapshot: %s', async (sql) => {
    const database = await getCheckoutDatabase();
    await database.execute(sql);
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
  });

  it('does not mistake a paid marker without finalized claim for completed checkout', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID'");
    await finalizePaidCheckout({ paymentId, orderId });
    await database.execute("UPDATE checkout_claims SET workflow_status='payment_pending'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
    await database.execute("UPDATE checkout_claims SET workflow_status='finalized'");
    await database.execute('UPDATE checkout_orders SET paid_by_payment_id=NULL');
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
  });

  it('keeps invalid REFUND history out of both compensation and normal completion', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID'");
    await commitRefundCompensation({ paymentId, orderId });
    await database.execute(
      "UPDATE checkout_orders SET payload_json='{" + '"order":{"status":"Pending","paymentDetails":{"status":1}}' + "}'",
    );
    await database.execute("UPDATE checkout_claims SET workflow_status='finalized'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
  });

  it('does not change any checkout persistence or expose credentials', async () => {
    const database = await getCheckoutDatabase();
    const snapshot = () =>
      database.query(`SELECT jsonb_build_object(
      'claims', (SELECT jsonb_agg(c) FROM checkout_claims c),
      'orders', (SELECT jsonb_agg(o) FROM checkout_orders o),
      'payments', (SELECT jsonb_agg(p) FROM checkout_payments p),
      'reservations', (SELECT jsonb_agg(r) FROM checkout_reservations r),
      'inventory', (SELECT jsonb_agg(i) FROM checkout_inventory i),
      'carts', (SELECT jsonb_agg(c) FROM checkout_carts c),
      'events', (SELECT jsonb_agg(e) FROM checkout_stripe_webhook_events e)
    ) AS state`);
    const unchangedRead = async (expected: object) => {
      const before = await snapshot();
      expect(await readOrderPaymentState(input)).toEqual(expected);
      expect(await snapshot()).toEqual(before);
    };
    await unchangedRead({ kind: 'pending' });
    await database.execute("UPDATE checkout_payments SET status='PROCESSING'");
    await unchangedRead({ kind: 'processing' });
    await database.execute("UPDATE checkout_payments SET status='PAID'");
    await unchangedRead({ kind: 'paid-finalizing' });
    await commitRefundCompensation({ paymentId, orderId });
    await unchangedRead({ kind: 'compensation', recoveryRequired: false });
    await requireRefundCompensationRecovery({ paymentId, orderId });
    await unchangedRead({ kind: 'compensation', recoveryRequired: true });
  });

  it('reads one coherent snapshot while another transaction finalizes checkout', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID'");
    let entered!: () => void;
    let release!: () => void;
    const paused = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const resumed = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = orders.getCheckoutStatePreparation;
    // Scheduling instrumentation only: every value still comes from PostgreSQL.
    const pause = vi.spyOn(orders, 'getCheckoutStatePreparation').mockImplementationOnce(async (id) => {
      entered();
      await resumed;
      return original(id);
    });
    const reading = readOrderPaymentState(input);
    try {
      await paused;
      expect(await finalizePaidCheckout({ paymentId, orderId })).toEqual({ kind: 'finalized' });
    } finally {
      release();
    }
    try {
      expect(await reading).toEqual({ kind: 'paid-finalizing' });
    } finally {
      pause.mockRestore();
    }
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'completed' });
  });

  it('refuses an enclosing transaction rather than reading caller mutations', async () => {
    await expect(withCheckoutTransaction(() => readOrderPaymentState(input))).rejects.toThrow('cannot run inside a checkout transaction');
  });
  it('rejects an unsupported currency even when Payment and Order agree', async () => {
    const database = await getCheckoutDatabase();
    await withCheckoutTransaction(async () => {
      await database.execute("UPDATE checkout_payments SET currency='USD'");
      await database.execute("UPDATE checkout_orders SET currency='USD'");
    });
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
  });

  it('keeps paid recovery distinct from an unpaid recovery state', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_claims SET workflow_status='recovery_required'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
    await database.execute("UPDATE checkout_payments SET status='PAID'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'paid-finalizing' });
  });
  it('keeps finalized REFUND with Canceled lifecycle and Paid history in compensation', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID'");
    await commitRefundCompensation({ paymentId, orderId });
    // ADR future-settlement shape, not a provider settlement assertion.
    await database.execute('UPDATE checkout_orders SET payload_json=$1', [
      JSON.stringify({ order: { status: 'Canceled', paymentDetails: { status: 1 } } }),
    ]);
    await database.execute("UPDATE checkout_claims SET workflow_status='finalized'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'compensation', recoveryRequired: false });
    await database.execute("UPDATE checkout_claims SET workflow_status='compensation_pending'");
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
  });
});
