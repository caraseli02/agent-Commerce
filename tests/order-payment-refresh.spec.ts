import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createApp, createError, createRouter, defineEventHandler, getHeaders, getRouterParam, toNodeListener } from 'h3';
import { createRefreshOrderPayment } from '~/server/application/checkout/refresh-order-payment';
import { readOrderPaymentState } from '~/server/application/checkout/read-order-payment-state';
import { commitRefundCompensation } from '~/server/application/checkout/commit-refund-compensation';
import { orders } from '~/server/domain/orders';
import { inventory } from '~/server/domain/inventory';
import { createStripeIntentAdapter } from '~/server/domain/payments';
import type { StripeIntentProvider, StripePaymentIntent } from '~/server/domain/payments/stripe-intents';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
import { createMockToken } from '~/server/utils/mockUsers';

const stripe = vi.hoisted(() => ({ enabled: vi.fn(() => true), reconcilePayment: vi.fn() }));
vi.mock('~/server/application/checkout/stripe-payment', () => ({
  stripePaymentsEnabled: stripe.enabled,
  stripePayments: { reconcilePayment: stripe.reconcilePayment },
}));

const paymentId = 'pay-paid-finalization';
const orderId = 'ord-paid-finalization';
const reservationId = 'res-paid-finalization';
const intentId = 'pi_paid_finalization';
const createdAt = '2026-09-27T12:00:00.000Z';
const input = { ownerId: 'mock-customer-1', orderId };
let server: Server;
let baseUrl: string;
let mockModeEnabled = true;
let providerStatus = 'succeeded';
let retrieve: Mock<StripeIntentProvider['retrieve']>;
let create: Mock<StripeIntentProvider['create']>;
let cancel: Mock<StripeIntentProvider['cancel']>;

const response = async (id = orderId, ownerId: string | null = input.ownerId, headers: Record<string, string> = {}) => {
  const result = await fetch(`${baseUrl}/api/orders/${id}/refresh-payment`, {
    method: 'POST',
    headers: { ...(ownerId ? { authorization: `Bearer ${createMockToken(ownerId)}` } : {}), ...headers },
    // Client-supplied success, ownership and Payment identities are never authority.
    body: JSON.stringify({ status: 'succeeded', ownerId: input.ownerId, paymentId }),
  });
  return { status: result.status, body: await result.json() };
};
const state = async () => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query(
    `SELECT p.status AS payment_status,c.workflow_status,r.status AS reservation_status,
            o.paid_by_payment_id,i.on_hand,i.reserved,ca.revision AS cart_revision
       FROM checkout_payments p JOIN checkout_claims c ON c.payment_id=p.id
       JOIN checkout_orders o ON o.id=p.order_id JOIN checkout_reservations r ON r.id=c.reservation_id
       JOIN checkout_inventory i ON i.product_id='prod-1' JOIN checkout_carts ca ON ca.cart_id=c.cart_id
       WHERE p.id=$1`,
    [paymentId],
  );
  return row;
};

describe('owner-scoped refresh/return over real HTTP and PostgreSQL', () => {
  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', defineEventHandler);
    vi.stubGlobal('getHeaders', getHeaders);
    vi.stubGlobal('getRouterParam', getRouterParam);
    vi.stubGlobal('createError', createError);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: mockModeEnabled } }));
    const route = (await import('~/server/api/orders/[id]/refresh-payment.post')).default;
    const router = createRouter().post('/api/orders/:id/refresh-payment', route);
    const app = createApp().use(router);
    server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('HTTP test server address unavailable');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    vi.unstubAllGlobals();
  });
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await database.execute("INSERT INTO checkout_inventory (product_id, on_hand, reserved) VALUES ('prod-1', 5, 1)");
    await database.execute(
      `INSERT INTO checkout_carts (owner_id, cart_id, revision, payload_json, updated_at)
       VALUES ('mock-customer-1', 'cart-paid', 1, '{"products":[{"id":"prod-1","stock":1}]}', $1)`,
      [createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
       VALUES ($1, 'mock-customer-1:request-paid', 'fingerprint-paid', '[{"productId":"prod-1","immediateQuantity":1,"backorderQuantity":0}]',
               '2100-01-01T00:00:00.000Z', 'active')`,
      [reservationId],
    );
    await database.execute(
      `INSERT INTO checkout_orders
         (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint,
          payload_json, created_at, updated_at, grand_total_minor, currency)
       VALUES ($1, 'mock-customer-1', 'request-paid', 'cart-paid', 1, 'fingerprint-paid',
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
       VALUES ('mock-customer-1', 'request-paid', 'fingerprint-paid', 'cart-paid', 1, $1, $1,
               $2, $3, $4, 'payment_pending')`,
      [createdAt, orderId, reservationId, paymentId],
    );
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    stripe.enabled.mockReturnValue(true);
    mockModeEnabled = true;
    providerStatus = 'succeeded';
    retrieve = vi.fn(async (): Promise<StripePaymentIntent> => {
      assertOutsideCheckoutTransaction('Test provider retrieve');
      return {
        id: intentId,
        amountMinor: 1234,
        currency: 'RON',
        status: providerStatus,
        clientSecret: 'pi_secret_must_never_leave_refresh',
        metadata: { paymentId, orderId },
      };
    });
    create = vi.fn<StripeIntentProvider['create']>();
    cancel = vi.fn<StripeIntentProvider['cancel']>();
    stripe.reconcilePayment.mockReset();
    stripe.reconcilePayment.mockImplementation(
      createStripeIntentAdapter({ provider: { retrieve, create, cancel }, enabled: () => true }).reconcilePayment,
    );
  });

  it('reconciles success before browser return and commits critical consequences exactly once', async () => {
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'pending' });
    expect(await response()).toEqual({ status: 200, body: { status: 'success', data: { kind: 'completed' } } });
    expect(await state()).toMatchObject({
      payment_status: 'PAID',
      workflow_status: 'finalized',
      reservation_status: 'committed',
      paid_by_payment_id: paymentId,
      on_hand: 4,
      reserved: 0,
      cart_revision: 2,
    });
    expect(await response()).toEqual({ status: 200, body: { status: 'success', data: { kind: 'completed' } } });
    expect(retrieve).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(await state()).toMatchObject({ on_hand: 4, reserved: 0, cart_revision: 2 });
  });

  it('reconciles an otherwise valid recovery-required claim without granting confirmation authority', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_claims SET workflow_status='recovery_required' WHERE payment_id=$1", [paymentId]);
    expect(await readOrderPaymentState(input)).toEqual({ kind: 'recovery-required' });
    expect(await response()).toMatchObject({ body: { data: { kind: 'completed' } } });
    expect(retrieve).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({ workflow_status: 'finalized', on_hand: 4 });
  });

  it('concurrent returns reuse the same payment and apply fulfillment once', async () => {
    const results = await Promise.all([response(), response(), response()]);
    for (const result of results) expect(result).toMatchObject({ status: 200, body: { data: { kind: 'completed' } } });
    expect(await state()).toMatchObject({
      payment_status: 'PAID',
      workflow_status: 'finalized',
      on_hand: 4,
      reserved: 0,
      cart_revision: 2,
    });
    expect(create).not.toHaveBeenCalled();
    expect(retrieve.mock.calls.length).toBeLessThanOrEqual(results.length);
  });

  it('retries a crash gap after PAID without another provider call', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await response()).toMatchObject({ status: 200, body: { data: { kind: 'completed' } } });
    expect(retrieve).not.toHaveBeenCalled();
    expect(await state()).toMatchObject({ workflow_status: 'finalized', on_hand: 4 });
  });

  it('keeps PAID distinct from completion after a rolled-back consequence and retries it', async () => {
    vi.spyOn(orders, 'confirmPayment').mockRejectedValueOnce(new Error('interrupted application finalization'));
    expect(await response()).toMatchObject({ status: 200, body: { data: { kind: 'paid-finalizing' } } });
    expect(await state()).toMatchObject({
      payment_status: 'PAID',
      workflow_status: 'payment_pending',
      reservation_status: 'active',
      paid_by_payment_id: null,
      on_hand: 5,
      reserved: 1,
    });
    expect(await response()).toMatchObject({ body: { data: { kind: 'completed' } } });
    expect(retrieve).toHaveBeenCalledOnce();
  });

  it('leaves an expired paid reservation non-completed without selecting a late-paid commercial policy', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET status='expired',expires_at='2020-01-01' WHERE id=$1", [reservationId]);
    expect(await response()).toMatchObject({ body: { data: { kind: 'paid-finalizing' } } });
    expect(await state()).toMatchObject({ paid_by_payment_id: null, workflow_status: 'payment_pending', on_hand: 5 });
  });

  it.each([
    ['requires_payment_method', 'pending'],
    ['requires_action', 'pending'],
    ['processing', 'processing'],
  ])('returns %s as %s without confirmation authority', async (status, kind) => {
    providerStatus = status;
    expect(await response()).toEqual({ status: 200, body: { status: 'success', data: { kind } } });
    expect(retrieve).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({ workflow_status: 'payment_pending', reservation_status: 'active', paid_by_payment_id: null });
    expect(create).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('terminalizes provider cancellation and permits safe repeated refresh', async () => {
    providerStatus = 'canceled';
    expect(await response()).toMatchObject({ body: { data: { kind: 'canceled' } } });
    expect(await state()).toMatchObject({
      payment_status: 'CANCELED',
      workflow_status: 'canceled',
      reservation_status: 'released',
      reserved: 0,
      on_hand: 5,
    });
    expect(await response()).toMatchObject({ body: { data: { kind: 'canceled' } } });
    expect(retrieve).toHaveBeenCalledOnce();
  });

  it('reports unfinished cancellation cleanup conservatively and retries it', async () => {
    providerStatus = 'canceled';
    vi.spyOn(inventory, 'release').mockRejectedValueOnce(new Error('interrupted release'));
    expect(await response()).toMatchObject({ body: { data: { kind: 'recovery-required' } } });
    expect(await state()).toMatchObject({ payment_status: 'CANCELED', workflow_status: 'payment_pending', reserved: 1 });
    expect(await response()).toMatchObject({ body: { data: { kind: 'canceled' } } });
    expect(retrieve).toHaveBeenCalledOnce();
  });

  it.each(['guest-user-session-foreign-owner', 'mock-admin-1'])(
    'hides the checkout from %s exactly like a missing order',
    async (ownerId) => {
      const before = await state();
      const guest = ownerId.startsWith('guest-user-session-');
      const headers: Record<string, string> = guest ? { cookie: 'guest-session-id=foreign-owner' } : {};
      const foreign = await response(orderId, guest ? null : ownerId, headers);
      const missing = await response('missing-order', guest ? null : ownerId, headers);
      expect(foreign.status).toBe(404);
      expect(missing.status).toBe(404);
      expect(foreign.body.statusMessage).toBe(missing.body.statusMessage);
      expect(retrieve).not.toHaveBeenCalled();
      expect(stripe.reconcilePayment).not.toHaveBeenCalled();
      expect(await state()).toEqual(before);
    },
  );

  it('requires a trusted owner and refuses forged guest tokens', async () => {
    expect((await response(orderId, null)).status).toBe(401);
    expect((await response(orderId, 'guest-user-session-forged')).status).toBe(401);
    mockModeEnabled = false;
    expect((await response(orderId, null, { cookie: 'guest-session-id=forged' })).status).toBe(401);
    expect(stripe.reconcilePayment).not.toHaveBeenCalled();
  });

  it('allows an existing mock guest owner without minting a new identity', async () => {
    const database = await getCheckoutDatabase();
    const guestOwner = 'guest-user-session-refresh-test';
    await withCheckoutTransaction(async () => {
      await database.execute('DELETE FROM checkout_claims WHERE payment_id=$1', [paymentId]);
      await database.execute('UPDATE checkout_orders SET customer_id=$1 WHERE id=$2', [guestOwner, orderId]);
      await database.execute(
        `INSERT INTO checkout_claims (owner_id,request_id,fingerprint,cart_id,cart_revision,created_at,updated_at,
           order_id,reservation_id,payment_id,workflow_status)
         VALUES ($1,'request-paid','fingerprint-paid','cart-paid',1,$2,$2,$3,$4,$5,'payment_pending')`,
        [guestOwner, createdAt, orderId, reservationId, paymentId],
      );
      await database.execute('UPDATE checkout_carts SET owner_id=$1 WHERE cart_id=$2', [guestOwner, 'cart-paid']);
    });
    expect(await response(orderId, null, { cookie: 'guest-session-id=refresh-test' })).toMatchObject({
      body: { data: { kind: 'completed' } },
    });
  });

  it('keeps the production provider gate off before any recovery effects', async () => {
    stripe.enabled.mockReturnValue(false);
    const before = await state();
    expect(await response()).toMatchObject({ status: 503, body: { data: { code: 'stripe_payments_disabled' } } });
    expect(stripe.reconcilePayment).not.toHaveBeenCalled();
    expect(await state()).toEqual(before);
  });

  it.each(['unknown_future_status', 'requires_capture'])('does not infer success from unknown provider outcome %s', async (status) => {
    providerStatus = status;
    expect(await response()).toEqual({ status: 200, body: { status: 'success', data: { kind: 'recovery-required' } } });
    expect(retrieve).toHaveBeenCalledOnce();
    expect(await state()).toMatchObject({ payment_status: 'PENDING', paid_by_payment_id: null, on_hand: 5 });
  });

  it('returns conservative recovery for a provider timeout without retrying the provider', async () => {
    retrieve.mockRejectedValue(new Error('provider unavailable'));
    expect(await response()).toMatchObject({ body: { data: { kind: 'recovery-required' } } });
    expect(retrieve).toHaveBeenCalledOnce();
  });

  it('never creates an intent when the provider identity is unknown', async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'UPDATE checkout_payments SET stripe_payment_intent_id=NULL,stripe_payment_intent_create_started_at=NOW() WHERE id=$1',
      [paymentId],
    );
    expect(await response()).toMatchObject({ body: { data: { kind: 'recovery-required' } } });
    expect(retrieve).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each(['compensation_pending', 'compensation_recovery_required', 'finalized'])(
    'keeps durable REFUND %s separate from ordinary completion',
    async (workflowStatus) => {
      const database = await getCheckoutDatabase();
      await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
      await withCheckoutTransaction(async () => {
        await orders.holdPaidForCompensation({ paymentId, orderId });
        await database.execute(
          "UPDATE checkout_claims SET workflow_status='compensation_pending',paid_recovery_decision='REFUND' WHERE payment_id=$1",
          [paymentId],
        );
      });
      if (workflowStatus === 'finalized') await commitRefundCompensation({ paymentId, orderId });
      else await database.execute('UPDATE checkout_claims SET workflow_status=$1 WHERE payment_id=$2', [workflowStatus, paymentId]);
      expect(await response()).toEqual({
        status: 200,
        body: { status: 'success', data: { kind: 'compensation', recoveryRequired: workflowStatus === 'compensation_recovery_required' } },
      });
      expect(stripe.reconcilePayment).not.toHaveBeenCalled();
      expect(await state()).toMatchObject({ payment_status: 'PAID', on_hand: 5 });
    },
  );

  it('honors a REFUND decision committed while provider retrieval is in flight', async () => {
    const retrieveOriginal = retrieve.getMockImplementation()!;
    retrieve.mockImplementation(async () => {
      const database = await getCheckoutDatabase();
      await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
      await withCheckoutTransaction(async () => {
        await orders.holdPaidForCompensation({ paymentId, orderId });
        await database.execute(
          "UPDATE checkout_claims SET paid_recovery_decision='REFUND',workflow_status='compensation_pending' WHERE payment_id=$1",
          [paymentId],
        );
      });
      return retrieveOriginal(intentId);
    });
    expect(await response()).toMatchObject({ body: { data: { kind: 'compensation', recoveryRequired: false } } });
    expect(await state()).toMatchObject({ on_hand: 5, reservation_status: 'active', workflow_status: 'compensation_pending' });
  });

  it('refuses mismatched stored payment before provider I/O or finalization', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_payments SET amount_minor=999 WHERE id=$1', [paymentId]);
    expect(await response()).toMatchObject({ body: { data: { kind: 'recovery-required' } } });
    expect(stripe.reconcilePayment).not.toHaveBeenCalled();
  });

  it('rejects being wrapped in a retryable PostgreSQL transaction', async () => {
    await expect(
      withCheckoutTransaction(() => createRefreshOrderPayment({ reconcilePayment: stripe.reconcilePayment })(input)),
    ).rejects.toThrow('cannot run inside a checkout transaction');
    expect(stripe.reconcilePayment).not.toHaveBeenCalled();
  });
});
