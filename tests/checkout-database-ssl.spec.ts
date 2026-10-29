import { describe, expect, it } from 'vitest';
import { normalizePostgresConnectionString } from '~~/server/infrastructure/checkout-database';
import { createMigrationPool, normalizePostgresConnectionString as normalizeMigrationConnectionString } from '../scripts/db-migrate.mjs';

describe('checkout PostgreSQL SSL configuration', () => {
  it('uses one normalization policy for runtime pools and migration pools', () => {
    expect(normalizeMigrationConnectionString).toBe(normalizePostgresConnectionString);
  });

  it('passes a certificate-verifying connection string to the migration pool', () => {
    let receivedOptions: unknown;
    class FakePool {
      constructor(options: unknown) {
        receivedOptions = options;
      }

      connect() {
        return undefined;
      }
    }

    const pool = createMigrationPool(
      'postgresql://checkout:secret@ep-example.neon.tech/commerce?sslmode=require&channel_binding=require',
      FakePool,
    );

    expect(pool).toBeInstanceOf(FakePool);
    expect(receivedOptions).toEqual({
      connectionString: 'postgresql://checkout:secret@ep-example.neon.tech/commerce?sslmode=verify-full&channel_binding=require',
      max: 1,
    });
  });

  it.each(['prefer', 'require', 'verify-ca'])('keeps pg’s current certificate-verifying behavior for sslmode=%s', (sslmode) => {
    const connectionString = `postgresql://checkout:secret@ep-example.neon.tech/commerce?sslmode=${sslmode}&channel_binding=require`;

    expect(normalizePostgresConnectionString(connectionString)).toBe(
      'postgresql://checkout:secret@ep-example.neon.tech/commerce?sslmode=verify-full&channel_binding=require',
    );
  });

  it.each(['verify-full', 'disable', 'no-verify'])('does not change an explicit sslmode=%s policy', (sslmode) => {
    const connectionString = `postgresql://checkout:secret@ep-example.neon.tech/commerce?sslmode=${sslmode}`;

    expect(normalizePostgresConnectionString(connectionString)).toBe(connectionString);
  });
});
