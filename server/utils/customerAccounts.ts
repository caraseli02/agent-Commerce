import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';
import { isCustomerAccountId } from './accountSession';

// OWASP scrypt profile (N=2^15, r=8, p=3): ~32 MiB per hash, light enough for serverless instances.
const SCRYPT = { N: 2 ** 15, r: 8, p: 3, keyLength: 64 };
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

const deriveKey = (password: string, salt: Buffer, params: { N: number; r: number; p: number; keyLength: number }) =>
  new Promise<Buffer>((resolve, reject) => {
    const options: ScryptOptions = { N: params.N, r: params.r, p: params.p, maxmem: SCRYPT_MAX_MEMORY };
    scrypt(password.normalize('NFKC'), salt, params.keyLength, options, (error, key) => (error ? reject(error) : resolve(key)));
  });

/** `scrypt$N$r$p$salt$key`, base64url; parameters travel with the hash so they can be raised later. */
export const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$');
};

export const verifyPassword = async (password: string, stored: string) => {
  const [scheme, N, r, p, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = await deriveKey(password, Buffer.from(salt, 'base64url'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    keyLength: expected.length,
  });
  return timingSafeEqual(expected, actual);
};

// Unknown emails still pay for one hash, so response time does not reveal which emails are registered.
let decoyHash: Promise<string> | null = null;
const getDecoyHash = () => (decoyHash ??= hashPassword(randomUUID()));

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type CustomerAccount = { id: string; email: string; firstName: string; lastName: string; createdAt: string };

type AccountRow = { id: string; email: string; first_name: string; last_name: string; created_at: Date | string; password_hash?: string };

const toAccount = (row: AccountRow): CustomerAccount => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  createdAt: new Date(row.created_at).toISOString(),
});

export class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email already exists');
  }
}

export const createCustomerAccount = async (input: { email: string; password: string; firstName: string; lastName: string }) => {
  const database = await getCheckoutDatabase();
  const id = `cus_${randomUUID().replaceAll('-', '')}`;
  const passwordHash = await hashPassword(input.password);

  try {
    const [row] = await database.query<AccountRow>(
      `INSERT INTO customer_accounts (id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, created_at`,
      [id, normalizeEmail(input.email), passwordHash, input.firstName.trim(), input.lastName.trim()],
    );
    return toAccount(row!);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new DuplicateEmailError();
    throw error;
  }
};

export const findCustomerAccountById = async (id?: string | null) => {
  if (!isCustomerAccountId(id)) return null;
  const database = await getCheckoutDatabase();
  const [row] = await database.query<AccountRow>(
    'SELECT id, email, first_name, last_name, created_at FROM customer_accounts WHERE id = $1',
    [String(id)],
  );
  return row ? toAccount(row) : null;
};

/** The account when email and password match; null otherwise, in roughly constant time. */
export const authenticateCustomerAccount = async (email: string, password: string) => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<AccountRow>(
    'SELECT id, email, first_name, last_name, created_at, password_hash FROM customer_accounts WHERE email = $1',
    [normalizeEmail(email)],
  );
  const matches = await verifyPassword(password, row?.password_hash ?? (await getDecoyHash()));
  return row && matches ? toAccount(row) : null;
};

const bucketKey = (scope: string, value: string) => `${scope}:${createHash('sha256').update(value).digest('hex')}`;

/**
 * Counts one attempt per bucket in a fixed window shared by all instances; 429 once over the limit.
 * Buckets hold hashes, never raw IPs or emails.
 */
export const consumeAuthAttempts = async (buckets: { scope: string; value: string; limit: number }[], windowSeconds: number) => {
  const database = await getCheckoutDatabase();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  for (const bucket of buckets) {
    const key = bucketKey(bucket.scope, bucket.value);
    await database.execute('DELETE FROM auth_rate_limits WHERE bucket = $1 AND window_start < $2', [key, windowStart]);
    const [row] = await database.query<{ attempts: number }>(
      `INSERT INTO auth_rate_limits (bucket, window_start, attempts) VALUES ($1, $2, 1)
       ON CONFLICT (bucket, window_start) DO UPDATE SET attempts = auth_rate_limits.attempts + 1
       RETURNING attempts`,
      [key, windowStart],
    );
    if ((row?.attempts ?? 0) > bucket.limit) {
      throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Please wait a few minutes and try again.' });
    }
  }
};
