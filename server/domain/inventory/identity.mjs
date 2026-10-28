import { mockProducts } from '../../utils/mockProducts.ts';

export const MAX_INVENTORY_QUANTITY = 2_147_483_647;
export const isInventoryQuantity = (value) => Number.isInteger(value) && value >= 0 && value <= MAX_INVENTORY_QUANTITY;

// Static A1 IDs are durable. A code is an input alias, never a persistence key.
const identities = new Map();
for (const product of mockProducts) {
  if (!isInventoryQuantity(product.stock)) throw new Error(`Invalid initial stock for ${product._id}.`);
  for (const identity of new Set([product._id, product.code])) {
    if (identities.has(identity)) throw new Error(`Ambiguous static Inventory identity: ${identity}.`);
    identities.set(identity, Object.freeze({ _id: product._id, code: product.code }));
  }
}
export const resolveInventoryProduct = (identity) => identities.get(identity) ?? null;
export const inventoryCatalog = mockProducts.map((product) => Object.freeze({ productId: product._id, stock: product.stock }));
