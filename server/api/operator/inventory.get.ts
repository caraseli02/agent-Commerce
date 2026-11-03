import { inventory, MAX_AVAILABILITY_BATCH } from '~~/server/domain/inventory';
import { mockProducts } from '~~/server/utils/mockProducts';
import { requireOperator } from '~~/server/utils/requireOperator';
import type { OperatorInventoryRow } from '~~/types/inventory';

// Read-only operator stock view over the canonical catalog. It reads Inventory's expired-aware
// balances and never initializes or changes them; server/middleware/api-cache-policy.ts keeps the
// response out of every cache.
export default defineEventHandler(async (event) => {
  await requireOperator(event, 'inventory:read');

  const ids = mockProducts.map((product) => product._id);
  const levels: Awaited<ReturnType<typeof inventory.readStockLevels>> = [];
  try {
    for (let start = 0; start < ids.length; start += MAX_AVAILABILITY_BATCH)
      levels.push(...(await inventory.readStockLevels(ids.slice(start, start + MAX_AVAILABILITY_BATCH))));
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Stock levels are temporarily unavailable.' });
  }

  const data: OperatorInventoryRow[] = mockProducts.map((product, index) => ({
    sku: product.code,
    name: product.name,
    ...levels[index]!,
  }));
  return { status: 'success', data };
});
