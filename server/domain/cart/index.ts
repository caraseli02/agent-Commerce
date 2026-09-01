import type { CartInterface } from '~/types/cart';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

export type CartRevision = string;

export type CheckoutCartItem = Readonly<{
  productId: string;
  immediateQuantity: number;
  backorderQuantity: number;
}>;

export type CheckoutCartSnapshot = Readonly<{
  cartId: string;
  ownerId: string;
  revision: CartRevision;
  items: readonly CheckoutCartItem[];
}>;

export type GetCheckoutCartResult = { kind: 'found'; snapshot: CheckoutCartSnapshot } | { kind: 'not-found' } | { kind: 'forbidden' };

export type CompleteCheckoutResult = { kind: 'completed' } | { kind: 'cart-changed' } | { kind: 'not-found' } | { kind: 'forbidden' };

type CartRow = {
  owner_id: string;
  cart_id: string;
  revision: number;
  payload_json: string;
};

const normalizeItems = (cart: CartInterface) =>
  (cart.products || [])
    .filter((item) => typeof item.id === 'string' && item.id.trim())
    .map((item) => ({
      productId: String(item.id),
      immediateQuantity: Math.max(0, Number(item.stock || 0)),
      backorderQuantity: Math.max(0, Number(item.backorder_stock || 0)),
    }))
    .filter((item) => item.immediateQuantity + item.backorderQuantity > 0);

const readCart = async (cartId: string) => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<CartRow>(
    'SELECT owner_id, cart_id, revision, payload_json FROM checkout_carts WHERE cart_id = $1 FOR UPDATE',
    [cartId],
  );
  return rows[0] || null;
};

const getSnapshot = async (input: { cartId: string; ownerId: string }): Promise<GetCheckoutCartResult> => {
  const row = await readCart(input.cartId);

  if (!row) return { kind: 'not-found' };
  if (row.owner_id !== input.ownerId) return { kind: 'forbidden' };

  const cart = JSON.parse(row.payload_json) as CartInterface;
  return {
    kind: 'found',
    snapshot: {
      cartId: row.cart_id,
      ownerId: row.owner_id,
      revision: String(row.revision),
      items: normalizeItems(cart),
    },
  };
};

const completeCheckout = async (input: {
  cartId: string;
  ownerId: string;
  expectedRevision: CartRevision;
}): Promise<CompleteCheckoutResult> => {
  const row = await readCart(input.cartId);

  if (!row) return { kind: 'not-found' };
  if (row.owner_id !== input.ownerId) return { kind: 'forbidden' };
  if (String(row.revision) !== input.expectedRevision) return { kind: 'cart-changed' };

  const cart = JSON.parse(row.payload_json) as CartInterface;
  cart.products = [];
  const database = await getCheckoutDatabase();
  const changed = await database.execute(
    `UPDATE checkout_carts
       SET payload_json = $1, revision = revision + 1, updated_at = $2
     WHERE cart_id = $3 AND owner_id = $4 AND revision = $5`,
    [JSON.stringify(cart), new Date().toISOString(), input.cartId, input.ownerId, Number(input.expectedRevision)],
  );

  return changed === 1 ? { kind: 'completed' } : { kind: 'cart-changed' };
};

export const cart = {
  getSnapshot,
  completeCheckout,
};
