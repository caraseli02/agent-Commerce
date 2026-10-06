import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStripeRefundAdapter } from '~/server/domain/payments';
import type { StripeRefund, StripeRefundProvider } from '~/server/domain/payments/stripe-refunds';
import { withRefundCompensation } from '~/server/application/checkout/with-refund-compensation';
import { requireRefundCompensationRecovery } from '~/server/application/checkout/require-refund-compensation-recovery';
import { commitRefundCompensation } from '~/server/application/checkout/commit-refund-compensation';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
const paymentId = 'pay-full-refund';
const orderId = 'ord-full-refund';
const reservationId = 'res-full-refund';
const intentId = 'pi_full_refund';
const createdAt = '2026-10-01T00:00:00.000Z';
const input = { paymentId, reason: 'requested_by_customer' as const };
let clock = new Date(createdAt);
let providerStatus = 'pending';
let remote: StripeRefund | null;
const create = vi.fn<StripeRefundProvider['create']>(async (request) => {
  assertOutsideCheckoutTransaction('Fake Refund create');
  const db = await getCheckoutDatabase();
  const [stored] = await db.query('SELECT * FROM checkout_refunds WHERE id=$1', [request.refundId]);
  expect(stored?.create_started_at).not.toBeNull();
  remote ??= {
    id: 're_full_refund',
    paymentIntentId: request.paymentIntentId,
    amountMinor: request.amountMinor,
    currency: 'ron',
    status: providerStatus,
    metadata: { refundId: request.refundId, paymentId: request.paymentId, orderId: request.orderId },
  };
  return { ...remote, status: providerStatus };
});
const retrieve = vi.fn<StripeRefundProvider['retrieve']>(async (id) => {
  assertOutsideCheckoutTransaction('Fake Refund retrieve');
  expect(id).toBe(remote?.id);
  return { ...remote!, status: providerStatus };
});
const adapter = (enabled = true) =>
  createStripeRefundAdapter({
    provider: { create, retrieve },
    enabled: () => enabled,
    now: () => clock,
    withRefundCompensation,
    onRecoveryRequired: requireRefundCompensationRecovery,
  });
const row = async () => {
  const db = await getCheckoutDatabase();
  return (await db.query('SELECT * FROM checkout_refunds WHERE payment_id=$1', [paymentId]))[0];
};
const state = async () => {
  const db = await getCheckoutDatabase();
  return (
    await db.query(
      'SELECT p.status,c.workflow_status,o.paid_by_payment_id,o.payload_json FROM checkout_payments p JOIN checkout_claims c ON c.payment_id=p.id JOIN checkout_orders o ON o.id=p.order_id WHERE p.id=$1',
      [paymentId],
    )
  )[0];
};
describe('one full provider Refund', () => {
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

  beforeEach(() => {
    clock = new Date(createdAt);
    remote = null;
    providerStatus = 'pending';
    vi.clearAllMocks();
  });
  it('defaults off and has no Refund/provider effects', async () => {
    const off = createStripeRefundAdapter({ provider: { create, retrieve }, withRefundCompensation });
    expect(await off.requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(await row())!.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
  it('commits one full financial fact before I/O and reconciles its exact identity', async () => {
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'pending' });
    expect(await row())!.toMatchObject({ status: 'PENDING', amount_minor: 1234, currency: 'RON', stripe_refund_id: 're_full_refund' });
    providerStatus = 'succeeded';
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'succeeded' });
    expect(create).toHaveBeenCalledOnce();
    expect(retrieve).toHaveBeenCalledExactlyOnceWith('re_full_refund');
    expect(await state())!.toMatchObject({ status: 'PAID', workflow_status: 'compensation_pending' });
    expect(JSON.parse(String((await state())!.payload_json)).order.status).toBe('On Hold');
  });
  it('concurrent creates converge on one row and identical key/parameters', async () => {
    const results = await Promise.all([
      adapter().requestFullRefund(input),
      adapter().requestFullRefund(input),
      adapter().requestFullRefund(input),
    ]);
    for (const r of results) expect(r).toMatchObject({ kind: 'pending' });
    const db = await getCheckoutDatabase();
    expect(await db.query('SELECT id FROM checkout_refunds')).toHaveLength(1);
    expect(new Set(create.mock.calls.map((c) => c[1])).size).toBe(1);
    expect(new Set(create.mock.calls.map((c) => JSON.stringify(c[0]))).size).toBe(1);
  });
  it('overlapping Stripe creates return pending on 409 without marking compensation recovery', async () => {
    let release!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((r) => {
      release = r;
    });
    const started = new Promise<void>((r) => {
      entered = r;
    });
    const normal = create.getMockImplementation()!;
    let inFlight = false;
    create.mockImplementation(async (request, key) => {
      if (inFlight) throw { statusCode: 409, code: 'idempotency_key_in_use' };
      inFlight = true;
      entered();
      await waiting;
      return normal(request, key);
    });
    const first = adapter().requestFullRefund(input);
    await started;
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'pending' });
    expect(await state()).toMatchObject({ workflow_status: 'compensation_pending' });
    expect((await row())!.stripe_refund_id).toBeNull();
    release();
    expect(await first).toMatchObject({ kind: 'pending' });
    expect((await row())!.stripe_refund_id).toBe('re_full_refund');
    expect(await state()).toMatchObject({ workflow_status: 'compensation_pending' });
    expect(create).toHaveBeenCalledTimes(2);
    create.mockImplementation(normal);
  });
  it.each([
    { statusCode: 409, code: 'unrelated_conflict' },
    { statusCode: 500, code: 'idempotency_key_in_use' },
  ])('does not hide an unrelated provider failure %j', async (error) => {
    create.mockRejectedValueOnce(error);
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(await state()).toMatchObject({ workflow_status: 'compensation_recovery_required' });
  });
  it.each(['claim', 'order'])('persists confirmed provider truth when Checkout %s advances during create', async (changed) => {
    const normal = create.getMockImplementation()!;
    create.mockImplementationOnce(async (request, key) => {
      const result = await normal(request, key);
      const db = await getCheckoutDatabase();
      if (changed === 'claim') await db.execute("UPDATE checkout_claims SET workflow_status='finalized' WHERE payment_id=$1", [paymentId]);
      else
        await db.execute(
          "UPDATE checkout_orders SET payload_json=jsonb_set(payload_json::jsonb,'{order,status}','\"Canceled\"')::text WHERE id=$1",
          [orderId],
        );
      return result;
    });
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'pending' });
    expect(await row()).toMatchObject({ stripe_refund_id: 're_full_refund', status: 'PENDING' });
    clock = new Date(clock.getTime() + 48 * 60 * 60 * 1000);
    providerStatus = 'succeeded';
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'succeeded' });
    expect(create).toHaveBeenCalledOnce();
    expect(retrieve).toHaveBeenCalledExactlyOnceWith('re_full_refund');
    expect(await row()).toMatchObject({ stripe_refund_id: 're_full_refund', status: 'SUCCEEDED' });
  });
  it('lost create response recovers through the same deterministic request', async () => {
    create.mockImplementationOnce(async (request, key) => {
      remote = {
        id: 're_full_refund',
        paymentIntentId: request.paymentIntentId,
        amountMinor: request.amountMinor,
        currency: 'ron',
        status: 'pending',
        metadata: { refundId: request.refundId, paymentId: request.paymentId, orderId: request.orderId },
      };
      expect(key).toBe(`refund:${request.refundId}:full`);
      throw new Error('lost response');
    });
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(remote?.id).toBe('re_full_refund');
    const started = (await row())!.create_started_at;
    clock = new Date(clock.getTime() + 1000);
    expect(await adapter().requestFullRefund({ ...input, reason: 'duplicate' })).toMatchObject({ kind: 'pending' });
    expect(create.mock.calls[0]).toEqual(create.mock.calls[1]);
    expect((await row())!.create_started_at).toEqual(started);
  });
  it('crash after create-start replays only inside the safe window', async () => {
    create.mockRejectedValueOnce(new Error('before provider create'));
    await adapter().requestFullRefund(input);
    expect((await row())!.stripe_refund_id).toBeNull();
    clock = new Date(clock.getTime() + 24 * 60 * 60 * 1000 - 1);
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'pending' });
    expect(create).toHaveBeenCalledTimes(2);
  });
  it.each([24 * 60 * 60 * 1000, 25 * 60 * 60 * 1000, -1])('unknown identity at unsafe elapsed %s never creates again', async (elapsed) => {
    create.mockRejectedValueOnce(new Error('lost response'));
    await adapter().requestFullRefund(input);
    vi.clearAllMocks();
    clock = new Date(clock.getTime() + elapsed);
    expect(await adapter().requestFullRefund(input)).toEqual({ kind: 'recovery-required', reason: 'unsafe-replay' });
    expect(create).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
    expect((await row())!.status).toBe('PENDING');
    expect(await state())!.toMatchObject({ status: 'PAID', workflow_status: 'compensation_recovery_required' });
  });
  it('known identity reconciles after the replay window without a create', async () => {
    await adapter().requestFullRefund(input);
    clock = new Date(clock.getTime() + 48 * 60 * 60 * 1000);
    providerStatus = 'succeeded';
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'succeeded' });
    expect(create).toHaveBeenCalledOnce();
    expect(retrieve).toHaveBeenCalledOnce();
  });
  it.each(['ALLOCATE', 'BACKORDER', null])('requires durable REFUND rather than %s', async (decision) => {
    const db = await getCheckoutDatabase();
    await db.execute('UPDATE checkout_claims SET paid_recovery_decision=$1 WHERE payment_id=$2', [decision, paymentId]);
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(await row())!.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
  it('refuses missing durable claim identity', async () => {
    const db = await getCheckoutDatabase();
    await db.execute('DELETE FROM checkout_claims WHERE payment_id=$1', [paymentId]);
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(create).not.toHaveBeenCalled();
  });
  it('refuses a no-longer-held Order', async () => {
    const db = await getCheckoutDatabase();
    await db.execute(
      "UPDATE checkout_orders SET payload_json=jsonb_set(payload_json::jsonb,'{order,status}','\"Pending\"')::text WHERE id=$1",
      [orderId],
    );
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(create).not.toHaveBeenCalled();
  });
  it.each(['PENDING', 'FAILED', 'CANCELED'])('refuses non-paid Payment %s', async (status) => {
    const db = await getCheckoutDatabase();
    await db.execute('UPDATE checkout_payments SET status=$1 WHERE id=$2', [status, paymentId]);
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(create).not.toHaveBeenCalled();
  });
  it('refuses unknown PaymentIntent identity without provider calls', async () => {
    const db = await getCheckoutDatabase();
    await db.execute('UPDATE checkout_payments SET stripe_payment_intent_id=NULL WHERE id=$1', [paymentId]);
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(create).not.toHaveBeenCalled();
  });
  it.each([
    { amountMinor: 1233 },
    { currency: 'usd' },
    { paymentIntentId: 'pi_foreign' },
    { id: 'invalid' },
    { metadata: { paymentId: 'foreign' } },
  ])('rejects mismatched provider truth %j', async (patch) => {
    create.mockImplementationOnce(async (request) => ({
      id: 're_full_refund',
      paymentIntentId: request.paymentIntentId,
      amountMinor: request.amountMinor,
      currency: 'ron',
      status: 'succeeded',
      metadata: { refundId: request.refundId, paymentId: request.paymentId, orderId: request.orderId },
      ...patch,
    }));
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect((await row())!.status).toBe('PENDING');
    expect((await row())!.stripe_refund_id).toBeNull();
  });
  it('rejects a different retrieved provider identity', async () => {
    await adapter().requestFullRefund(input);
    retrieve.mockImplementationOnce(async () => ({ ...remote!, id: 're_foreign', status: 'succeeded' }));
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect((await row())!.status).toBe('PENDING');
  });
  it.each(['pending', 'unrecognized'])('a stale %s response cannot regress concurrent Refund success', async (staleStatus) => {
    let release!: () => void;
    let entered!: () => void;
    const waiting = new Promise<void>((r) => {
      release = r;
    });
    const started = new Promise<void>((r) => {
      entered = r;
    });
    create.mockImplementationOnce(async (request) => {
      const pending: StripeRefund = {
        id: 're_full_refund',
        paymentIntentId: request.paymentIntentId,
        amountMinor: request.amountMinor,
        currency: 'ron',
        status: staleStatus,
        metadata: { refundId: request.refundId, paymentId: request.paymentId, orderId: request.orderId },
      };
      entered();
      await waiting;
      return pending;
    });
    const first = adapter().requestFullRefund(input);
    await started;
    providerStatus = 'succeeded';
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'succeeded' });
    release();
    expect(await first).toMatchObject({ kind: 'succeeded' });
    expect((await row())!.status).toBe('SUCCEEDED');
  });
  it.each(['unrecognized', 'requires_action'])('provider %s keeps validated identity but requires recovery', async (status) => {
    providerStatus = status;
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'recovery-required' });
    expect(await row())!.toMatchObject({ stripe_refund_id: 're_full_refund', status: 'PENDING' });
  });
  it.each(['failed', 'canceled'])('terminal provider %s blocks replacement Refund', async (status) => {
    providerStatus = status;
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'failed' });
    expect(await adapter().requestFullRefund(input)).toMatchObject({ kind: 'failed' });
    expect(create).toHaveBeenCalledOnce();
    expect(retrieve).not.toHaveBeenCalled();
    expect(await state())!.toMatchObject({ status: 'PAID', workflow_status: 'compensation_recovery_required' });
  });
  it('rejects entry from an existing transaction before any provider effect', async () => {
    await expect(withCheckoutTransaction(() => adapter().requestFullRefund(input))).rejects.toThrow('cannot run inside');
    expect(create).not.toHaveBeenCalled();
  });
});
