import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { migrate } from './db-migrate.mjs';

const { Pool } = pg;
const command = process.argv.slice(2);
if (!command.length) throw new Error('Pass a command to run against the isolated PostgreSQL test schema.');

const adminConnectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!adminConnectionString) throw new Error('DATABASE_URL is required for PostgreSQL-backed tests.');

const schema = `commerce_test_${randomUUID().replaceAll('-', '')}`;
const schemaIdentifier = `"${schema}"`;
const testUrl = new URL(adminConnectionString);
testUrl.searchParams.set('options', `-c search_path=${schema}`);

const adminPool = new Pool({ connectionString: adminConnectionString, max: 1 });
try {
  await adminPool.query(`CREATE SCHEMA ${schemaIdentifier}`);
  await migrate(testUrl.toString());

  const childEnvironment = {
    ...process.env,
    DATABASE_URL: testUrl.toString(),
    DATABASE_URL_UNPOOLED: testUrl.toString(),
    // Developer Stripe configuration must never turn deterministic tests into
    // real provider calls. Individual boundary tests supply their own doubles.
    PAYMENTS_PROVIDER: 'mock',
    STRIPE_GATE_A_APPROVED: 'false',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_browser_contract_only',
  };

  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(command[0], command.slice(1), { env: childEnvironment, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
  });
  process.exitCode = exitCode;
} finally {
  await adminPool.query(`DROP SCHEMA ${schemaIdentifier} CASCADE`);
  await adminPool.end();
}
