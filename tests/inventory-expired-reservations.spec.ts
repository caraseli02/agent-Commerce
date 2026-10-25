import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventory } from '~~/server/domain/inventory';
import { getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

// Lets a test run a write before any query after the first one, the way a concurrent checkout can
// commit between two reads of one call.
const interleave = vi.hoisted(() => ({ afterFirstQuery: null as null | (() => Promise<unknown>) }));

vi.mock('~~/server/infrastructure/checkout-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~~/server/infrastructure/checkout-database')>();
  return {
    ...actual,
    getCheckoutDatabase: async () => {
      const database = await actual.getCheckoutDatabase();
      const write = interleave.afterFirstQuery;
      if (!write) return database;
      let queries = 0;
      return {
        ...database,
        query: async (...args: Parameters<typeof database.query>) => {
          queries += 1;
          if (queries > 1 && interleave.afterFirstQuery) {
            interleave.afterFirstQuery = null;
            await write();
          }
          return database.query(...args);
        },
      } as typeof database;
    },
  };
});

const future = () => new Date(Date.now() + 15 * 60 * 1000);
const unit = [{ productId: 'prod-1', immediateQuantity: 1, backorderQuantity: 0 }];

// An abandoned checkout: still `active`, counted in `reserved`, expired long ago and never read again.
const seedAbandoned = async (id: string, quantity = 1) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
     VALUES ($1,$2,'abandoned',$3,'2020-01-01T00:00:00.000Z','active')`,
    [id, `abandoned:${id}`, JSON.stringify([{ productId: 'prod-1', immediateQuantity: quantity, backorderQuantity: 0 }])],
  );
  await database.execute("UPDATE checkout_inventory SET reserved = reserved + $1 WHERE product_id='prod-1'", [quantity]);
};

const reserve = (reservationKey: string) =>
  withCheckoutTransaction(() => inventory.reserve({ reservationKey, items: unit, expiresAt: future() }));

describe('inventory availability with expired reservations', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute('TRUNCATE checkout_reservations, checkout_inventory CASCADE');
    await database.execute("INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ('prod-1',1,0)");
  });

  it('does not count an expired reservation that nothing reads again', async () => {
    await seedAbandoned('res-abandoned');

    expect((await reserve('buyer-new')).kind).toBe('created');
    expect(await inventory.findReservedDrift()).toEqual([]);
  });

  it('still blocks on an active reservation that has not expired', async () => {
    expect((await reserve('buyer-first')).kind).toBe('created');
    expect(await reserve('buyer-second')).toEqual({ kind: 'unavailable', productId: 'prod-1', requested: 1, available: 0 });
  });

  it('lets exactly one of two racing buyers take the last unit while an expired reservation is present', async () => {
    await seedAbandoned('res-abandoned');

    const results = await Promise.all([reserve('buyer-a'), reserve('buyer-b')]);

    expect(results.map((result) => result.kind).sort()).toEqual(['created', 'unavailable']);
    const database = await getCheckoutDatabase();
    const active = await database.query<{ id: string }>(
      "SELECT id FROM checkout_reservations WHERE status='active' AND expires_at::timestamptz > now()",
    );
    expect(active).toHaveLength(1);
    expect(await inventory.findReservedDrift()).toEqual([]);
  });

  it('reports a product whose reserved counter no longer matches its active reservations', async () => {
    await seedAbandoned('res-abandoned');
    const database = await getCheckoutDatabase();
    await database.execute("UPDATE checkout_inventory SET reserved = 3 WHERE product_id='prod-1'");

    expect(await inventory.findReservedDrift()).toEqual([{ productId: 'prod-1', reserved: 3, activeReserved: 1 }]);
  });

  it('does not report drift when a checkout commits while the diagnostic is reading', async () => {
    interleave.afterFirstQuery = () => reserve('buyer-during-check');

    expect(await inventory.findReservedDrift()).toEqual([]);
    interleave.afterFirstQuery = null;
    expect(await inventory.findReservedDrift()).toEqual([]);
  });
});
