import { beforeEach, describe, expect, it } from 'vitest';
import { bootstrapInventory } from '../server/domain/inventory/bootstrap.mjs';
import { inventoryCatalog } from '../server/domain/inventory/identity.mjs';
import { inventory } from '../server/domain/inventory';
import { getCheckoutDatabase } from '../server/infrastructure/checkout-database';

const future = () => new Date(Date.now() + 900_000);
const items = (productId = 'prod-1', immediateQuantity = 1, backorderQuantity = 0) => [{ productId, immediateQuantity, backorderQuantity }];
const reserve = (reservationKey: string, productId = 'prod-1', quantity = 1) =>
  inventory.reserve({ reservationKey, items: items(productId, quantity), expiresAt: future() });
const balances = async () => (await getCheckoutDatabase()).query('SELECT * FROM checkout_inventory ORDER BY product_id');
const apply = () => bootstrapInventory({ dryRun: false });

beforeEach(async () => {
  await (await getCheckoutDatabase()).execute('TRUNCATE checkout_reservations, checkout_inventory CASCADE');
});

describe('explicit A1 Inventory bootstrap', () => {
  it('plans without writing and safely serializes concurrent/repeated apply', async () => {
    const plan = await bootstrapInventory();
    expect(plan).toEqual({ dryRun: true, missing: inventoryCatalog, preserved: 0 });
    expect(await balances()).toEqual([]);
    const results = await Promise.all([apply(), apply(), apply()]);
    expect(results.map((result) => result.missing.length).sort((a, b) => a - b)).toEqual([0, 0, inventoryCatalog.length]);
    expect(await balances()).toHaveLength(inventoryCatalog.length);
    expect((await apply()).missing).toEqual([]);
  });

  it('never bootstraps on a runtime request, including a backorder-only request', async () => {
    expect((await reserve('missing-balance')).kind).toBe('unavailable');
    expect((await inventory.reserve({ reservationKey: 'backorder', items: items('prod-1', 0, 2), expiresAt: future() })).kind).toBe(
      'unavailable',
    );
    expect((await reserve('unknown', 'unknown-sku')).kind).toBe('unavailable');
    expect(await balances()).toEqual([]);
  });

  it('uses one canonical identity for SKU/ID intent and aggregates aliases before availability checks', async () => {
    await apply();
    const first = await reserve('same', 'MCU-001');
    expect(first.kind).toBe('created');
    if (first.kind !== 'created') throw new Error('Expected canonical reservation');
    expect(first.reservation.items).toEqual(items());
    const replay = await reserve('same');
    expect(replay.kind).toBe('existing');
    if (replay.kind !== 'existing') throw new Error('Expected replay');
    expect(replay.reservation.id).toBe(first.reservation.id);
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_inventory SET on_hand=2 WHERE product_id='prod-1'");
    const duplicate = await inventory.reserve({
      reservationKey: 'duplicate',
      items: [...items(), ...items('MCU-001')],
      expiresAt: future(),
    });
    expect(duplicate).toEqual({ kind: 'unavailable', productId: 'prod-1', requested: 2, available: 1 });
    expect((await balances()).some((row) => row.product_id === 'MCU-001')).toBe(false);
  });

  it('races SKU and canonical calls on one idempotency key without creating a second hold', async () => {
    await apply();
    const results = await Promise.all([reserve('race', 'MCU-001'), reserve('race', 'prod-1')]);
    expect(results.map((result) => result.kind).sort()).toEqual(['created', 'existing']);
    expect((await balances()).find((row) => row.product_id === 'prod-1')).toMatchObject({ reserved: 1 });
    expect(await (await getCheckoutDatabase()).query('SELECT id FROM checkout_reservations')).toHaveLength(1);
  });

  it('serializes bootstrap with a purchase without restoring its units', async () => {
    await apply();
    const reservation = await reserve('purchase-during-bootstrap');
    if (reservation.kind !== 'created') throw new Error('Expected reservation');
    await Promise.all([apply(), inventory.commit(reservation.reservation.id)]);
    expect((await balances()).find((row) => row.product_id === 'prod-1')).toMatchObject({ on_hand: 149, reserved: 0 });
    expect(await inventory.findReservedDrift()).toEqual([]);
  });

  it('preserves purchased units and active/expired held counters and reservation bytes across replay', async () => {
    await apply();
    const purchased = await reserve('purchase', 'MCU-001', 2);
    if (purchased.kind !== 'created') throw new Error('Expected purchase reservation');
    expect((await inventory.commit(purchased.reservation.id)).kind).toBe('committed');
    expect((await inventory.commit(purchased.reservation.id)).kind).toBe('already-committed');
    const held = await reserve('held', 'prod-1', 3);
    if (held.kind !== 'created') throw new Error('Expected held reservation');
    const expired = await reserve('expired', 'prod-1', 4);
    if (expired.kind !== 'created') throw new Error('Expected expired reservation');
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET expires_at='2020-01-01T00:00:00Z' WHERE id=$1", [expired.reservation.id]);
    const before = await balances();
    const reservations = await database.query('SELECT * FROM checkout_reservations ORDER BY id');
    await apply();
    expect(await balances()).toEqual(before);
    expect(await database.query('SELECT * FROM checkout_reservations ORDER BY id')).toEqual(reservations);
    expect(before.find((row) => row.product_id === 'prod-1')).toMatchObject({ on_hand: 148, reserved: 7 });
    expect((await inventory.release(expired.reservation.id)).kind).toBe('expired');
    expect((await inventory.release(held.reservation.id)).kind).toBe('released');
    expect(await inventory.findReservedDrift()).toEqual([]);
  });

  it('accepts SKU intent in paid recovery without rewriting the old reservation identity', async () => {
    await apply();
    const previous = await reserve('paid-recovery');
    if (previous.kind !== 'created') throw new Error('Expected initial reservation');
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_reservations SET expires_at='2020-01-01T00:00:00Z' WHERE id=$1", [previous.reservation.id]);
    const recovered = await inventory.recoverPaidReservation({
      reservationId: previous.reservation.id,
      reservationKey: 'paid-recovery',
      items: items('MCU-001'),
    });
    expect(recovered.kind).toBe('allocated');
    expect((await balances()).find((row) => row.product_id === 'prod-1')).toMatchObject({ on_hand: 149, reserved: 0 });
    const historical = await database.query<{ items_json: string }>('SELECT items_json FROM checkout_reservations WHERE id=$1', [
      previous.reservation.id,
    ]);
    expect(JSON.parse(historical[0]!.items_json)).toEqual(items());
  });

  it.each(['active', 'committed'])('does not choose unsupported-product compensation for a %s reservation', async (status) => {
    await apply();
    const previous = await reserve('unsupported-status');
    if (previous.kind !== 'created') throw new Error('Expected initial reservation');
    const database = await getCheckoutDatabase();
    await database.execute('UPDATE checkout_reservations SET items_json=$1,status=$2 WHERE id=$3', [
      JSON.stringify(items('unsupported')),
      status,
      previous.reservation.id,
    ]);
    const before = await balances();
    expect(
      await inventory.recoverPaidReservation({
        reservationId: previous.reservation.id,
        reservationKey: 'unsupported-status',
        items: items('unsupported'),
      }),
    ).toEqual({ kind: 'retry' });
    expect(await balances()).toEqual(before);
    expect((await database.query('SELECT status FROM checkout_reservations'))[0]?.status).toBe(status);
  });

  it('preserves reserved > on_hand during lazy expiry', async () => {
    await apply();
    await (await getCheckoutDatabase()).execute("UPDATE checkout_inventory SET on_hand=0, reserved=2 WHERE product_id='prod-1'");
    await apply();
    expect((await balances()).find((row) => row.product_id === 'prod-1')).toMatchObject({ on_hand: 0, reserved: 2 });
  });

  it.each(['MCU-001', 'unknown'])('rejects historical inventory key %s before any inserts', async (key) => {
    const database = await getCheckoutDatabase();
    await database.execute('INSERT INTO checkout_inventory VALUES ($1, 1, 0)', [key]);
    const before = await balances();
    await expect(apply()).rejects.toThrow(/Inventory reconciliation required/);
    await expect(bootstrapInventory()).rejects.toThrow(/canonical ID|Unknown inventory key/);
    expect(await balances()).toEqual(before);
  });

  it.each(['MCU-001', 'prod-1', 'unknown'])('refuses to restore stock underneath historical reservation %s', async (identity) => {
    const database = await getCheckoutDatabase();
    await database.execute("INSERT INTO checkout_reservations VALUES ('historical','key','fingerprint',$1,'2020-01-01','committed')", [
      JSON.stringify(items(identity)),
    ]);
    await expect(apply()).rejects.toThrow(/Historical reservation/);
    expect(await balances()).toEqual([]);
  });

  it('rejects malformed reservation quantities with no partial bootstrap', async () => {
    const database = await getCheckoutDatabase();
    await database.execute("INSERT INTO checkout_inventory VALUES ('prod-1', 4, 0)");
    await database.execute("INSERT INTO checkout_reservations VALUES ('bad','key','fingerprint',$1,'2020-01-01','active')", [
      JSON.stringify(items('prod-1', -1)),
    ]);
    await expect(apply()).rejects.toThrow(/Malformed quantities/);
    expect(await balances()).toEqual([{ product_id: 'prod-1', on_hand: 4, reserved: 0 }]);
  });

  it.each([-1, 0.5, NaN, Infinity, 2_147_483_648])('rejects invalid boundary quantity %s without writing', async (quantity) => {
    await apply();
    const before = await balances();
    await expect(reserve('bad-quantity', 'prod-1', quantity)).rejects.toThrow(/Invalid Inventory quantities/);
    expect(await balances()).toEqual(before);
    expect(await (await getCheckoutDatabase()).query('SELECT * FROM checkout_reservations')).toEqual([]);
  });

  it('reports legacy negative balances before changing any rows', async () => {
    const database = await getCheckoutDatabase();
    // Model a pre-011 schema in this isolated test schema only.
    await database.execute(
      'ALTER TABLE checkout_inventory DROP CONSTRAINT inventory_on_hand_nonnegative, DROP CONSTRAINT inventory_reserved_nonnegative',
    );
    try {
      for (const [onHand, reserved] of [
        [-1, 0],
        [1, -1],
      ]) {
        await database.execute(
          "INSERT INTO checkout_inventory VALUES ('prod-1',$1,$2) ON CONFLICT (product_id) DO UPDATE SET on_hand=$1,reserved=$2",
          [onHand!, reserved!],
        );
        await expect(apply()).rejects.toThrow(/Invalid balances for prod-1/);
        expect(await balances()).toEqual([{ product_id: 'prod-1', on_hand: onHand, reserved }]);
      }
    } finally {
      await database.execute('TRUNCATE checkout_inventory CASCADE');
      await database.execute(
        'ALTER TABLE checkout_inventory ADD CONSTRAINT inventory_on_hand_nonnegative CHECK (on_hand >= 0), ADD CONSTRAINT inventory_reserved_nonnegative CHECK (reserved >= 0)',
      );
    }
  });

  it('refuses corrupt counter deltas atomically and enforces independent nonnegative persistence counters', async () => {
    await apply();
    const result = await reserve('counter');
    if (result.kind !== 'created') throw new Error('Expected reservation');
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_inventory SET reserved=0 WHERE product_id='prod-1'");
    await expect(inventory.commit(result.reservation.id)).rejects.toThrow(/reconciliation required/);
    expect((await database.query('SELECT status FROM checkout_reservations'))[0]?.status).toBe('active');
    await expect(database.execute("UPDATE checkout_inventory SET on_hand=-1 WHERE product_id='prod-1'")).rejects.toThrow();
    await expect(database.execute("UPDATE checkout_inventory SET reserved=-1 WHERE product_id='prod-1'")).rejects.toThrow();
  });
});
