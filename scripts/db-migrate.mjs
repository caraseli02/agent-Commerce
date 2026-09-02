import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import { normalizePostgresConnectionString } from '../server/infrastructure/postgres-connection-string.mjs';

export { normalizePostgresConnectionString };

const { Pool } = pg;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = resolve(scriptDirectory, '../server/infrastructure/migrations');
const migrationLockId = 5_230_001;

const sqlForKnownRuntimeSchema = async (client, filename, sql) => {
  if (filename !== '001_checkout.sql') return sql;

  const existing = await client.query("SELECT to_regclass('checkout_claims') AS table_name");
  return existing.rows[0]?.table_name ? sql.replaceAll('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ') : sql;
};

/**
 * @param {string} connectionString
 * @param {new (options: { connectionString: string, max: number }) => any} [PoolConstructor]
 */
export const createMigrationPool = (connectionString, PoolConstructor = Pool) =>
  new PoolConstructor({ connectionString: normalizePostgresConnectionString(connectionString), max: 1 });

export const migrate = async (connectionString = process.env.DATABASE_URL) => {
  if (!connectionString) throw new Error('DATABASE_URL is required to run checkout migrations.');

  const pool = createMigrationPool(connectionString);
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [migrationLockId]);
    await client.query(`CREATE TABLE IF NOT EXISTS checkout_schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await client.query('LOCK TABLE checkout_schema_migrations IN ACCESS EXCLUSIVE MODE');

    const filenames = (await readdir(migrationsDirectory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    for (const filename of filenames) {
      const sql = await readFile(resolve(migrationsDirectory, filename), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM checkout_schema_migrations WHERE filename = $1', [filename]);

      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration ${filename} has changed.`);
        continue;
      }

      await client.query(await sqlForKnownRuntimeSchema(client, filename, sql));
      await client.query('INSERT INTO checkout_schema_migrations (filename, checksum) VALUES ($1, $2)', [filename, checksum]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  await migrate();
}
