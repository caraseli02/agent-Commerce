import { describe, expect, it } from 'vitest';
import { normalizePostgresConnectionString } from '~/server/infrastructure/checkout-database';

describe('checkout PostgreSQL SSL configuration', () => {
  it.each(['prefer', 'require', 'verify-ca'])('keeps pg’s current certificate-verifying behavior for sslmode=%s', (sslmode) => {
    const connectionString = `postgresql://checkout:secret@ep-example.neon.tech/ecas?sslmode=${sslmode}&channel_binding=require`;

    expect(normalizePostgresConnectionString(connectionString)).toBe(
      'postgresql://checkout:secret@ep-example.neon.tech/ecas?sslmode=verify-full&channel_binding=require',
    );
  });

  it.each(['verify-full', 'disable', 'no-verify'])('does not change an explicit sslmode=%s policy', (sslmode) => {
    const connectionString = `postgresql://checkout:secret@ep-example.neon.tech/ecas?sslmode=${sslmode}`;

    expect(normalizePostgresConnectionString(connectionString)).toBe(connectionString);
  });
});
