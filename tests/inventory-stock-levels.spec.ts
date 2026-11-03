import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { inventory, MAX_AVAILABILITY_BATCH } from '~~/server/domain/inventory';
import { getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

const future = () => new Date(Date.now() + 15 * 60 * 1000);

const setCounter = async (productId: string, onHand: number, reserved = 0) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_inventory (product_id, on_hand, reserved) VALUES ($1, $2, $3)
     ON CONFLICT (product_id) DO UPDATE SET on_hand = EXCLUDED.on_hand, reserved = EXCLUDED.reserved`,
    [productId, onHand, reserved],
  );
};

// An abandoned checkout: still `active` and counted in `reserved`, but expired in the past.
const seedAbandoned = async (productId: string, quantity: number) => {
  const database = await getCheckoutDatabase();
  const id = `res-${randomUUID()}`;
  await database.execute(
    `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
     VALUES ($1, $2, 'abandoned', $3, '2020-01-01T00:00:00.000Z', 'active')`,
    [id, `abandoned:${id}`, JSON.stringify([{ productId, immediateQuantity: quantity, backorderQuantity: 0 }])],
  );
  await database.execute('UPDATE checkout_inventory SET reserved = reserved + $1 WHERE product_id = $2', [quantity, productId]);
};

const reserve = (productId: string, immediateQuantity: number) =>
  withCheckoutTransaction(() =>
    inventory.reserve({
      reservationKey: `live:${randomUUID()}`,
      items: [{ productId, immediateQuantity, backorderQuantity: 0 }],
      expiresAt: future(),
    }),
  );

const snapshotTables = async () => {
  const database = await getCheckoutDatabase();
  return {
    inventory: await database.query('SELECT * FROM checkout_inventory ORDER BY product_id'),
    reservations: await database.query('SELECT id, status FROM checkout_reservations ORDER BY id'),
  };
};

describe('Inventory stock levels parity (#844)', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute('TRUNCATE checkout_reservations, checkout_inventory, checkout_carts CASCADE');
  });

  it.each([
    {
      name: 'no holds',
      onHand: 12,
      seed: async () => {},
      expectedHeld: 0,
      expectedAvailable: 12,
    },
    {
      name: 'live active holds',
      onHand: 12,
      seed: async () => {
        expect((await reserve('prod-1', 5)).kind).toBe('created');
      },
      expectedHeld: 5,
      expectedAvailable: 7,
    },
    {
      name: 'expired active holds only',
      onHand: 12,
      seed: async () => {
        await seedAbandoned('prod-1', 4);
      },
      expectedHeld: 0,
      expectedAvailable: 12,
    },
    {
      name: 'combined live and expired active holds',
      onHand: 10,
      seed: async () => {
        await seedAbandoned('prod-1', 4);
        expect((await reserve('prod-1', 3)).kind).toBe('created');
      },
      expectedHeld: 3,
      expectedAvailable: 7,
    },
  ])(
    'matches readAvailability and satisfies onHand - effectiveHeld = available for $name',
    async ({ onHand, seed, expectedHeld, expectedAvailable }) => {
      await setCounter('prod-1', onHand);
      await seed();
      const before = await snapshotTables();

      const ids = ['prod-1', 'prod-2', 'MCU-001', 'unknown-id'];
      const [levels, availability] = await Promise.all([inventory.readStockLevels(ids), inventory.readAvailability(ids)]);

      expect(levels).toEqual([
        {
          productId: 'prod-1',
          state: 'tracked',
          onHand,
          effectiveHeld: expectedHeld,
          available: expectedAvailable,
        },
        { productId: 'prod-2', state: 'untracked' },
        { productId: 'MCU-001', state: 'untracked' },
        { productId: 'unknown-id', state: 'untracked' },
      ]);
      expect(availability).toEqual([
        { productId: 'prod-1', state: 'available', available: expectedAvailable },
        { productId: 'prod-2', state: 'unavailable' },
        { productId: 'MCU-001', state: 'unavailable' },
        { productId: 'unknown-id', state: 'unavailable' },
      ]);

      const tracked = levels[0];
      if (tracked?.state !== 'tracked') throw new Error('Expected prod-1 to be tracked');
      expect(tracked.onHand - tracked.effectiveHeld).toBe(tracked.available);
      expect(await snapshotTables()).toEqual(before);
    },
  );

  it('bounds the batch size identically to readAvailability', async () => {
    const ids = Array.from({ length: MAX_AVAILABILITY_BATCH + 1 }, (_, index) => `prod-${index + 1}`);

    await expect(inventory.readStockLevels(ids)).rejects.toThrow(RangeError);
  });
});
