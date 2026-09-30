import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createResumeOrderPayment } from '~/server/application/checkout/resume-order-payment';
import { createStripeIntentAdapter } from '~/server/domain/payments';
import type { StripeIntentProvider, StripePaymentIntent } from '~/server/domain/payments/stripe-intents';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

const ownerId = 'owner-unpaid-resume';
const orderId = 'ord-unpaid-resume';
const paymentId = 'pay-unpaid-resume';
const reservationId = 'res-unpaid-resume';
const createdAt = '2026-09-29T13:00:00.000Z';
const items = [{ productId: 'prod-1', immediateQuantity: 2, backorderQuantity: 0 }];

const fakeProvider = (status: StripePaymentIntent['status'] = 'requires_payment_method') => {
  const intent: StripePaymentIntent = {
    id: 'pi_unpaid_resume',
    amountMinor: 1234,
    currency: 'RON',
    status,
    clientSecret: 'pi_unpaid_resume_secret_test',
    metadata: { paymentId, orderId },
  };
  const create = vi.fn(async () => {
    assertOutsideCheckoutTransaction('Fake Stripe create');
    return intent;
  });
  const retrieve = vi.fn(async () => {
    assertOutsideCheckoutTransaction('Fake Stripe retrieve');
    return intent;
  });
  const cancel = vi.fn(async () => intent);
  const provider: StripeIntentProvider = { create, retrieve, cancel };
  return { provider, create, retrieve };
};

describe('unpaid checkout resume', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await database.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-1',5,0)");
    await database.execute(
      `INSERT INTO checkout_carts (owner_id,cart_id,revision,payload_json,updated_at)
       VALUES ($1,'cart-unpaid-resume',1,'{"products":[]}',$2)`,
      [ownerId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
       VALUES ($1,'old-unpaid-resume','frozen-items',$2,'2020-01-01T00:00:00.000Z','expired')`,
      [reservationId, JSON.stringify(items)],
    );
    await database.execute(
      `INSERT INTO checkout_orders
         (id,customer_id,checkout_request_id,source_cart_id,source_cart_revision,fingerprint,payload_json,
          created_at,updated_at,grand_total_minor,currency)
       VALUES ($1,$2,'request-unpaid-resume','cart-unpaid-resume',1,'order-fingerprint',
               '{"order":{"paymentDetails":{"status":0}}}',$3,$3,1234,'RON')`,
      [orderId, ownerId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_payments
         (id,order_id,payload_json,created_at,status,amount_minor,currency,updated_at)
       VALUES ($1,$2,'{}',$3,'PENDING',1234,'RON',$3)`,
      [paymentId, orderId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_claims
         (owner_id,request_id,fingerprint,cart_id,cart_revision,created_at,updated_at,
          order_id,reservation_id,payment_id,workflow_status)
       VALUES ($1,'request-unpaid-resume','order-fingerprint','cart-unpaid-resume',1,
               $2,$2,$3,$4,$5,'payment_pending')`,
      [ownerId, createdAt, orderId, reservationId, paymentId],
    );
  });

  it('re-establishes expired stock and returns the existing PaymentIntent action for the same checkout', async () => {
    const fake = fakeProvider();
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({
      kind: 'requires-action',
      nextAction: { type: 'client-secret', clientSecret: 'pi_unpaid_resume_secret_test' },
    });

    const database = await getCheckoutDatabase();
    const [claim] = await database.query<{ reservation_id: string; payment_id: string }>(
      'SELECT reservation_id,payment_id FROM checkout_claims WHERE order_id=$1',
      [orderId],
    );
    const [stock] = await database.query<{ reserved: number }>("SELECT reserved FROM checkout_inventory WHERE product_id='prod-1'");
    expect(claim?.reservation_id).not.toBe(reservationId);
    expect(claim?.payment_id).toBe(paymentId);
    expect(stock?.reserved).toBe(2);
    expect(fake.create).toHaveBeenCalledOnce();
  });

  it('withholds a client secret when checkout cancellation wins after provider continuation', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true });
    const resumeOrderPayment = createResumeOrderPayment({
      initiatePayment: async (input) => {
        const result = await adapter.initiatePayment(input);
        const database = await getCheckoutDatabase();
        await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
        await database.execute("UPDATE checkout_claims SET workflow_status='canceled' WHERE order_id=$1", [orderId]);
        return result;
      },
    });

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'not-payable' });
  });

  it('withholds a client secret when paid truth wins after provider continuation', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true });
    const resumeOrderPayment = createResumeOrderPayment({
      initiatePayment: async (input) => {
        const result = await adapter.initiatePayment(input);
        const database = await getCheckoutDatabase();
        await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
        return result;
      },
    });

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'not-payable' });
  });

  it('withholds a client secret when the renewed reservation expires during provider continuation', async () => {
    const fake = fakeProvider();
    const adapter = createStripeIntentAdapter({ provider: fake.provider, enabled: () => true });
    const resumeOrderPayment = createResumeOrderPayment({
      initiatePayment: async (input) => {
        const result = await adapter.initiatePayment(input);
        const database = await getCheckoutDatabase();
        await database.execute(
          `UPDATE checkout_reservations SET expires_at='2020-01-01T00:00:00.000Z'
            WHERE id=(SELECT reservation_id FROM checkout_claims WHERE order_id=$1)`,
          [orderId],
        );
        return result;
      },
    });

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'recovery-required' });
    const database = await getCheckoutDatabase();
    const [stock] = await database.query<{ reserved: number }>("SELECT reserved FROM checkout_inventory WHERE product_id='prod-1'");
    expect(stock?.reserved).toBe(0);
  });

  it('does not start Stripe when the frozen Order quantity is unavailable', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_inventory SET on_hand=1 WHERE product_id='prod-1'");
    const fake = fakeProvider();
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({
      kind: 'unavailable',
      productId: 'prod-1',
      requested: 2,
      available: 1,
    });
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.retrieve).not.toHaveBeenCalled();
  });

  it('reports an existing processing intent without creating another one', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PROCESSING',stripe_payment_intent_id='pi_unpaid_resume' WHERE id=$1", [
      paymentId,
    ]);
    const fake = fakeProvider('processing');
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'processing' });
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.retrieve).toHaveBeenCalledOnce();
  });

  it('keeps a provider-canceled intent in recovery until local checkout terminalization commits', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET stripe_payment_intent_id='pi_unpaid_resume' WHERE id=$1", [paymentId]);
    const fake = fakeProvider('canceled');
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'recovery-required' });
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.retrieve).toHaveBeenCalledOnce();
  });

  it('reuses an active reservation and the same PaymentIntent on repeated resumes', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET status='active',expires_at='2100-01-01T00:00:00.000Z' WHERE id=$1", [
      reservationId,
    ]);
    await database.execute("UPDATE checkout_inventory SET reserved=2 WHERE product_id='prod-1'");
    const fake = fakeProvider();
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    const first = await resumeOrderPayment({ ownerId, orderId });
    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual(first);
    expect(first).toMatchObject({ kind: 'requires-action' });
    expect(fake.create).toHaveBeenCalledOnce();
    const [count] = await database.query<{ total: number }>('SELECT COUNT(*)::int AS total FROM checkout_reservations');
    expect(count?.total).toBe(1);
  });

  it('keeps one reservation and one PaymentIntent identity for concurrent resumes', async () => {
    const fake = fakeProvider();
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    const results = await Promise.all([resumeOrderPayment({ ownerId, orderId }), resumeOrderPayment({ ownerId, orderId })]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toMatchObject({ kind: 'requires-action' });
    const database = await getCheckoutDatabase();
    const [payment] = await database.query<{ stripe_payment_intent_id: string }>(
      'SELECT stripe_payment_intent_id FROM checkout_payments WHERE id=$1',
      [paymentId],
    );
    const [reservations] = await database.query<{ total: number }>('SELECT COUNT(*)::int AS total FROM checkout_reservations');
    const [stock] = await database.query<{ reserved: number }>("SELECT reserved FROM checkout_inventory WHERE product_id='prod-1'");
    expect(payment?.stripe_payment_intent_id).toBe('pi_unpaid_resume');
    expect(reservations?.total).toBe(2);
    expect(stock?.reserved).toBe(2);
  });

  it('does not contact Stripe for another owner or a terminal checkout', async () => {
    const fake = fakeProvider();
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));
    expect(await resumeOrderPayment({ ownerId: 'different-owner', orderId })).toEqual({ kind: 'not-found' });
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'not-payable' });
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.retrieve).not.toHaveBeenCalled();
  });

  it('does not expose a payment action when persisted Order and Payment money disagree', async () => {
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_orders SET grand_total_minor=4321 WHERE id=$1', [orderId]);
    const fake = fakeProvider();
    const resumeOrderPayment = createResumeOrderPayment(createStripeIntentAdapter({ provider: fake.provider, enabled: () => true }));

    expect(await resumeOrderPayment({ ownerId, orderId })).toEqual({ kind: 'recovery-required' });
    expect(fake.create).not.toHaveBeenCalled();
    const [claim] = await database.query<{ reservation_id: string }>('SELECT reservation_id FROM checkout_claims WHERE order_id=$1', [
      orderId,
    ]);
    const [stock] = await database.query<{ reserved: number }>("SELECT reserved FROM checkout_inventory WHERE product_id='prod-1'");
    expect(claim?.reservation_id).toBe(reservationId);
    expect(stock?.reserved).toBe(0);
  });
});
