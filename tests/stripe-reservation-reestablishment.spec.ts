import { Pool } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';
import { reestablishCheckoutReservation } from '~~/server/application/checkout/reestablish-reservation';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';

const ownerId = 'owner-reservation-reestablishment';
const orderId = 'ord-reservation-reestablishment';
const paymentId = 'pay-reservation-reestablishment';
const oldReservationId = 'res-reservation-reestablishment';
const createdAt = '2026-09-29T13:00:00.000Z';
const items = [{ productId: 'prod-1', immediateQuantity: 2, backorderQuantity: 0 }];

const state = async () => {
  const database = await getCheckoutDatabase();
  const [claim] = await database.query<{ reservation_id: string; workflow_status: string }>(
    'SELECT reservation_id, workflow_status FROM checkout_claims WHERE order_id=$1',
    [orderId],
  );
  const reservations = await database.query<{ id: string; status: string; items_json: string }>(
    'SELECT id, status, items_json FROM checkout_reservations ORDER BY id',
  );
  const [stock] = await database.query<{ on_hand: number; reserved: number }>(
    "SELECT on_hand, reserved FROM checkout_inventory WHERE product_id='prod-1'",
  );
  return { claim, reservations, stock };
};

describe('checkout reservation re-establishment', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute(
      'TRUNCATE checkout_stripe_webhook_events, checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
    );
    await database.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-1',5,0)");
    await database.execute(
      `INSERT INTO checkout_carts (owner_id,cart_id,revision,payload_json,updated_at)
       VALUES ($1,'cart-reservation-reestablishment',1,'{"products":[]}',$2)`,
      [ownerId, createdAt],
    );
    await database.execute(
      `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
       VALUES ($1,'old-reservation-reestablishment','frozen-items',$2,'2020-01-01T00:00:00.000Z','expired')`,
      [oldReservationId, JSON.stringify(items)],
    );
    await database.execute(
      `INSERT INTO checkout_orders
         (id,customer_id,checkout_request_id,source_cart_id,source_cart_revision,fingerprint,payload_json,
          created_at,updated_at,grand_total_minor,currency)
       VALUES ($1,$2,'request-reservation-reestablishment','cart-reservation-reestablishment',1,'order-fingerprint',
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
       VALUES ($1,'request-reservation-reestablishment','order-fingerprint','cart-reservation-reestablishment',1,
               $2,$2,$3,$4,$5,'payment_pending')`,
      [ownerId, createdAt, orderId, oldReservationId, paymentId],
    );
  });

  it('links one fresh reservation for the frozen quantities without reviving the expired one', async () => {
    const result = await reestablishCheckoutReservation({ ownerId, orderId });
    expect(result.kind).toBe('ready');
    const after = await state();
    expect(after.claim).toMatchObject({
      reservation_id: result.kind === 'ready' ? result.reservationId : '',
      workflow_status: 'payment_pending',
    });
    expect(after.reservations).toHaveLength(2);
    expect(after.reservations.find((reservation) => reservation.id === oldReservationId)?.status).toBe('expired');
    expect(after.reservations.find((reservation) => reservation.id === after.claim?.reservation_id)).toMatchObject({
      status: 'active',
      items_json: JSON.stringify(items),
    });
    expect(after.stock).toEqual({ on_hand: 5, reserved: 2 });
  });

  it('leaves the claim unchanged when current stock cannot cover the frozen quantity', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_inventory SET on_hand=1 WHERE product_id='prod-1'");

    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toEqual({
      kind: 'unavailable',
      productId: 'prod-1',
      requested: 2,
      available: 1,
    });
    expect(await state()).toMatchObject({
      claim: { reservation_id: oldReservationId, workflow_status: 'payment_pending' },
      stock: { on_hand: 1, reserved: 0 },
    });
    expect((await state()).reservations).toHaveLength(1);
  });

  it('reuses the single replacement on concurrent and repeated calls', async () => {
    const results = await Promise.all([
      reestablishCheckoutReservation({ ownerId, orderId }),
      reestablishCheckoutReservation({ ownerId, orderId }),
    ]);
    expect(results[0]).toMatchObject({ kind: 'ready' });
    expect(results[1]).toEqual(results[0]);
    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toEqual(results[0]);
    expect((await state()).reservations).toHaveLength(2);
    expect((await state()).stock).toEqual({ on_hand: 5, reserved: 2 });
  });

  it('keeps a valid active reservation without reserving stock again', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET status='active',expires_at='2100-01-01T00:00:00.000Z' WHERE id=$1", [
      oldReservationId,
    ]);
    await database.execute("UPDATE checkout_inventory SET reserved=2 WHERE product_id='prod-1'");

    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toEqual({ kind: 'ready', reservationId: oldReservationId });
    expect((await state()).reservations).toHaveLength(1);
    expect((await state()).stock).toEqual({ on_hand: 5, reserved: 2 });
  });

  it('expires a past-due active reservation before checking current stock', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET status='active' WHERE id=$1", [oldReservationId]);
    await database.execute("UPDATE checkout_inventory SET reserved=2 WHERE product_id='prod-1'");

    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toMatchObject({ kind: 'ready' });
    expect((await state()).stock).toEqual({ on_hand: 5, reserved: 2 });
    expect((await state()).reservations.find((reservation) => reservation.id === oldReservationId)?.status).toBe('expired');
  });

  it('refuses foreign, paid, canceled, and finalized checkouts', async () => {
    const database = await getCheckoutDatabase();
    expect(await reestablishCheckoutReservation({ ownerId: 'another-owner', orderId })).toEqual({ kind: 'not-found' });
    expect(await reestablishCheckoutReservation({ ownerId, orderId: 'missing' })).toEqual({ kind: 'not-found' });
    await database.execute("UPDATE checkout_payments SET status='PAID' WHERE id=$1", [paymentId]);
    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toEqual({ kind: 'not-payable' });
    await database.execute("UPDATE checkout_payments SET status='CANCELED' WHERE id=$1", [paymentId]);
    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toEqual({ kind: 'not-payable' });
    await database.execute("UPDATE checkout_payments SET status='PENDING' WHERE id=$1", [paymentId]);
    await database.execute("UPDATE checkout_claims SET workflow_status='finalized' WHERE order_id=$1", [orderId]);
    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toEqual({ kind: 'not-payable' });
    expect((await state()).reservations).toHaveLength(1);
    expect((await state()).stock).toEqual({ on_hand: 5, reserved: 0 });
  });

  it.each(['PAID', 'CANCELED'] as const)('refuses renewal when a concurrent %s transition wins', async (status) => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const client = await pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      await client.query('SELECT 1 FROM checkout_claims WHERE order_id=$1 FOR UPDATE', [orderId]);
      const renewal = reestablishCheckoutReservation({ ownerId, orderId });
      await client.query('UPDATE checkout_payments SET status=$1 WHERE id=$2', [status, paymentId]);
      await client.query('COMMIT');
      committed = true;
      expect(await renewal).toEqual({ kind: 'not-payable' });
    } finally {
      if (!committed) await client.query('ROLLBACK');
      client.release();
      await pool.end();
    }
    expect((await state()).claim?.reservation_id).toBe(oldReservationId);
    expect((await state()).reservations).toHaveLength(1);
    expect((await state()).stock).toEqual({ on_hand: 5, reserved: 0 });
  });

  it('rolls back a new reservation if the claim cannot be rebound', async () => {
    const database = await getCheckoutDatabase();
    await database.execute(`CREATE FUNCTION fail_reservation_rebind() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'claim rebind failed'; END $$`);
    await database.execute(`CREATE TRIGGER fail_reservation_rebind BEFORE UPDATE ON checkout_claims
      FOR EACH ROW EXECUTE FUNCTION fail_reservation_rebind()`);
    try {
      await expect(reestablishCheckoutReservation({ ownerId, orderId })).rejects.toThrow('claim rebind failed');
    } finally {
      await database.execute('DROP TRIGGER fail_reservation_rebind ON checkout_claims');
      await database.execute('DROP FUNCTION fail_reservation_rebind()');
    }
    expect((await state()).claim?.reservation_id).toBe(oldReservationId);
    expect((await state()).reservations).toHaveLength(1);
    expect((await state()).stock).toEqual({ on_hand: 5, reserved: 0 });
    expect(await reestablishCheckoutReservation({ ownerId, orderId })).toMatchObject({ kind: 'ready' });
  });
});
