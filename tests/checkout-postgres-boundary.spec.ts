import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

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
    const migrationRunner = source('scripts/db-migrate.mjs');

    expect(migration).toContain('CREATE TABLE checkout_claims');
    expect(migration).toContain('PRIMARY KEY (owner_id, request_id)');
    expect(migration).toContain('UNIQUE (owner_id, cart_id, cart_revision)');
    expect(migration).toContain('UNIQUE (customer_id, checkout_request_id)');
    expect(migration).toContain('UNIQUE (customer_id, source_cart_id, source_cart_revision)');
    expect(migration).toContain('reservation_key TEXT NOT NULL UNIQUE');
    expect(migration).toContain('order_id TEXT NOT NULL UNIQUE');
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
          AND constraints.table_name IN ('checkout_claims', 'checkout_orders', 'checkout_reservations', 'checkout_payments')
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

      expect(Number(migrationCount.rows[0]?.total)).toBe(1);
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
});
