import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserPermissionsEnum } from '~~/types/auth/permissions';

vi.mock('h3', () => ({
  getCookie: (event: { cookies?: Record<string, string> }, name: string) => event.cookies?.[name],
  setCookie: (event: { cookies?: Record<string, string> }, name: string, value: string) => {
    event.cookies ||= {};
    event.cookies[name] = value;
  },
}));

type Event = {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;
  ip?: string;
  status?: number;
};
type Handler = (event: Event) => Promise<Record<string, unknown>>;
type HttpError = Error & { statusCode: number };

let mockMode = true;

const installNitroGlobals = () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: mockMode } }));
  vi.stubGlobal('readBody', async (event: Event) => event.body);
  vi.stubGlobal('getHeaders', (event: Event) => event.headers ?? {});
  vi.stubGlobal('getRouterParam', (event: Event, name: string) => event.params?.[name]);
  vi.stubGlobal('getRequestIP', (event: Event) => event.ip);
  vi.stubGlobal('setResponseStatus', (event: Event, status: number) => {
    event.status = status;
  });
  vi.stubGlobal('createError', (input: { statusCode: number; statusMessage: string; data?: unknown }) =>
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

const rejectionSync = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error as HttpError;
  }
  throw new Error('Expected the call to throw');
};

const load = async <T = Handler>(path: string) => (await import(path)).default as T;
const register = () => load('../server/api/auth/register.post');
const login = () => load('../server/api/auth/login.post');

const uniqueEmail = () => `new.customer+${randomUUID().slice(0, 8)}@example.com`;
const uniqueIp = () => `203.0.113.${Math.floor(Math.random() * 250) + 1}-${randomUUID().slice(0, 6)}`;
const signupBody = (email = uniqueEmail()) => ({ firstName: 'Ana', lastName: 'Pop', email, password: 'correct horse battery' });
const bearer = (token: unknown) => ({ authorization: `Bearer ${String(token)}` });

const signUp = async (email = uniqueEmail()) => {
  const event: Event = { body: signupBody(email), ip: uniqueIp(), cookies: {} };
  const response = (await (await register())(event)) as { token: string; user: { _id: string } };
  return { ...response, status: event.status, email };
};

describe('persistent customer accounts (#635)', () => {
  beforeAll(installNitroGlobals);
  beforeEach(() => {
    mockMode = true;
  });

  describe('password hashing', () => {
    it('stores salted scrypt hashes, never the password', async () => {
      const { hashPassword, verifyPassword } = await import('../server/utils/customerAccounts');
      const first = await hashPassword('s3cret-password');
      const second = await hashPassword('s3cret-password');

      expect(first).toMatch(/^scrypt\$32768\$8\$3\$[\w-]+\$[\w-]+$/);
      expect(first).not.toContain('s3cret-password');
      expect(first).not.toBe(second);
      await expect(verifyPassword('s3cret-password', first)).resolves.toBe(true);
      await expect(verifyPassword('wrong-password', first)).resolves.toBe(false);
    });
  });

  describe('session tokens', () => {
    const account = { id: `cus_${'a'.repeat(32)}`, email: 'ana@example.com', firstName: 'Ana', lastName: 'Pop' };

    it('round-trips a signed customer token', async () => {
      const { issueCustomerAccountToken, verifyCustomerAccountToken } = await import('../server/utils/accountSession');
      const claims = verifyCustomerAccountToken(`Bearer ${issueCustomerAccountToken(account)}`);

      expect(claims).toMatchObject({ sub: account.id, user_id: account.id, role: 'customer', email: account.email });
    });

    it('rejects modified claims, foreign signatures, expired tokens and demo tokens', async () => {
      const { issueCustomerAccountToken, verifyCustomerAccountToken } = await import('../server/utils/accountSession');
      const [header, payload, signature] = issueCustomerAccountToken(account).split('.');
      const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString());
      const reencode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const otherUser = `cus_${'b'.repeat(32)}`;

      expect(
        verifyCustomerAccountToken(`${header}.${reencode({ ...claims, sub: otherUser, user_id: otherUser })}.${signature}`),
      ).toBeNull();
      expect(verifyCustomerAccountToken(`${header}.${reencode({ ...claims, role: 'admin' })}.${signature}`)).toBeNull();
      expect(verifyCustomerAccountToken(`${header}.${payload}.${'x'.repeat(signature!.length)}`)).toBeNull();
      expect(verifyCustomerAccountToken(`demo-token::${account.id}::${Date.now()}`)).toBeNull();

      vi.useFakeTimers({ now: Date.now() + 13 * 60 * 60 * 1000 });
      try {
        expect(verifyCustomerAccountToken(`${header}.${payload}.${signature}`)).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('never uses the development secret in a production runtime, on Vercel or not', async () => {
      const { issueCustomerAccountToken, verifyCustomerAccountToken } = await import('../server/utils/accountSession');
      // Signed with the public development secret, as anyone reading the repository could.
      const forged = issueCustomerAccountToken(account);
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL', '');
      try {
        for (const secret of ['', 'too-short']) {
          vi.stubEnv('AUTH_SESSION_SECRET', secret);
          expect(rejectionSync(() => issueCustomerAccountToken(account)).statusCode).toBe(503);
          expect(verifyCustomerAccountToken(`Bearer ${forged}`)).toBeNull();
        }

        vi.stubEnv('AUTH_SESSION_SECRET', 'p'.repeat(32));
        expect(verifyCustomerAccountToken(`Bearer ${forged}`)).toBeNull();
        expect(verifyCustomerAccountToken(`Bearer ${issueCustomerAccountToken(account)}`)?.sub).toBe(account.id);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  describe('POST /api/auth/register', () => {
    it('creates a customer and signs them in without exposing credentials', async () => {
      const { token, user, status, email } = await signUp();

      expect(status).toBe(201);
      expect(user._id).toMatch(/^cus_[0-9a-f]{32}$/);
      expect(user).toMatchObject({ role: 2, permissions: expect.not.arrayContaining([UserPermissionsEnum.AdminDashboardRead]) });
      expect(JSON.stringify(user)).not.toMatch(/password|scrypt/i);

      const { verifyCustomerAccountToken } = await import('../server/utils/accountSession');
      expect(verifyCustomerAccountToken(String(token))?.email).toBe(email);
    });

    it('rejects invalid input server-side', async () => {
      const handler = await register();
      const error = await rejection(
        handler({ body: { firstName: '', lastName: 'Pop', email: 'nope', password: 'short' }, ip: uniqueIp() }),
      );

      expect(error.statusCode).toBe(400);
      expect(Object.keys((error as unknown as { data: { fieldErrors: object } }).data.fieldErrors)).toEqual(
        expect.arrayContaining(['firstName', 'email', 'password']),
      );
    });

    it('treats casing and whitespace variants as the same email', async () => {
      const { email } = await signUp();
      const handler = await register();
      const error = await rejection(handler({ body: signupBody(`  ${email.toUpperCase()} `), ip: uniqueIp() }));

      expect(error.statusCode).toBe(409);
    });

    it('creates exactly one account for concurrent duplicate signups', async () => {
      const handler = await register();
      const email = uniqueEmail();
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, index) =>
          handler({ body: signupBody(index % 2 ? email.toUpperCase() : email), ip: uniqueIp(), cookies: {} }),
        ),
      );

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected').map((result) => (result.reason as HttpError).statusCode)).toEqual([
        409, 409, 409, 409,
      ]);

      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        const rows = await pool.query('SELECT COUNT(*)::int AS total FROM customer_accounts WHERE email = $1', [email]);
        expect(rows.rows[0].total).toBe(1);
      } finally {
        await pool.end();
      }
    });

    it('fails closed before creating an account when a deployment lacks a session secret', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL', '');
      vi.stubEnv('AUTH_SESSION_SECRET', '');
      try {
        const email = uniqueEmail();
        const error = await rejection((await register())({ body: signupBody(email), ip: uniqueIp() }));
        expect(error.statusCode).toBe(503);

        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
          const rows = await pool.query('SELECT COUNT(*)::int AS total FROM customer_accounts WHERE email = $1', [email]);
          expect(rows.rows[0].total).toBe(0);
        } finally {
          await pool.end();
        }
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('rate-limits repeated signups from one address', async () => {
      const handler = await register();
      const ip = uniqueIp();
      for (let attempt = 0; attempt < 5; attempt += 1) await handler({ body: signupBody(), ip, cookies: {} });

      const error = await rejection(handler({ body: signupBody(), ip }));
      expect(error.statusCode).toBe(429);
    });
  });

  describe('POST /api/auth/login', () => {
    it('signs a registered customer in again with a normalized email', async () => {
      const { email, user } = await signUp();
      const response = (await (
        await login()
      )({ body: { email: ` ${email.toUpperCase()}`, password: 'correct horse battery' }, ip: uniqueIp() })) as {
        user: { _id: string };
      };

      expect(response.user._id).toBe(user._id);
    });

    it('returns the same generic 401 for a wrong password and an unknown email', async () => {
      const { email } = await signUp();
      const handler = await login();

      const wrongPassword = await rejection(handler({ body: { email, password: 'wrong password' }, ip: uniqueIp() }));
      const unknownEmail = await rejection(handler({ body: { email: uniqueEmail(), password: 'wrong password' }, ip: uniqueIp() }));
      expect([wrongPassword.statusCode, wrongPassword.message]).toEqual([401, 'Invalid credentials']);
      expect([unknownEmail.statusCode, unknownEmail.message]).toEqual([401, 'Invalid credentials']);
    });

    it('works after a restart, through an independent instance sharing PostgreSQL', async () => {
      const { email, user } = await signUp();

      // A fresh module graph is a new server instance: new pool, no in-process state.
      vi.resetModules();
      const response = (await (
        await login()
      )({ body: { email, password: 'correct horse battery' }, ip: uniqueIp() })) as {
        token: string;
        user: { _id: string };
      };
      expect(response.user._id).toBe(user._id);

      vi.resetModules();
      const readAccount = await load('../server/api/auth/[id].get');
      await expect(readAccount({ headers: bearer(response.token), params: { id: user._id } })).resolves.toMatchObject({
        data: { _id: user._id, contactDetails: { email } },
      });
    });

    it('accepts seeded demo users only in mock mode', async () => {
      mockMode = false;
      const error = await rejection((await login())({ body: { email: 'customer@demo.com', password: 'customer123' }, ip: uniqueIp() }));
      expect(error.statusCode).toBe(401);

      const { getMockUserFromAuthHeader } = await import('../server/utils/mockUsers');
      expect(getMockUserFromAuthHeader(`Bearer demo-token::mock-admin-1::${Date.now()}`)).toBeNull();

      mockMode = true;
      expect(getMockUserFromAuthHeader(`Bearer demo-token::mock-admin-1::${Date.now()}`)?._id).toBe('mock-admin-1');
    });
  });

  describe('account reads', () => {
    it('serves the stored account and keeps other customers out', async () => {
      const ana = await signUp();
      const other = await signUp();
      const details = await load('../server/api/user/[userId]/details.get');

      await expect(details({ headers: bearer(ana.token), params: { userId: ana.user._id } })).resolves.toMatchObject({
        data: { _id: ana.user._id, contactDetails: { firstName: 'Ana', email: ana.email }, personalDetails: { shippingAddress: [] } },
      });
      expect((await rejection(details({ headers: bearer(ana.token), params: { userId: other.user._id } }))).statusCode).toBe(403);
      expect((await rejection(details({ headers: bearer('forged.token.value'), params: { userId: ana.user._id } }))).statusCode).toBe(401);
    });

    it('never falls back to demo profile data for a registered customer', async () => {
      const { token, user, email } = await signUp();
      const headers = bearer(token);
      const params = { userId: user._id };
      const [information, lastOrder, metadata] = await Promise.all([
        load('../server/api/dashboard/profile/[userId]/customer-information.get').then((handler) => handler({ headers, params })),
        load('../server/api/dashboard/profile/[userId]/last-order.get').then((handler) => handler({ headers, params })),
        load('../server/api/dashboard/client/metadata.get').then((handler) => handler({ headers })),
      ]);

      expect(information).toMatchObject({ data: { _id: user._id, contactDetails: { email } } });
      expect(lastOrder).toMatchObject({ data: null });
      expect(metadata).toMatchObject({ data: { ordersCount: 0, transactionsCount: 0, favoritesCount: 0 } });
    });
  });
});
