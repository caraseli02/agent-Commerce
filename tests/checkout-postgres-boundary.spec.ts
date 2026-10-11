import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const legacyMigration = () => source('server/infrastructure/migrations/001_checkout.sql');

const installLegacySchema = async (pool: Pool) => {
  const sql = legacyMigration();
  await pool.query(sql);
  await pool.query(
    'CREATE TABLE checkout_schema_migrations (filename TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
  );
  await pool.query('INSERT INTO checkout_schema_migrations (filename, checksum) VALUES ($1, $2)', [
    '001_checkout.sql',
    createHash('sha256').update(sql).digest('hex'),
  ]);
};

const installPaymentPreparationSchema = async (pool: Pool) => {
  await installLegacySchema(pool);
  const sql = source('server/infrastructure/migrations/002_payment_preparation.sql');
  await pool.query(sql);
  await pool.query('INSERT INTO checkout_schema_migrations (filename, checksum) VALUES ($1, $2)', [
    '002_payment_preparation.sql',
    createHash('sha256').update(sql).digest('hex'),
  ]);
};

describe('checkout PostgreSQL persistence boundary', () => {
  it('keeps the runtime adapter PostgreSQL-only and leaves schema creation to migrations', () => {
    const adapter = source('server/infrastructure/checkout-database.ts');

    expect(adapter).toContain("from 'pg'");
    expect(adapter).toContain('DATABASE_URL');
    expect(adapter).toContain('BEGIN ISOLATION LEVEL SERIALIZABLE');
    expect(adapter).not.toContain('node:sqlite');
    expect(adapter).not.toContain('DatabaseSync');
    expect(adapter).not.toContain('CHECKOUT_DATABASE_PATH');
    expect(adapter).not.toContain('BEGIN IMMEDIATE');
    expect(adapter).not.toContain('CREATE TABLE');
  });

  it('defines the accepted PlaceOrder uniqueness guarantees in an explicit migration', () => {
    const migration = source('server/infrastructure/migrations/001_checkout.sql');
    const paymentPreparationMigration = source('server/infrastructure/migrations/002_payment_preparation.sql');
    const stripeCompatibilityMigration = source('server/infrastructure/migrations/003_stripe_payment_compatibility.sql');
    const canceledClaimMigration = source('server/infrastructure/migrations/005_canceled_checkout_claim.sql');
    const fullRefundMigration = source('server/infrastructure/migrations/007_full_refunds.sql');
    const migrationRunner = source('scripts/db-migrate.mjs');

    expect(migration).toContain('CREATE TABLE checkout_claims');
    expect(migration).toContain('PRIMARY KEY (owner_id, request_id)');
    expect(migration).toContain('UNIQUE (owner_id, cart_id, cart_revision)');
    expect(migration).toContain('UNIQUE (customer_id, checkout_request_id)');
    expect(migration).toContain('UNIQUE (customer_id, source_cart_id, source_cart_revision)');
    expect(migration).toContain('reservation_key TEXT NOT NULL UNIQUE');
    expect(migration).toContain('order_id TEXT NOT NULL UNIQUE');
    expect(paymentPreparationMigration).toContain('CREATE TABLE checkout_claim_aliases');
    expect(paymentPreparationMigration).toContain("CHECK (status IN ('PENDING', 'PAID', 'FAILED'))");
    expect(stripeCompatibilityMigration).toContain("CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED'))");
    expect(stripeCompatibilityMigration).toContain('UNIQUE (stripe_payment_intent_id)');
    expect(paymentPreparationMigration).toContain('CHECK (amount_minor >= 0)');
    expect(paymentPreparationMigration).toContain('FOREIGN KEY (order_id) REFERENCES checkout_orders(id)');
    expect(paymentPreparationMigration).toContain('FOREIGN KEY (paid_by_payment_id, id) REFERENCES checkout_payments(id, order_id)');
    expect(paymentPreparationMigration).toContain(
      "CHECK (workflow_status IN ('prepared', 'payment_pending', 'finalized', 'recovery_required'))",
    );
    expect(canceledClaimMigration).toContain("'canceled'");
    expect(fullRefundMigration).toContain('CREATE TABLE checkout_refunds');
    expect(fullRefundMigration).toContain('payment_id TEXT NOT NULL UNIQUE REFERENCES checkout_payments(id)');
    expect(fullRefundMigration).toContain('amount_minor INTEGER NOT NULL CHECK (amount_minor > 0)');
    expect(fullRefundMigration).toContain("status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED'))");
    expect(fullRefundMigration).toContain('stripe_refund_id TEXT UNIQUE');
    expect(migrationRunner).toContain('pg_advisory_xact_lock');
    expect(migrationRunner).toContain('sqlForKnownRuntimeSchema');
  });

  it('applies the checkout uniqueness guarantees to PostgreSQL', async () => {
    const database = await getCheckoutDatabase();
    const constraints = await database.query<{ table_name: string; constraint_type: string; columns: string }>(
      `SELECT constraints.table_name, constraints.constraint_type,
              string_agg(columns.column_name, ',' ORDER BY columns.ordinal_position) AS columns
         FROM information_schema.table_constraints AS constraints
         JOIN information_schema.key_column_usage AS columns
           ON columns.constraint_catalog = constraints.constraint_catalog
          AND columns.constraint_schema = constraints.constraint_schema
          AND columns.constraint_name = constraints.constraint_name
        WHERE constraints.table_schema = current_schema()
          AND constraints.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
          AND constraints.table_name IN ('checkout_claims', 'checkout_claim_aliases', 'checkout_orders', 'checkout_reservations', 'checkout_payments')
        GROUP BY constraints.table_name, constraints.constraint_type, constraints.constraint_name`,
    );

    expect(constraints.map((constraint) => `${constraint.table_name}:${constraint.constraint_type}:${constraint.columns}`)).toEqual(
      expect.arrayContaining([
        'checkout_claims:PRIMARY KEY:owner_id,request_id',
        'checkout_claims:UNIQUE:owner_id,cart_id,cart_revision',
        'checkout_orders:UNIQUE:customer_id,checkout_request_id',
        'checkout_orders:UNIQUE:customer_id,source_cart_id,source_cart_revision',
        'checkout_reservations:UNIQUE:reservation_key',
        'checkout_payments:UNIQUE:order_id',
        'checkout_claim_aliases:PRIMARY KEY:owner_id,request_id',
      ]),
    );
  });

  it('adopts the known runtime schema and serializes concurrent migrators', async () => {
    const adminConnectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    expect(adminConnectionString).toBeTruthy();

    const schema = `ecas_upgrade_${randomUUID().replaceAll('-', '')}`;
    const schemaIdentifier = `"${schema}"`;
    const migrationUrl = new URL(adminConnectionString!);
    migrationUrl.searchParams.set('options', `-c search_path=${schema}`);
    const adminPool = new Pool({ connectionString: adminConnectionString, max: 1 });
    const migrationPool = new Pool({ connectionString: migrationUrl.toString(), max: 1 });

    try {
      await adminPool.query(`CREATE SCHEMA ${schemaIdentifier}`);
      const migration = source('server/infrastructure/migrations/001_checkout.sql');
      const legacyClaimsSchema = migration.slice(0, migration.indexOf('\n\nCREATE TABLE checkout_carts'));
      await migrationPool.query(legacyClaimsSchema);

      const { migrate } = await import('../scripts/db-migrate.mjs');
      await Promise.all([migrate(migrationUrl.toString()), migrate(migrationUrl.toString())]);

      const migrationCount = await migrationPool.query<{ total: string }>('SELECT COUNT(*) AS total FROM checkout_schema_migrations');
      const tables = await migrationPool.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name LIKE 'checkout_%'",
      );

      expect(Number(migrationCount.rows[0]?.total)).toBe(9);
      expect(tables.rows.map((table) => table.table_name)).toEqual(
        expect.arrayContaining([
          'checkout_claims',
          'checkout_carts',
          'checkout_inventory',
          'checkout_reservations',
          'checkout_orders',
          'checkout_payments',
        ]),
      );
    } finally {
      await migrationPool.end();
      await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`);
      await adminPool.end();
    }
  });

  it('applies full Refund uniqueness, identity, amount, reason, and status constraints in PostgreSQL', async () => {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    expect(connectionString).toBeTruthy();
    const schema = `ecas_refund_constraints_${randomUUID().replaceAll('-', '')}`;
    const schemaIdentifier = `"${schema}"`;
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    const admin = new Pool({ connectionString, max: 1 });
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    const timestamp = '2026-10-05T00:00:00.000Z';
    const addPayment = async (id: string) => {
      const orderId = `order-${id}`;
      await pool.query(
        `INSERT INTO checkout_orders
           (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision,
            fingerprint, payload_json, created_at, updated_at, grand_total_minor, currency)
         VALUES ($1, $1, $1, $1, 1, 'fp', '{}', $2, $2, 1234, 'RON')`,
        [orderId, timestamp],
      );
      await pool.query(
        `INSERT INTO checkout_payments
           (id, order_id, payload_json, created_at, status, amount_minor, currency,
            stripe_payment_intent_id, updated_at)
         VALUES ($1, $2, '{}', $3, 'PAID', 1234, 'RON', $4, $3)`,
        [id, orderId, timestamp, `pi-${id}`],
      );
    };
    const insertRefund = (input: {
      id: string;
      paymentId: string;
      amountMinor?: number;
      currency?: string;
      reason?: string;
      status?: string;
      stripeRefundId?: string | null;
      createStartedAt?: string | null;
    }) =>
      pool.query(
        `INSERT INTO checkout_refunds
           (id, payment_id, stripe_payment_intent_id, amount_minor, currency, reason, status,
            stripe_refund_id, create_started_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $10, $9, $9)`,
        [
          input.id,
          input.paymentId,
          `pi-${input.paymentId}`,
          input.amountMinor ?? 1234,
          input.currency ?? 'RON',
          input.reason ?? 'requested_by_customer',
          input.status ?? 'PENDING',
          input.stripeRefundId ?? null,
          timestamp,
          input.createStartedAt === undefined ? timestamp : input.createStartedAt,
        ],
      );

    try {
      await admin.query(`CREATE SCHEMA ${schemaIdentifier}`);
      const { migrate } = await import('../scripts/db-migrate.mjs');
      await installLegacySchema(pool);
      for (const filename of [
        '002_payment_preparation.sql',
        '003_stripe_payment_compatibility.sql',
        '004_stripe_webhook_events.sql',
        '005_canceled_checkout_claim.sql',
        '006_paid_recovery_claim.sql',
        '007_full_refunds.sql',
      ]) {
        const sql = source(`server/infrastructure/migrations/${filename}`);
        await pool.query(sql);
        await pool.query('INSERT INTO checkout_schema_migrations(filename,checksum) VALUES ($1,$2)', [
          filename,
          createHash('sha256').update(sql).digest('hex'),
        ]);
      }
      await addPayment('pay-refund-a');
      await addPayment('pay-refund-b');
      await insertRefund({ id: 'refund-a', paymentId: 'pay-refund-a', createStartedAt: null });
      await insertRefund({ id: 'refund-b', paymentId: 'pay-refund-b', stripeRefundId: 're_existing' });
      const before = (await pool.query('SELECT * FROM checkout_refunds ORDER BY id')).rows;
      await migrate(url.toString());
      const after = (await pool.query('SELECT * FROM checkout_refunds ORDER BY id')).rows;
      expect(after[0]).toEqual({ ...before[0], create_started_at: new Date(0) });
      expect(after[1]).toEqual(before[1]);
      // Pending rows may retain unknown provider identities; no new replay window is minted.
      await pool.query("UPDATE checkout_refunds SET stripe_refund_id=NULL WHERE id='refund-b'");
      expect((await pool.query('SELECT id FROM checkout_refunds WHERE stripe_refund_id IS NULL')).rows).toHaveLength(2);
      await expect(pool.query("UPDATE checkout_refunds SET status='SUCCEEDED' WHERE id='refund-a'")).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_terminal_requires_stripe_refund_id',
      });
      await expect(pool.query("UPDATE checkout_refunds SET stripe_refund_id='re-invalid' WHERE id='refund-a'")).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_stripe_refund_id_valid',
      });
      await expect(pool.query("UPDATE checkout_refunds SET create_started_at=NULL WHERE id='refund-a'")).rejects.toMatchObject({
        code: '23502',
      });
      await expect(insertRefund({ id: 'refund-a-duplicate', paymentId: 'pay-refund-a' })).rejects.toMatchObject({
        code: '23505',
        constraint: 'checkout_refunds_payment_id_key',
      });

      await pool.query("UPDATE checkout_refunds SET stripe_refund_id='re_shared' WHERE id='refund-a'");
      await expect(pool.query("UPDATE checkout_refunds SET stripe_refund_id='re_shared' WHERE id='refund-b'")).rejects.toMatchObject({
        code: '23505',
        constraint: 'checkout_refunds_stripe_refund_id_key',
      });

      await expect(insertRefund({ id: 'refund-zero', paymentId: 'pay-refund-b', amountMinor: 0 })).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_amount_minor_check',
      });
      await expect(insertRefund({ id: 'refund-negative', paymentId: 'pay-refund-b', amountMinor: -1 })).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_amount_minor_check',
      });
      await expect(insertRefund({ id: 'refund-wrong-currency', paymentId: 'pay-refund-b', currency: 'USD' })).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_currency_check',
      });
      await expect(
        insertRefund({ id: 'refund-unknown-reason', paymentId: 'pay-refund-b', reason: 'operator_guess' }),
      ).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_reason_check',
      });
      await expect(insertRefund({ id: 'refund-unknown-status', paymentId: 'pay-refund-b', status: 'REFUNDED' })).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_refunds_status_check',
      });
      await expect(insertRefund({ id: 'refund-missing-payment', paymentId: 'missing-payment' })).rejects.toMatchObject({
        code: '23503',
        constraint: 'checkout_refunds_payment_id_fkey',
      });

      const insertEvent = (eventId: string, refundId: string, type = 'refund.updated', providerId = 're_shared') =>
        pool.query(
          `INSERT INTO checkout_stripe_refund_events (event_id,event_type,stripe_refund_id,refund_id,observed_at)
          VALUES ($1,$2,$3,$4,$5)`,
          [eventId, type, providerId, refundId, timestamp],
        );
      await insertEvent('evt_migration', 'refund-a');
      await expect(insertEvent('evt_migration', 'refund-a')).rejects.toMatchObject({ code: '23505' });
      await expect(insertEvent('evt_missing', 'missing')).rejects.toMatchObject({ code: '23503' });
      await expect(insertEvent('evt_invalid_type', 'refund-a', 'payment_intent.succeeded')).rejects.toMatchObject({ code: '23514' });
      await expect(insertEvent('evt_invalid_id', 'refund-a', 'refund.updated', 'invalid')).rejects.toMatchObject({ code: '23514' });
      await migrate(url.toString());
      expect((await pool.query('SELECT event_id FROM checkout_stripe_refund_events')).rows).toEqual([{ event_id: 'evt_migration' }]);

      const rows = await pool.query<{
        id: string;
        payment_id: string;
        amount_minor: number;
        currency: string;
        reason: string;
        status: string;
      }>('SELECT id, payment_id, amount_minor, currency, reason, status FROM checkout_refunds ORDER BY id');
      expect(rows.rows).toEqual([
        {
          id: 'refund-a',
          payment_id: 'pay-refund-a',
          amount_minor: 1234,
          currency: 'RON',
          reason: 'requested_by_customer',
          status: 'PENDING',
        },
        {
          id: 'refund-b',
          payment_id: 'pay-refund-b',
          amount_minor: 1234,
          currency: 'RON',
          reason: 'requested_by_customer',
          status: 'PENDING',
        },
      ]);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`);
      await admin.end();
    }
  });

  it('expands populated 001–005 claims without changing rows or legacy writer compatibility, and replays safely', async () => {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    expect(connectionString).toBeTruthy();
    const schema = `ecas_paid_recovery_${randomUUID().replaceAll('-', '')}`;
    const schemaIdentifier = `"${schema}"`;
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    const admin = new Pool({ connectionString, max: 1 });
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    const statuses = ['prepared', 'payment_pending', 'finalized', 'recovery_required', 'canceled'];
    const timestamp = '2026-09-30T00:00:00.000Z';
    const snapshot = async () => {
      const tables = ['checkout_claims', 'checkout_orders', 'checkout_payments', 'checkout_reservations'];
      return Promise.all(tables.map(async (table) => (await pool.query(`SELECT * FROM ${table} ORDER BY 1`)).rows));
    };

    try {
      await admin.query(`CREATE SCHEMA ${schemaIdentifier}`);
      await installPaymentPreparationSchema(pool);
      for (const filename of ['003_stripe_payment_compatibility.sql', '004_stripe_webhook_events.sql', '005_canceled_checkout_claim.sql']) {
        const sql = source(`server/infrastructure/migrations/${filename}`);
        await pool.query(sql);
        await pool.query('INSERT INTO checkout_schema_migrations (filename, checksum) VALUES ($1, $2)', [
          filename,
          createHash('sha256').update(sql).digest('hex'),
        ]);
      }
      await pool.query(
        `INSERT INTO checkout_orders (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision,
           fingerprint, payload_json, created_at, updated_at, grand_total_minor, currency)
         SELECT value, value, value, value, 1, 'fp', '{}', $2, $2, 100, 'RON' FROM unnest($1::text[]) AS value`,
        [statuses, timestamp],
      );
      await pool.query(
        `INSERT INTO checkout_payments (id, order_id, payload_json, created_at, updated_at, status, amount_minor, currency)
         SELECT id, id, '{}', $1, $1, 'PAID', 100, 'RON' FROM checkout_orders`,
        [timestamp],
      );
      await pool.query(
        `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
         SELECT id, id, 'fp', '[]', $1, 'expired' FROM checkout_orders`,
        [timestamp],
      );
      // These explicit columns are the pre-006 claim writer; it never supplies a recovery decision.
      const insertClaim = (status: string) =>
        pool.query(
          `INSERT INTO checkout_claims (owner_id, request_id, fingerprint, cart_id, cart_revision, result_json,
             created_at, updated_at, order_id, reservation_id, payment_id, workflow_status)
           VALUES ($1, $1, 'fp', $1, 1, '{"orderId":"legacy"}', $2, $2, $1, $1, $1, $1)`,
          [status, timestamp],
        );
      for (const status of statuses) await insertClaim(status);
      await pool.query(
        `INSERT INTO checkout_claims (owner_id, request_id, fingerprint, cart_id, cart_revision, created_at, updated_at, workflow_status)
         VALUES ('incomplete', 'incomplete', 'fp', 'incomplete', 1, $1, $1, 'recovery_required')`,
        [timestamp],
      );
      const before = await snapshot();
      const { migrate } = await import('../scripts/db-migrate.mjs');
      await migrate(url.toString());
      const after = await snapshot();
      expect(after[0]).toEqual(before[0]!.map((row) => ({ ...row, paid_recovery_decision: null })));
      expect(after.slice(1)).toEqual(before.slice(1));

      // Replay an old insert and all old status updates after the upgrade.
      await pool.query("DELETE FROM checkout_claims WHERE owner_id = 'prepared'");
      await insertClaim('prepared');
      const updateClaim = (status: string | null, decision: string | null) =>
        pool.query(
          `UPDATE checkout_claims SET workflow_status = $1, paid_recovery_decision = $2
           WHERE owner_id = 'prepared' RETURNING workflow_status, paid_recovery_decision`,
          [status, decision],
        );
      for (const status of statuses) {
        await pool.query("UPDATE checkout_claims SET workflow_status = $1 WHERE owner_id = 'prepared'", [status]);
      }
      for (const status of ['compensation_pending', 'compensation_recovery_required']) {
        for (const decision of [null, 'ALLOCATE', 'BACKORDER', 'REFUND']) {
          expect((await updateClaim(status, decision)).rows).toEqual([{ workflow_status: status, paid_recovery_decision: decision }]);
        }
      }
      for (const decision of ['', 'refund', 'UNKNOWN']) {
        await expect(updateClaim('compensation_pending', decision)).rejects.toMatchObject({
          code: '23514',
          constraint: 'checkout_claims_paid_recovery_decision_valid',
        });
      }
      await expect(updateClaim('unknown', null)).rejects.toMatchObject({
        code: '23514',
        constraint: 'checkout_claims_workflow_status_valid',
      });
      await expect(updateClaim(null, null)).rejects.toMatchObject({ code: '23502' });
      for (const status of ['compensation_pending', 'compensation_recovery_required']) {
        await expect(
          pool.query("UPDATE checkout_claims SET workflow_status = $1 WHERE owner_id = 'incomplete'", [status]),
        ).rejects.toMatchObject({
          code: '23514',
          constraint: 'checkout_claims_complete_tuple',
        });
      }
      await expect(pool.query("UPDATE checkout_claims SET reservation_id = 'missing' WHERE owner_id = 'prepared'")).rejects.toMatchObject({
        code: '23503',
        constraint: 'checkout_claims_reservation_fk',
      });
      await expect(pool.query("UPDATE checkout_claims SET reservation_id = 'finalized' WHERE owner_id = 'prepared'")).rejects.toMatchObject(
        {
          code: '23505',
          constraint: 'checkout_claims_reservation_unique',
        },
      );

      const replayBefore = await snapshot();
      await pool.query(
        `INSERT INTO checkout_refunds
           (id, payment_id, stripe_payment_intent_id, amount_minor, currency, reason, status,
            stripe_refund_id, create_started_at, created_at, updated_at)
         VALUES ('refund-replay-proof', 'prepared', 'pi-prepared', 100, 'RON', 'requested_by_customer',
                 'PENDING', NULL, $1, $1, $1)`,
        [timestamp],
      );
      const refundsBeforeReplay = (await pool.query('SELECT * FROM checkout_refunds ORDER BY id')).rows;
      const historyBefore = (await pool.query('SELECT * FROM checkout_schema_migrations ORDER BY filename')).rows;
      expect(historyBefore).toHaveLength(9);
      expect(historyBefore[5]).toMatchObject({
        filename: '006_paid_recovery_claim.sql',
        checksum: createHash('sha256').update(source('server/infrastructure/migrations/006_paid_recovery_claim.sql')).digest('hex'),
      });
      expect(historyBefore[6]).toMatchObject({
        filename: '007_full_refunds.sql',
        checksum: createHash('sha256').update(source('server/infrastructure/migrations/007_full_refunds.sql')).digest('hex'),
      });
      expect(historyBefore[7]).toMatchObject({
        filename: '008_refund_constraints.sql',
        checksum: createHash('sha256').update(source('server/infrastructure/migrations/008_refund_constraints.sql')).digest('hex'),
      });
      expect(historyBefore[8]).toMatchObject({
        filename: '009_stripe_refund_events.sql',
        checksum: createHash('sha256').update(source('server/infrastructure/migrations/009_stripe_refund_events.sql')).digest('hex'),
      });
      await migrate(url.toString());
      expect(await snapshot()).toEqual(replayBefore);
      expect((await pool.query('SELECT * FROM checkout_refunds ORDER BY id')).rows).toEqual(refundsBeforeReplay);
      expect((await pool.query('SELECT * FROM checkout_schema_migrations ORDER BY filename')).rows).toEqual(historyBefore);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`);
      await admin.end();
    }
  });

  it('upgrades populated Payments while preserving legacy writes and enforcing Stripe identity', async () => {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    expect(connectionString).toBeTruthy();
    const schema = `ecas_stripe_expand_${randomUUID().replaceAll('-', '')}`;
    const schemaIdentifier = `"${schema}"`;
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    const admin = new Pool({ connectionString, max: 1 });
    const pool = new Pool({ connectionString: url.toString(), max: 2 });
    const timestamp = '2026-09-01T00:00:00.000Z';
    const createOrder = (id: string) =>
      pool.query(
        `INSERT INTO checkout_orders (
           id, customer_id, checkout_request_id, source_cart_id, source_cart_revision,
           fingerprint, payload_json, created_at, updated_at, grand_total_minor, currency
         ) VALUES ($1, $1, $1, $1, 1, 'fp', '{}', $2, $2, 100, 'RON')`,
        [id, timestamp],
      );
    const insertPayment = (id: string, status: string) =>
      pool.query(
        `INSERT INTO checkout_payments (
           id, order_id, payload_json, created_at, status, amount_minor, currency,
           payment_type, use_existing_payment_method, provider_reference, updated_at
         ) VALUES ($1, $2, '{}', $3, $4, 100, 'RON', 1, TRUE, NULL, $3)`,
        [`pay-${id}`, id, timestamp, status],
      );

    try {
      await admin.query(`CREATE SCHEMA ${schemaIdentifier}`);
      await installPaymentPreparationSchema(pool);
      for (const status of ['PENDING', 'PAID', 'FAILED']) {
        const id = `ord-${status.toLowerCase()}`;
        await createOrder(id);
        await insertPayment(id, status);
      }

      const { migrate } = await import('../scripts/db-migrate.mjs');
      await migrate(url.toString());
      await migrate(url.toString());
      const migrations = await pool.query<{ total: string }>('SELECT COUNT(*) AS total FROM checkout_schema_migrations');
      expect(Number(migrations.rows[0]?.total)).toBe(9);

      const existing = await pool.query<{
        status: string;
        stripe_payment_intent_id: string | null;
        stripe_payment_intent_create_started_at: Date | null;
        cancellation_requested_at: Date | null;
      }>(
        'SELECT status, stripe_payment_intent_id, stripe_payment_intent_create_started_at, cancellation_requested_at FROM checkout_payments ORDER BY status',
      );
      expect(existing.rows.map(({ status }) => status)).toEqual(['FAILED', 'PAID', 'PENDING']);
      expect(
        existing.rows.every(
          ({ stripe_payment_intent_id, stripe_payment_intent_create_started_at, cancellation_requested_at }) =>
            stripe_payment_intent_id === null && stripe_payment_intent_create_started_at === null && cancellation_requested_at === null,
        ),
      ).toBe(true);

      await createOrder('ord-old-writer');
      await insertPayment('ord-old-writer', 'PENDING');
      await pool.query("UPDATE checkout_payments SET status = 'FAILED' WHERE id = 'pay-ord-old-writer'");
      const legacy = await pool.query<{ status: string; payment_type: number; use_existing_payment_method: boolean }>(
        "SELECT status, payment_type, use_existing_payment_method FROM checkout_payments WHERE id = 'pay-ord-old-writer'",
      );
      expect(legacy.rows[0]).toEqual({ status: 'FAILED', payment_type: 1, use_existing_payment_method: true });

      await createOrder('ord-new-writer');
      await pool.query(
        `INSERT INTO checkout_payments (id, order_id, payload_json, created_at, status, amount_minor, currency, updated_at)
         VALUES ('pay-new-writer', 'ord-new-writer', '{}', $1, 'PROCESSING', 100, 'RON', $1)`,
        [timestamp],
      );
      const expanded = await pool.query<{ status: string; use_existing_payment_method: boolean }>(
        "SELECT status, use_existing_payment_method FROM checkout_payments WHERE id = 'pay-new-writer'",
      );
      expect(expanded.rows[0]).toEqual({ status: 'PROCESSING', use_existing_payment_method: false });
      await pool.query("UPDATE checkout_payments SET status = 'CANCELED' WHERE id = 'pay-new-writer'");

      const timestamps = await pool.query<{
        stripe_payment_intent_create_started_at: Date;
        cancellation_requested_at: Date;
      }>(
        `UPDATE checkout_payments
            SET stripe_payment_intent_id = 'pi-schema-proof',
                stripe_payment_intent_create_started_at = $1,
                cancellation_requested_at = $1
          WHERE id = 'pay-new-writer'
          RETURNING stripe_payment_intent_create_started_at, cancellation_requested_at`,
        [timestamp],
      );
      expect(timestamps.rows[0]?.stripe_payment_intent_create_started_at.toISOString()).toBe(timestamp);
      expect(timestamps.rows[0]?.cancellation_requested_at.toISOString()).toBe(timestamp);
      await expect(
        pool.query("UPDATE checkout_payments SET stripe_payment_intent_id = 'pi-schema-proof' WHERE id = 'pay-ord-pending'"),
      ).rejects.toMatchObject({ code: '23505' });

      await createOrder('ord-race');
      const race = await Promise.allSettled([insertPayment('ord-race', 'PENDING'), insertPayment('ord-race', 'PENDING')]);
      expect(race.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(race.filter(({ status }) => status === 'rejected')).toHaveLength(1);
      expect(race.find(({ status }) => status === 'rejected')).toMatchObject({ reason: { code: '23505' } });
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`);
      await admin.end();
    }
  });

  it('upgrades a populated legacy checkout without changing its completed tuple and quarantines incomplete results', async () => {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    expect(connectionString).toBeTruthy();
    const schema = `ecas_payment_upgrade_${randomUUID().replaceAll('-', '')}`;
    const schemaIdentifier = `"${schema}"`;
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    const admin = new Pool({ connectionString, max: 1 });
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    try {
      await admin.query(`CREATE SCHEMA ${schemaIdentifier}`);
      await installLegacySchema(pool);
      const timestamp = '2026-09-01T00:00:00.000Z';
      const orderPayload = JSON.stringify({ order: { money: { total: 12.34, currency: 'RON' } } });
      await pool.query(
        `INSERT INTO checkout_orders (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint, payload_json, paid_by_payment_id, created_at, updated_at)
         VALUES ('ord-legacy', 'owner-legacy', 'request-legacy', 'cart-legacy', 4, 'fp', $1, 'pay-legacy', $2, $2)`,
        [orderPayload, timestamp],
      );
      await pool.query(
        "INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status) VALUES ('res-legacy', 'owner-legacy:request-legacy', 'fp', '[]', $1, 'committed')",
        [timestamp],
      );
      await pool.query(
        "INSERT INTO checkout_payments (id, order_id, payload_json, created_at) VALUES ('pay-legacy', 'ord-legacy', '{\"paymentId\":\"pay-legacy\"}', $1)",
        [timestamp],
      );
      await pool.query(
        "INSERT INTO checkout_claims (owner_id, request_id, fingerprint, cart_id, cart_revision, result_json, created_at, updated_at) VALUES ('owner-legacy', 'request-legacy', 'fp', 'cart-legacy', 4, '{\"orderId\":\"ord-legacy\"}', $1, $1), ('owner-incomplete', 'request-incomplete', 'fp2', 'cart-incomplete', 1, '{\"orderId\":\"ghost\"}', $1, $1)",
        [timestamp],
      );
      const { migrate } = await import('../scripts/db-migrate.mjs');
      await migrate(url.toString());
      const result = await pool.query<{
        order_id: string;
        reservation_id: string;
        payment_id: string;
        workflow_status: string;
        status: string;
        amount_minor: number;
        paid_by_payment_id: string;
      }>(
        `SELECT claim.order_id, claim.reservation_id, claim.payment_id, claim.workflow_status, payment.status, payment.amount_minor, orders.paid_by_payment_id
           FROM checkout_claims claim JOIN checkout_payments payment ON payment.id = claim.payment_id JOIN checkout_orders orders ON orders.id = claim.order_id
          WHERE claim.owner_id = 'owner-legacy'`,
      );
      expect(result.rows[0]).toMatchObject({
        order_id: 'ord-legacy',
        reservation_id: 'res-legacy',
        payment_id: 'pay-legacy',
        workflow_status: 'finalized',
        status: 'PAID',
        amount_minor: 1234,
        paid_by_payment_id: 'pay-legacy',
      });
      const incomplete = await pool.query<{ workflow_status: string; order_id: string | null; payment_id: string | null }>(
        "SELECT workflow_status, order_id, payment_id FROM checkout_claims WHERE owner_id = 'owner-incomplete'",
      );
      expect(incomplete.rows[0]).toEqual({ workflow_status: 'recovery_required', order_id: null, payment_id: null });
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`);
      await admin.end();
    }
  });

  it('fails closed when legacy order money is missing or negative', async () => {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    expect(connectionString).toBeTruthy();
    const schema = `ecas_payment_invalid_${randomUUID().replaceAll('-', '')}`;
    const schemaIdentifier = `"${schema}"`;
    const url = new URL(connectionString!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    const admin = new Pool({ connectionString, max: 1 });
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    try {
      await admin.query(`CREATE SCHEMA ${schemaIdentifier}`);
      await installLegacySchema(pool);
      await pool.query(
        "INSERT INTO checkout_orders (id, customer_id, checkout_request_id, source_cart_id, source_cart_revision, fingerprint, payload_json, paid_by_payment_id, created_at, updated_at) VALUES ('ord-invalid', 'owner-invalid', 'request-invalid', 'cart-invalid', 1, 'fp', '{\"order\":{\"money\":{\"total\":-1,\"currency\":\"RON\"}}}', NULL, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')",
      );
      const { migrate } = await import('../scripts/db-migrate.mjs');
      await expect(migrate(url.toString())).rejects.toThrow(
        'checkout order money backfill requires a complete non-negative amount and currency',
      );
      const migrations = await pool.query<{ total: string }>('SELECT COUNT(*) AS total FROM checkout_schema_migrations');
      expect(Number(migrations.rows[0]?.total)).toBe(1);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`);
      await admin.end();
    }
  });
});
