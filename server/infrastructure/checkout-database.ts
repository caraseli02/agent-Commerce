import { AsyncLocalStorage } from 'node:async_hooks';
import { attachDatabasePool } from '@vercel/functions';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { normalizePostgresConnectionString } from './postgres-connection-string.mjs';

export { normalizePostgresConnectionString };

type SqlValue = string | number | boolean | null;

export type CheckoutDatabase = {
  query<T extends Record<string, unknown>>(sql: string, parameters?: readonly SqlValue[]): Promise<T[]>;
  execute(sql: string, parameters?: readonly SqlValue[]): Promise<number>;
};

const transactionContext = new AsyncLocalStorage<CheckoutDatabase>();
let postgresPool: Pool | null = null;

const createPostgresExecutor = (client: Pool | PoolClient): CheckoutDatabase => ({
  async query<T extends Record<string, unknown>>(sql: string, parameters: readonly SqlValue[] = []) {
    const result = await client.query<T & QueryResultRow>(sql, [...parameters]);
    return result.rows;
  },
  async execute(sql: string, parameters: readonly SqlValue[] = []) {
    const result = await client.query(sql, [...parameters]);
    return result.rowCount ?? 0;
  },
});

const createPostgresPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for checkout persistence. Run `pnpm db:migrate` before starting ECAS.');
  }

  const pool = new Pool({
    connectionString: normalizePostgresConnectionString(connectionString),
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: process.env.NODE_ENV === 'test',
  });

  if (process.env.VERCEL) attachDatabasePool(pool);
  return pool;
};

const getPostgresPool = () => {
  postgresPool ??= createPostgresPool();
  return postgresPool;
};

export const getCheckoutDatabase = async () => transactionContext.getStore() ?? createPostgresExecutor(getPostgresPool());

export const assertOutsideCheckoutTransaction = (operation = 'Payment continuation') => {
  if (transactionContext.getStore()) {
    throw new Error(`${operation} cannot run inside a checkout transaction.`);
  }
};

const isRetryablePostgresTransactionError = (error: unknown) => {
  const code = (error as { code?: unknown })?.code;
  return code === '40001' || code === '40P01';
};

const MAX_TRANSACTION_ATTEMPTS = 5;

// Jittered backoff keeps concurrent writers of the same rows from colliding again on every immediate retry.
const waitBeforeTransactionRetry = (attempt: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.random() * 10 * 2 ** attempt));

export const withCheckoutTransaction = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (transactionContext.getStore()) return operation();

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const client = await getPostgresPool().connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await transactionContext.run(createPostgresExecutor(client), operation);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      if (attempt === MAX_TRANSACTION_ATTEMPTS || !isRetryablePostgresTransactionError(error)) throw error;
    } finally {
      client.release();
    }
    await waitBeforeTransactionRetry(attempt);
  }

  throw new Error('Checkout transaction retry limit exceeded.');
};
