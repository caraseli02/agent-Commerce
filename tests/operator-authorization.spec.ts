import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { inventory } from '~~/server/domain/inventory';
import { getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';
import { runOperatorGrant } from '~~/server/infrastructure/operator-grant.mjs';

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

type Event = { body?: unknown; headers?: Record<string, string>; cookies?: Record<string, string>; ip?: string; status?: number };
type Handler = (event: Event) => Promise<Record<string, unknown>>;
type HttpError = Error & { statusCode: number };

let mockMode = true;

const installNitroGlobals = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: mockMode } }));
  vi.stubGlobal('readBody', async (event: Event) => event.body);
  vi.stubGlobal('getHeaders', (event: Event) => event.headers ?? {});
  vi.stubGlobal('getRequestIP', (event: Event) => event.ip);
  vi.stubGlobal('setResponseStatus', (event: Event, status: number) => {
    event.status = status;
  });
  vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
  );
};

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as HttpError;
  }
  throw new Error('Expected the handler to reject');
};

const load = async (path: string) => (await import(path)).default as Handler;
const me = () => load('../server/api/operator/me.get');
const stock = () => load('../server/api/operator/inventory.get');
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const quiet = { log: () => {} };

const signUp = async () => {
  const email = `operator+${randomUUID().slice(0, 8)}@example.com`;
  const event: Event = {
    body: { firstName: 'Ana', lastName: 'Pop', email, password: 'correct horse battery' },
    ip: `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomUUID().slice(0, 6)}`,
    cookies: {},
  };
  const response = (await (await load('../server/api/auth/register.post'))(event)) as { token: string; user: { _id: string } };
  return { email, token: response.token, accountId: response.user._id };
};

const grant = (email: string, permission = 'inventory:read') =>
  runOperatorGrant(['grant', '--email', email, '--permission', permission, '--apply'], quiet);

const setCounter = async (productId: string, onHand: number) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_inventory (product_id,on_hand,reserved) VALUES ($1,$2,0)
     ON CONFLICT (product_id) DO UPDATE SET on_hand = EXCLUDED.on_hand, reserved = 0`,
    [productId, onHand],
  );
};

// An abandoned checkout: still `active` and counted in `reserved`, but expired long ago.
const seedAbandoned = async (productId: string, quantity: number) => {
  const database = await getCheckoutDatabase();
  const id = `res-${randomUUID()}`;
  await database.execute(
    `INSERT INTO checkout_reservations (id,reservation_key,fingerprint,items_json,expires_at,status)
     VALUES ($1,$2,'abandoned',$3,'2020-01-01T00:00:00.000Z','active')`,
    [id, `abandoned:${id}`, JSON.stringify([{ productId, immediateQuantity: quantity, backorderQuantity: 0 }])],
  );
  await database.execute('UPDATE checkout_inventory SET reserved = reserved + $1 WHERE product_id = $2', [quantity, productId]);
};

const reserve = (productId: string, immediateQuantity: number) =>
  withCheckoutTransaction(() =>
    inventory.reserve({
      reservationKey: `live:${randomUUID()}`,
      items: [{ productId, immediateQuantity, backorderQuantity: 0 }],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }),
  );

describe('Inventory stock levels (#844)', () => {
  beforeEach(async () => {
    const database = await getCheckoutDatabase();
    await database.execute('TRUNCATE checkout_reservations, checkout_inventory, checkout_carts CASCADE');
  });

  it('projects the same balance as the buyer availability read, net of live holds only', async () => {
    await setCounter('prod-1', 10);
    await seedAbandoned('prod-1', 4);
    expect((await reserve('prod-1', 3)).kind).toBe('created');

    expect(await inventory.readStockLevels(['prod-1', 'prod-2', 'MCU-001'])).toEqual([
      { productId: 'prod-1', state: 'tracked', onHand: 10, effectiveHeld: 3, available: 7 },
      { productId: 'prod-2', state: 'untracked' },
      { productId: 'MCU-001', state: 'untracked' },
    ]);
    expect(await inventory.readAvailability(['prod-1'])).toEqual([{ productId: 'prod-1', state: 'available', available: 7 }]);
  });
});

describe('operator authorization boundary (#844)', () => {
  beforeAll(installNitroGlobals);
  beforeEach(async () => {
    mockMode = true;
    const database = await getCheckoutDatabase();
    await database.execute('TRUNCATE checkout_reservations, checkout_inventory, checkout_carts CASCADE');
  });

  it('rejects anonymous, forged demo and modified tokens with 401', async () => {
    const { token } = await signUp();
    const [header, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'));
    const elevated = Buffer.from(JSON.stringify({ ...claims, role: 'operator' })).toString('base64url');

    for (const headers of [
      {},
      bearer(`demo-token::mock-admin-1::${Date.now()}`),
      bearer(`${header}.${elevated}.${signature}`),
      bearer(`${token.slice(0, -2)}xx`),
    ]) {
      expect((await rejection((await me())({ headers }))).statusCode).toBe(401);
      expect((await rejection((await stock())({ headers }))).statusCode).toBe(401);
    }
  });

  it('rejects a registered customer without a grant with 403, whatever the request claims', async () => {
    const { token } = await signUp();
    const event = {
      headers: { ...bearer(token), 'x-operator-permission': 'inventory:read', 'x-role': 'admin' },
      body: { role: 'admin', permissions: ['inventory:read'] },
    };

    expect((await rejection((await me())(event))).statusCode).toBe(403);
    expect((await rejection((await stock())(event))).statusCode).toBe(403);
  });

  it('serves an operator the read-only stock view without changing balances', async () => {
    const { email, token, accountId } = await signUp();
    await grant(email);
    await setCounter('prod-1', 10);
    await seedAbandoned('prod-1', 4);
    expect((await reserve('prod-1', 3)).kind).toBe('created');
    const database = await getCheckoutDatabase();
    const before = await database.query('SELECT * FROM checkout_inventory ORDER BY product_id');

    await expect((await me())({ headers: bearer(token) })).resolves.toEqual({
      status: 'success',
      data: { accountId, permissions: ['inventory:read'] },
    });
    const response = (await (await stock())({ headers: bearer(token) })) as { data: Array<Record<string, unknown>> };
    expect(response.data).toContainEqual({
      productId: 'prod-1',
      sku: 'MCU-001',
      name: 'STM32F407VGT6 Microcontroller',
      state: 'tracked',
      onHand: 10,
      effectiveHeld: 3,
      available: 7,
    });
    expect(response.data.find((row) => row.productId === 'prod-2')).toMatchObject({ state: 'untracked' });
    expect(await database.query('SELECT * FROM checkout_inventory ORDER BY product_id')).toEqual(before);
  });

  it('requires the specific permission, not just any grant', async () => {
    const { email, token } = await signUp();
    await grant(email, 'orders:fulfil');

    await expect((await me())({ headers: bearer(token) })).resolves.toMatchObject({ data: { permissions: ['orders:fulfil'] } });
    expect((await rejection((await stock())({ headers: bearer(token) }))).statusCode).toBe(403);
  });

  it('applies a revoke to the next request, through an independent instance', async () => {
    const { email, token } = await signUp();
    await grant(email);
    await expect((await stock())({ headers: bearer(token) })).resolves.toMatchObject({ status: 'success' });

    // A fresh module graph is a new server instance: new pool, no in-process state.
    vi.resetModules();
    await expect((await stock())({ headers: bearer(token) })).resolves.toMatchObject({ status: 'success' });

    await runOperatorGrant(['revoke', '--email', email, '--permission', 'inventory:read', '--apply'], quiet);
    expect((await rejection((await stock())({ headers: bearer(token) }))).statusCode).toBe(403);
    vi.resetModules();
    expect((await rejection((await me())({ headers: bearer(token) }))).statusCode).toBe(403);
  });

  it('keeps the demo admin out in mock mode even though it passes the demo guard', async () => {
    const { requireRequester } = await import('../server/utils/requireRequester');
    const headers = bearer(`demo-token::mock-admin-1::${Date.now()}`);
    expect(requireRequester({ headers } as never)).toMatchObject({ isAdmin: true });

    expect((await rejection((await stock())({ headers }))).statusCode).toBe(401);
  });
});

describe('operator grant CLI (#844)', () => {
  beforeAll(installNitroGlobals);

  const grantsFor = async (accountId: string) => {
    const database = await getCheckoutDatabase();
    return (await database.query<{ permission: string }>('SELECT permission FROM operator_grants WHERE account_id = $1', [accountId])).map(
      (row) => row.permission,
    );
  };

  it('is a dry run unless --apply is passed', async () => {
    const { email, accountId } = await signUp();
    const log = vi.fn();

    await expect(runOperatorGrant(['grant', '--email', email, '--permission', 'inventory:read'], { log })).resolves.toEqual({
      changed: false,
      accountId,
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Dry run'));
    expect(await grantsFor(accountId)).toEqual([]);

    await grant(email);
    expect(await grantsFor(accountId)).toEqual(['inventory:read']);
    await expect(grant(email)).resolves.toMatchObject({ changed: false });
  });

  it('never creates accounts and rejects unknown permissions', async () => {
    await expect(
      runOperatorGrant(['grant', '--email', 'nobody@example.com', '--permission', 'inventory:read', '--apply'], quiet),
    ).rejects.toThrow(/No registered account/);
    await expect(runOperatorGrant(['grant', '--email', 'nobody@example.com', '--permission', 'admin'], quiet)).rejects.toThrow(
      /--permission must be one of/,
    );
  });
});
