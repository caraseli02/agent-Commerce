import pg from 'pg';
import { normalizePostgresConnectionString } from '../../infrastructure/postgres-connection-string.mjs';
import { inventoryCatalog, isInventoryQuantity, resolveInventoryProduct } from './identity.mjs';

// This module is explicit setup tooling. Runtime Inventory never calls it.
export const bootstrapInventory = async ({ connectionString = process.env.DATABASE_URL, dryRun = true } = {}) => {
  if (!connectionString) throw new Error('DATABASE_URL is required for Inventory bootstrap. Run pnpm db:migrate first.');
  const pool = new pg.Pool({ connectionString: normalizePostgresConnectionString(connectionString), max: 1 });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Serialize bootstraps AND exclude reservation/counter writers for the complete preflight/insert.
    await client.query('LOCK TABLE checkout_reservations, checkout_inventory IN EXCLUSIVE MODE');
    const { rows } = await client.query('SELECT product_id, on_hand, reserved FROM checkout_inventory ORDER BY product_id');
    const problems = [];
    const existing = new Set(rows.map((row) => row.product_id));
    for (const row of rows) {
      const product = resolveInventoryProduct(row.product_id);
      if (!product) problems.push(`Unknown inventory key ${row.product_id}`);
      else if (product._id !== row.product_id) problems.push(`Alias inventory key ${row.product_id}; canonical ID is ${product._id}`);
      if (!isInventoryQuantity(row.on_hand) || !isInventoryQuantity(row.reserved))
        problems.push(`Invalid balances for ${row.product_id}: on_hand=${row.on_hand}, reserved=${row.reserved}`);
    }
    const reservations = await client.query('SELECT id, items_json FROM checkout_reservations ORDER BY id');
    for (const row of reservations.rows) {
      let items;
      try {
        items = JSON.parse(row.items_json);
      } catch {
        /* reported below */
      }
      if (!Array.isArray(items) || !items.length) {
        problems.push(`Malformed reservation items in ${row.id}`);
        continue;
      }
      const seen = new Set();
      for (const item of items) {
        const product = resolveInventoryProduct(item?.productId);
        if (!product || product._id !== item.productId)
          problems.push(`Historical reservation ${row.id} has noncanonical identity ${item?.productId}`);
        else if (!existing.has(product._id))
          problems.push(
            `Historical reservation ${row.id} references missing balance ${product._id}; reseeding could restore purchased units`,
          );
        if (
          !isInventoryQuantity(item?.immediateQuantity) ||
          !isInventoryQuantity(item?.backorderQuantity) ||
          !isInventoryQuantity(item.immediateQuantity + item.backorderQuantity) ||
          item.immediateQuantity + item.backorderQuantity === 0 ||
          seen.has(item.productId)
        )
          problems.push(`Malformed quantities or duplicate identity in reservation ${row.id}`);
        seen.add(item?.productId);
      }
    }
    if (problems.length)
      throw new Error(
        `Inventory reconciliation required; no stock changed.\n${problems.join('\n')}\nReview these rows with an operator under a separately approved repair; do not delete, merge or reseed historical balances.`,
      );
    const missing = inventoryCatalog.filter((product) => !existing.has(product.productId));
    if (!dryRun) {
      for (const product of missing)
        await client.query(
          'INSERT INTO checkout_inventory (product_id, on_hand, reserved) VALUES ($1, $2, 0) ON CONFLICT (product_id) DO NOTHING',
          [product.productId, product.stock],
        );
    }
    await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    return { dryRun, missing, preserved: rows.length };
  } catch (error) {
    await client?.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
};
