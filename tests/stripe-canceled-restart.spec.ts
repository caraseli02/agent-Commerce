import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { restartCanceledCheckout } from '~~/server/application/checkout/restart-canceled-checkout';
import { createCheckoutReviewFingerprint } from '~~/server/application/checkout/review-fingerprint';
import { placeOrder } from '~~/server/application/checkout/place-order';
import { cart } from '~~/server/domain/cart';
import { catalog } from '~~/server/domain/catalog';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';
import { createMockGuestCheckoutUser } from '~~/server/utils/mockUsers';

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return { ...actual, getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name] };
});

const ownerId = 'guest-user-session-explicit-restart';
const cartId = 'cart-restart';
const orderId = 'ord-restart';
const paymentId = 'pay-restart';
const reservationId = 'res-restart';
const createdAt = '2026-09-29T08:00:00.000Z';
const cartPayload = JSON.stringify({ products: [{ id: 'prod-1', stock: 1, backorder_stock: 0 }] });

const state = async () => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<{
    revision: number;
    payload_json: string;
    workflow_status: string;
    payment_status: string;
  }>(
    `SELECT cart.revision, cart.payload_json, claim.workflow_status, payment.status AS payment_status
       FROM checkout_claims claim
       JOIN checkout_carts cart ON cart.cart_id=claim.cart_id
       JOIN checkout_payments payment ON payment.id=claim.payment_id
      WHERE claim.order_id=$1`,
    [orderId],
  );
  return row;
};

describe('explicit restart of a provider-canceled checkout', () => {
  beforeAll(() => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
    vi.stubGlobal('getRouterParam', (event: { params?: Record<string, string> }, name: string) => event.params?.[name]);
    vi.stubGlobal('getHeaders', (event: { headers?: Record<string, string> }) => event.headers ?? {});
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: true } }));
    vi.stubGlobal('createError', (payload: { statusCode: number; statusMessage: string; data?: unknown }) =>
      Object.assign(new Error(payload.statusMessage), payload),
    );
  });

  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await database.execute('INSERT INTO checkout_carts (owner_id, cart_id, revision, payload_json, updated_at) VALUES ($1,$2,1,$3,$4)', [
      ownerId,
      cartId,
      cartPayload,
      createdAt,
    ]);
    await database.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-1',5,0)");
    await database.execute(
      `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
       VALUES ($1,$2,'old-fingerprint','[{"productId":"prod-1","immediateQuantity":1,"backorderQuantity":0}]',
               '2100-01-01T00:00:00.000Z','released')`,
      [reservationId, `${ownerId}:old-request`],
    );
    await database.execute(
      `INSERT INTO checkout_orders
         (id,customer_id,checkout_request_id,source_cart_id,source_cart_revision,fingerprint,payload_json,
          created_at,updated_at,grand_total_minor,currency)
       VALUES ($1,$2,'old-request',$3,1,'old-fingerprint','{"order":{"paymentDetails":{"status":0}}}',
               $4,$4,1234,'RON')`,
      [orderId, ownerId, cartId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_payments
         (id,order_id,payload_json,created_at,status,amount_minor,currency,updated_at,stripe_payment_intent_id)
       VALUES ($1,$2,'{}',$3,'CANCELED',1234,'RON',$3,'pi_restart_old')`,
      [paymentId, orderId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_claims
         (owner_id,request_id,fingerprint,cart_id,cart_revision,created_at,updated_at,
          order_id,reservation_id,payment_id,workflow_status)
       VALUES ($1,'old-request','old-fingerprint',$2,1,$3,$3,$4,$5,$6,'canceled')`,
      [ownerId, cartId, createdAt, orderId, reservationId, paymentId],
    );
  });

  it('mints a new revision without changing cart contents or reopening the old claim', async () => {
    expect(await restartCanceledCheckout({ ownerId, orderId })).toEqual({
      kind: 'review-required',
      cartId,
      cartRevision: '2',
    });
    expect(await state()).toEqual({
      revision: 2,
      payload_json: cartPayload,
      workflow_status: 'canceled',
      payment_status: 'CANCELED',
    });
  });

  it('does not mint extra revisions on repeated or concurrent restart requests', async () => {
    const results = await Promise.all([restartCanceledCheckout({ ownerId, orderId }), restartCanceledCheckout({ ownerId, orderId })]);
    expect(results).toEqual([
      { kind: 'review-required', cartId, cartRevision: '2' },
      { kind: 'review-required', cartId, cartRevision: '2' },
    ]);
    expect(await restartCanceledCheckout({ ownerId, orderId })).toMatchObject({ cartRevision: '2' });
    expect((await state())?.revision).toBe(2);
  });

  it('uses a newer buyer-edited cart revision without changing its contents', async () => {
    const database = await getCheckoutDatabase();
    const changedPayload = JSON.stringify({ products: [{ id: 'prod-1', stock: 2, backorder_stock: 0 }] });
    await database.execute('UPDATE checkout_carts SET revision=3,payload_json=$1 WHERE cart_id=$2', [changedPayload, cartId]);

    expect(await restartCanceledCheckout({ ownerId, orderId })).toMatchObject({ kind: 'review-required', cartRevision: '3' });
    expect(await state()).toMatchObject({ revision: 3, payload_json: changedPayload });
  });

  it('rejects foreign, missing, noncanceled, paid, and empty checkout contexts without advancing the cart', async () => {
    const database = await getCheckoutDatabase();
    expect(await restartCanceledCheckout({ ownerId: 'mock-customer-2', orderId })).toEqual({ kind: 'not-found' });
    expect(await restartCanceledCheckout({ ownerId, orderId: 'missing' })).toEqual({ kind: 'not-found' });
    await database.execute("UPDATE checkout_claims SET workflow_status='payment_pending' WHERE order_id=$1", [orderId]);
    expect(await restartCanceledCheckout({ ownerId, orderId })).toEqual({ kind: 'not-canceled' });
    await database.execute("UPDATE checkout_claims SET workflow_status='canceled' WHERE order_id=$1", [orderId]);
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await restartCanceledCheckout({ ownerId, orderId })).toEqual({ kind: 'not-canceled' });
    await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
    await database.execute('UPDATE checkout_orders SET paid_by_payment_id=$1 WHERE id=$2', [paymentId, orderId]);
    expect(await restartCanceledCheckout({ ownerId, orderId })).toEqual({ kind: 'not-canceled' });
    await database.execute('UPDATE checkout_orders SET paid_by_payment_id=NULL WHERE id=$1', [orderId]);
    await database.execute('UPDATE checkout_carts SET payload_json=$1 WHERE cart_id=$2', ['{"products":[]}', cartId]);
    expect(await restartCanceledCheckout({ ownerId, orderId })).toEqual({ kind: 'cart-empty' });
    expect((await state())?.revision).toBe(1);
  });

  it('exposes an owner-scoped route without fabricating a guest session', async () => {
    const { createMockToken } = await import('~~/server/utils/mockUsers');
    const route = (await import('~~/server/api/orders/[id]/restart.post')).default as (event: unknown) => Promise<unknown>;
    const own = { headers: {}, cookies: { 'guest-session-id': 'explicit-restart' }, params: { id: orderId } };

    await expect(route({ headers: {}, params: { id: orderId } })).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      route({ headers: { authorization: `Bearer ${createMockToken('mock-admin-1')}` }, params: { id: orderId } }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(route(own)).resolves.toEqual({
      status: 'success',
      data: { reviewRequired: true, cartId, cartRevision: '2' },
    });
  });

  it('requires a fresh quote and a distinct checkout request before PlaceOrder creates new identities', async () => {
    const user = createMockGuestCheckoutUser(ownerId);
    const order = { paymentDetails: { type: 0 } };
    const oldQuote = await catalog.quoteCheckout({ customer: user, items: [{ productId: 'prod-1', quantity: 1 }] });
    expect(oldQuote.kind).toBe('quoted');
    if (oldQuote.kind !== 'quoted') return;
    const oldFingerprint = createCheckoutReviewFingerprint('1', oldQuote.quote);

    await restartCanceledCheckout({ ownerId, orderId });
    await expect(
      placeOrder({
        checkoutRequestId: 'old-request',
        cartId,
        cartOwnerId: ownerId,
        user,
        order,
        reviewedCartRevision: '1',
        reviewedQuoteFingerprint: oldFingerprint,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    const snapshot = await cart.getSnapshot({ cartId, ownerId });
    expect(snapshot.kind).toBe('found');
    if (snapshot.kind !== 'found') return;
    const freshQuote = await catalog.quoteCheckout({ customer: user, items: [{ productId: 'prod-1', quantity: 1 }] });
    expect(freshQuote.kind).toBe('quoted');
    if (freshQuote.kind !== 'quoted') return;
    const newOrder = await placeOrder({
      checkoutRequestId: 'new-request',
      cartId,
      cartOwnerId: ownerId,
      user,
      order,
      reviewedCartRevision: snapshot.snapshot.revision,
      reviewedQuoteFingerprint: createCheckoutReviewFingerprint(snapshot.snapshot.revision, freshQuote.quote),
    });
    expect(newOrder.orderId).not.toBe(orderId);
    const database = await getCheckoutDatabase();
    const claims = await database.query<{ order_id: string; payment_id: string; cart_revision: number }>(
      'SELECT order_id,payment_id,cart_revision FROM checkout_claims WHERE owner_id=$1 ORDER BY cart_revision',
      [ownerId],
    );
    expect(claims).toHaveLength(2);
    expect(claims[0]).toMatchObject({ order_id: orderId, payment_id: paymentId, cart_revision: 1 });
    expect(claims[1]).toMatchObject({ order_id: newOrder.orderId, cart_revision: 2 });
    expect(claims[1]?.payment_id).not.toBe(paymentId);
    expect((await state())?.payment_status).toBe('CANCELED');
  });
});
