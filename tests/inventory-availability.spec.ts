import { beforeEach, describe, expect, it } from 'vitest';
import { inventory, MAX_AVAILABILITY_BATCH } from '~~/server/domain/inventory';
import { getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';
import { addProductsToMockCart, getMockCartForUser, setProductsInMockCart } from '~~/server/utils/mockCart';

const future = () => new Date(Date.now() + 15 * 60 * 1000);

const setCounter = async (productId: string, onHand: number, reserved = 0) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ($1,$2,$3)
     ON CONFLICT (product_id) DO UPDATE SET on_hand = EXCLUDED.on_hand, reserved = EXCLUDED.reserved`,
    [productId, onHand, reserved],
  );
};

// An abandoned checkout: still `active`, counted in `reserved`, expired long ago and never read again.
const seedAbandoned = async (id: string, productId: string, quantity: number) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
     VALUES ($1,$2,'abandoned',$3,'2020-01-01T00:00:00.000Z','active')`,
    [id, `abandoned:${id}`, JSON.stringify([{ productId, immediateQuantity: quantity, backorderQuantity: 0 }])],
  );
  await database.execute('UPDATE checkout_inventory SET reserved = reserved + $1 WHERE product_id = $2', [quantity, productId]);
};

const reserve = (reservationKey: string, productId: string, immediateQuantity: number) =>
  withCheckoutTransaction(() =>
    inventory.reserve({ reservationKey, items: [{ productId, immediateQuantity, backorderQuantity: 0 }], expiresAt: future() }),
  );

const snapshotTables = async () => {
  const database = await getCheckoutDatabase();
  return {
    inventory: await database.query('SELECT * FROM checkout_inventory ORDER BY product_id'),
    reservations: await database.query('SELECT id, status FROM checkout_reservations ORDER BY id'),
  };
};

describe('Inventory availability read', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute('TRUNCATE checkout_reservations, checkout_inventory, checkout_carts CASCADE');
    await setCounter('prod-1', 10);
  });

  it('subtracts live holds and gives back expired abandoned ones without writing', async () => {
    await seedAbandoned('res-abandoned', 'prod-1', 4);
    expect((await reserve('buyer-live', 'prod-1', 3)).kind).toBe('created');
    const before = await snapshotTables();

    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: 7 }]);
    // The abandoned reservation stays `active` and still counted: the read materializes nothing.
    expect(await snapshotTables()).toEqual(before);
  });

  it('reflects a competing reservation made after an earlier read', async () => {
    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: 10 }]);
    expect((await reserve('competitor', 'prod-1', 10)).kind).toBe('created');

    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: 0 }]);
  });

  it('reports a restock above the catalog fixture stock', async () => {
    await setCounter('prod-1', 900);

    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: 900 }]);
  });

  it('answers unknown, alias and uninitialized products as unavailable without bootstrapping them', async () => {
    expect(await inventory.readAvailability(['prod-1', 'prod-2', 'MCU-001', 'no-such-product'])).toEqual([
      { productId: 'prod-1', state: 'available', available: 10 },
      { productId: 'prod-2', state: 'unavailable' },
      { productId: 'MCU-001', state: 'unavailable' },
      { productId: 'no-such-product', state: 'unavailable' },
    ]);
    const database = await getCheckoutDatabase();
    expect(await database.query("SELECT product_id FROM checkout_inventory WHERE product_id = 'prod-2'")).toEqual([]);
  });

  // The expired-hold rule lives in both the read (SQL) and reservation admission (availableQuantity),
  // so each fixture checks that the count a buyer sees is exactly what a reservation admits.
  it.each([
    { name: 'a live hold', onHand: 10, seed: () => reserve('buyer-live', 'prod-1', 3).then(() => undefined), expected: 7 },
    { name: 'an expired but still active hold', onHand: 10, seed: () => seedAbandoned('res-abandoned', 'prod-1', 4), expected: 10 },
    { name: 'a restock above fixture stock', onHand: 900, seed: async () => {}, expected: 900 },
    {
      name: 'live and expired holds together',
      onHand: 10,
      seed: async () => {
        await seedAbandoned('res-abandoned', 'prod-1', 4);
        await reserve('buyer-live', 'prod-1', 3);
      },
      expected: 7,
    },
  ])('agrees with reservation admission for $name', async ({ onHand, seed, expected }) => {
    await setCounter('prod-1', onHand);
    await seed();

    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: expected }]);
    expect(await reserve('parity-over', 'prod-1', expected + 1)).toEqual({
      kind: 'unavailable',
      productId: 'prod-1',
      requested: expected + 1,
      available: expected,
    });
    expect((await reserve('parity-exact', 'prod-1', expected)).kind).toBe('created');
    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: 0 }]);
  });

  it('bounds the batch size', async () => {
    const ids = Array.from({ length: MAX_AVAILABILITY_BATCH + 1 }, (_, index) => `prod-${index + 1}`);

    await expect(inventory.readAvailability(ids)).rejects.toThrow(RangeError);
  });
});

describe('cart boundary uses Inventory availability', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute('TRUNCATE checkout_reservations, checkout_inventory, checkout_carts CASCADE');
  });

  it('allows a quantity above fixture stock after a restock', async () => {
    // Fixture stock for prod-1 is 150.
    await setCounter('prod-1', 400);
    const cart = await addProductsToMockCart(await getMockCartForUser('stock-buyer'), [{ id: 'prod-1', stock: 300 }]);

    expect(cart.products?.[0]).toMatchObject({ id: 'prod-1', stock: 300, productEntity: { stock: 400 } });
  });

  it('clamps an edit to current availability, net of other buyers’ holds', async () => {
    await setCounter('prod-1', 10);
    expect((await reserve('competitor', 'prod-1', 8)).kind).toBe('created');
    const cart = await setProductsInMockCart(await getMockCartForUser('stock-buyer'), [{ id: 'prod-1', stock: 5 }]);

    expect(cart.products?.[0]).toMatchObject({ stock: 2, productEntity: { stock: 2 } });
  });

  it('allows no immediate units for a product Inventory cannot vouch for', async () => {
    const cart = await addProductsToMockCart(await getMockCartForUser('stock-buyer'), [{ id: 'prod-2', stock: 3 }]);

    expect(cart.products?.[0]).toMatchObject({ id: 'prod-2', stock: 0, productEntity: { stock: 0 } });
  });

  it('keeps the stored intent on read and shows current availability, not fixture stock', async () => {
    await setCounter('prod-1', 400);
    await addProductsToMockCart(await getMockCartForUser('stock-buyer'), [{ id: 'prod-1', stock: 300 }]);
    // Other buyers purchase most of the stock after this cart was filled.
    await setCounter('prod-1', 20);

    const cart = await getMockCartForUser('stock-buyer');

    expect(cart.products?.[0]).toMatchObject({ stock: 300, productEntity: { stock: 20 } });
  });
});
