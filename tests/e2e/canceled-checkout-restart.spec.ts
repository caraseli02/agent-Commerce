import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { getCheckoutDatabase } from '../../server/infrastructure/checkout-database';

test('guest restarts a canceled checkout through HTTP, re-reviews, and creates a new Order', async ({ request }) => {
  const cartResponse = await request.post('/api/cart', {
    data: { products: [{ id: 'prod-1', stock: 1, isFolder: false }] },
  });
  expect(cartResponse.ok()).toBe(true);
  const cart = (await cartResponse.json()).data as { _id: string; userId: string; revision: string };
  const firstPrice = await request.post('/api/orders/price', { data: { order: { cartId: cart._id } } });
  expect(firstPrice.ok()).toBe(true);
  const firstReview = (await firstPrice.json()).data.review as { cartRevision: string; quoteFingerprint: string };

  const suffix = randomUUID();
  const oldOrderId = `ord-canceled-${suffix}`;
  const oldPaymentId = `pay-canceled-${suffix}`;
  const oldReservationId = `res-canceled-${suffix}`;
  const oldRequestId = `request-canceled-${suffix}`;
  const timestamp = new Date().toISOString();
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
     VALUES ($1,$2,'old-fingerprint','[{"productId":"prod-1","immediateQuantity":1,"backorderQuantity":0}]',
             '2100-01-01T00:00:00.000Z','released')`,
    [oldReservationId, `${cart.userId}:${oldRequestId}`],
  );
  await database.execute(
    `INSERT INTO checkout_orders
       (id,customer_id,checkout_request_id,source_cart_id,source_cart_revision,fingerprint,payload_json,
        created_at,updated_at,grand_total_minor,currency)
     VALUES ($1,$2,$3,$4,$5,'old-fingerprint','{"order":{"paymentDetails":{"status":0}}}',
             $6,$6,1234,'RON')`,
    [oldOrderId, cart.userId, oldRequestId, cart._id, Number(cart.revision), timestamp],
  );
  await database.execute(
    `INSERT INTO checkout_payments
       (id,order_id,payload_json,created_at,status,amount_minor,currency,updated_at,stripe_payment_intent_id)
     VALUES ($1,$2,'{}',$3,'CANCELED',1234,'RON',$3,$4)`,
    [oldPaymentId, oldOrderId, timestamp, `pi_${suffix.replaceAll('-', '')}`],
  );
  await database.execute(
    `INSERT INTO checkout_claims
       (owner_id,request_id,fingerprint,cart_id,cart_revision,created_at,updated_at,
        order_id,reservation_id,payment_id,workflow_status)
     VALUES ($1,$2,'old-fingerprint',$3,$4,$5,$5,$6,$7,$8,'canceled')`,
    [cart.userId, oldRequestId, cart._id, Number(cart.revision), timestamp, oldOrderId, oldReservationId, oldPaymentId],
  );

  const restart = await request.post(`/api/orders/${oldOrderId}/restart`);
  expect(restart.ok()).toBe(true);
  const restarted = (await restart.json()).data as { reviewRequired: boolean; cartId: string; cartRevision: string };
  expect(restarted).toEqual({ reviewRequired: true, cartId: cart._id, cartRevision: String(Number(cart.revision) + 1) });
  const repeated = await request.post(`/api/orders/${oldOrderId}/restart`);
  expect((await repeated.json()).data).toEqual(restarted);

  const staleOrder = await request.post('/api/orders/new', {
    data: {
      cartId: cart._id,
      checkoutRequestId: `stale-${suffix}`,
      reviewedCartRevision: firstReview.cartRevision,
      reviewedQuoteFingerprint: firstReview.quoteFingerprint,
      paymentDetails: { type: 0 },
    },
  });
  expect(staleOrder.status()).toBe(409);

  const newPrice = await request.post('/api/orders/price', { data: { order: { cartId: cart._id } } });
  const freshReview = (await newPrice.json()).data.review as { cartRevision: string; quoteFingerprint: string };
  expect(freshReview.cartRevision).toBe(restarted.cartRevision);
  const newOrder = await request.post('/api/orders/new', {
    data: {
      cartId: cart._id,
      checkoutRequestId: `new-${suffix}`,
      reviewedCartRevision: freshReview.cartRevision,
      reviewedQuoteFingerprint: freshReview.quoteFingerprint,
      paymentDetails: { type: 0 },
    },
  });
  expect(newOrder.ok()).toBe(true);
  const newOrderId = (await newOrder.json()).data.orderId as string;
  expect(newOrderId).not.toBe(oldOrderId);
  const [oldPayment] = await database.query<{ status: string }>('SELECT status FROM checkout_payments WHERE id=$1', [oldPaymentId]);
  expect(oldPayment?.status).toBe('CANCELED');
});
