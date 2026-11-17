import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { normalizePostgresConnectionString } from './postgres-connection-string.mjs';

// Local operator provisioning (#844): `pnpm operator:grant` / `pnpm operator:revoke`. There is no
// HTTP grant endpoint; whoever can reach DATABASE_URL decides. Dry run unless --apply is passed.
// Production provisioning stays an owner operation (docs/system-design/09-operator-authorization.md).

export const OPERATOR_PERMISSIONS = ['inventory:read', 'inventory:write', 'orders:fulfil', 'orders:cancel'];

const USAGE = 'Usage: operator-grant.mjs <grant|revoke> --email <account email> --permission <permission> [--apply]';

export const parseOperatorGrantArgs = (argv) => {
  const [action, ...rest] = argv;
  const options = { action, email: '', permission: '', apply: false };
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === '--apply') options.apply = true;
    else if (flag === '--email')
      options.email = String(rest[++index] ?? '')
        .trim()
        .toLowerCase();
    else if (flag === '--permission') options.permission = String(rest[++index] ?? '').trim();
    else if (flag !== '--') throw new Error(`Unknown argument ${flag}. ${USAGE}`);
  }
  if (action !== 'grant' && action !== 'revoke') throw new Error(USAGE);
  if (!options.email) throw new Error(`--email is required. ${USAGE}`);
  if (!OPERATOR_PERMISSIONS.includes(options.permission))
    throw new Error(`--permission must be one of ${OPERATOR_PERMISSIONS.join(', ')}. ${USAGE}`);
  return options;
};

export const runOperatorGrant = async (
  argv,
  { connectionString = process.env.DATABASE_URL, log = console.log, grantedBy = `cli:${userInfo().username}` } = {},
) => {
  const options = parseOperatorGrantArgs(argv);
  if (!connectionString) throw new Error('DATABASE_URL is required to change operator grants.');

  const pool = new pg.Pool({ connectionString: normalizePostgresConnectionString(connectionString), max: 1 });
  try {
    const accounts = await pool.query('SELECT id FROM customer_accounts WHERE email = $1', [options.email]);
    const accountId = accounts.rows[0]?.id;
    if (!accountId) throw new Error(`No registered account uses ${options.email}. Register it first; grants never create accounts.`);

    const held = await pool.query('SELECT 1 FROM operator_grants WHERE account_id = $1 AND permission = $2', [
      accountId,
      options.permission,
    ]);
    const has = held.rowCount > 0;
    const changes = options.action === 'grant' ? !has : has;
    const summary = `${options.action} ${options.permission} for ${options.email} (${accountId})`;

    if (!changes) {
      log(`No change: ${options.email} ${has ? 'already has' : 'does not have'} ${options.permission}.`);
      return { changed: false, accountId };
    }
    if (!options.apply) {
      log(`Dry run: would ${summary}. Re-run with --apply to write it.`);
      return { changed: false, accountId };
    }

    if (options.action === 'grant')
      await pool.query('INSERT INTO operator_grants (account_id, permission, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [
        accountId,
        options.permission,
        grantedBy,
      ]);
    else await pool.query('DELETE FROM operator_grants WHERE account_id = $1 AND permission = $2', [accountId, options.permission]);
    log(`Applied: ${summary}.`);
    return { changed: true, accountId };
  } finally {
    await pool.end();
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    await runOperatorGrant(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
