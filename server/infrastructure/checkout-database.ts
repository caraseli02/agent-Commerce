import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { attachDatabasePool } from '@vercel/functions';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

type SqlValue = string | number | null;

export type CheckoutDatabase = {
  dialect: 'postgres' | 'sqlite';
  query<T extends Record<string, unknown>>(sql: string, parameters?: readonly SqlValue[]): Promise<T[]>;
  execute(sql: string, parameters?: readonly SqlValue[]): Promise<number>;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS checkout_claims (
    owner_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    cart_id TEXT NOT NULL,
    cart_revision INTEGER NOT NULL,
    result_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_id, request_id),
    UNIQUE (owner_id, cart_id, cart_revision)
  )`,
  `CREATE TABLE IF NOT EXISTS checkout_carts (
    owner_id TEXT PRIMARY KEY,
    cart_id TEXT NOT NULL UNIQUE,
    revision INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkout_inventory (
    product_id TEXT PRIMARY KEY,
    on_hand INTEGER NOT NULL,
    reserved INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkout_reservations (
    id TEXT PRIMARY KEY,
    reservation_key TEXT NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL,
    items_json TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS checkout_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    checkout_request_id TEXT NOT NULL,
    source_cart_id TEXT NOT NULL,
    source_cart_revision INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    paid_by_payment_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (customer_id, checkout_request_id),
    UNIQUE (customer_id, source_cart_id, source_cart_revision)
  )`,
  `CREATE TABLE IF NOT EXISTS checkout_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

const transactionContext = new AsyncLocalStorage<CheckoutDatabase>();
let defaultDatabasePromise: Promise<CheckoutDatabase> | null = null;
let postgresPool: Pool | null = null;
let sqliteTransactionQueue: Promise<void> = Promise.resolve();

const normalizePostgresParameters = (sql: string) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const createPostgresExecutor = (client: Pool | PoolClient): CheckoutDatabase => ({
  dialect: 'postgres',
  async query<T extends Record<string, unknown>>(sql: string, parameters: readonly SqlValue[] = []) {
    const result = await client.query<T & QueryResultRow>(normalizePostgresParameters(sql), [...parameters]);
    return result.rows;
  },
  async execute(sql: string, parameters: readonly SqlValue[] = []) {
    const result = await client.query(normalizePostgresParameters(sql), [...parameters]);
    return result.rowCount ?? 0;
  },
});

const createSqliteExecutor = (database: DatabaseSync): CheckoutDatabase => ({
  dialect: 'sqlite',
  async query<T extends Record<string, unknown>>(sql: string, parameters: readonly SqlValue[] = []) {
    return database.prepare(sql).all(...parameters) as T[];
  },
  async execute(sql: string, parameters: readonly SqlValue[] = []) {
    return Number(database.prepare(sql).run(...parameters).changes);
  },
});

const initializeSchema = async (database: CheckoutDatabase) => {
  for (const statement of schemaStatements) {
    await database.execute(statement);
  }
  return database;
};

const createDefaultDatabase = async () => {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (connectionString) {
    postgresPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });

    if (process.env.VERCEL) {
      attachDatabasePool(postgresPool);
    }

    return initializeSchema(createPostgresExecutor(postgresPool));
  }

  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL is required for durable checkout state on Vercel.');
  }

  const databasePath = resolve(process.env.CHECKOUT_DATABASE_PATH || '.data/checkout.sqlite');
  mkdirSync(dirname(databasePath), { recursive: true });
  const sqlite = new DatabaseSync(databasePath);
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA busy_timeout = 5000');
  sqlite.exec('PRAGMA foreign_keys = ON');

  return initializeSchema(createSqliteExecutor(sqlite));
};

const getDefaultDatabase = () => {
  defaultDatabasePromise ??= createDefaultDatabase();
  return defaultDatabasePromise;
};

export const getCheckoutDatabase = async () => transactionContext.getStore() ?? getDefaultDatabase();

const isRetryablePostgresTransactionError = (error: unknown) => {
  const code = (error as { code?: unknown })?.code;
  return code === '40001' || code === '40P01';
};

export const withCheckoutTransaction = async <T>(operation: () => Promise<T>): Promise<T> => {
  if (transactionContext.getStore()) {
    return operation();
  }

  const database = await getDefaultDatabase();

  if (database.dialect === 'sqlite') {
    const previousTransaction = sqliteTransactionQueue;
    let releaseTransaction = () => {};
    sqliteTransactionQueue = new Promise<void>((resolveTransaction) => {
      releaseTransaction = resolveTransaction;
    });
    await previousTransaction;

    try {
      await database.execute('BEGIN IMMEDIATE');
      try {
        const result = await transactionContext.run(database, operation);
        await database.execute('COMMIT');
        return result;
      } catch (error) {
        await database.execute('ROLLBACK');
        throw error;
      }
    } finally {
      releaseTransaction();
    }
  }

  if (!postgresPool) {
    throw new Error('PostgreSQL checkout pool was not initialized.');
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const client = await postgresPool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await transactionContext.run(createPostgresExecutor(client), operation);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      if (attempt === 3 || !isRetryablePostgresTransactionError(error)) {
        throw error;
      }
    } finally {
      client.release();
    }
  }

  throw new Error('Checkout transaction retry limit exceeded.');
};
