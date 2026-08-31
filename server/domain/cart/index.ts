import { clearMockCartById, findMockCartById } from '~/server/utils/mockCart';

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

type RevisionRecord = {
  fingerprint: string;
  revision: number;
};

const revisions = new Map<string, RevisionRecord>();

const normalizeItems = (cart: { products?: Array<{ id?: string; stock?: number; backorder_stock?: number }> }) =>
  (cart.products || [])
    .filter((item) => typeof item.id === 'string' && item.id.trim())
    .map((item) => ({
      productId: String(item.id),
      immediateQuantity: Math.max(0, Number(item.stock || 0)),
      backorderQuantity: Math.max(0, Number(item.backorder_stock || 0)),
    }))
    .filter((item) => item.immediateQuantity + item.backorderQuantity > 0);

const fingerprintItems = (items: readonly CheckoutCartItem[]) =>
  JSON.stringify(
    [...items]
      .sort((a, b) => a.productId.localeCompare(b.productId))
      .map((item) => [item.productId, item.immediateQuantity, item.backorderQuantity]),
  );

const observeRevision = (cartId: string, items: readonly CheckoutCartItem[]) => {
  const fingerprint = fingerprintItems(items);
  const existing = revisions.get(cartId);

  if (!existing) {
    const created = { fingerprint, revision: 1 };
    revisions.set(cartId, created);
    return String(created.revision);
  }

  if (existing.fingerprint !== fingerprint) {
    existing.fingerprint = fingerprint;
    existing.revision += 1;
  }

  return String(existing.revision);
};

const recordMutation = (cartId: string, items: readonly CheckoutCartItem[]) => {
  const fingerprint = fingerprintItems(items);
  const existing = revisions.get(cartId);

  if (!existing) {
    revisions.set(cartId, { fingerprint, revision: 1 });
    return;
  }

  existing.fingerprint = fingerprint;
  existing.revision += 1;
};

const getSnapshot = async (input: { cartId: string; ownerId: string }): Promise<GetCheckoutCartResult> => {
  const cart = findMockCartById(input.cartId);

  if (!cart) {
    return { kind: 'not-found' };
  }

  if (cart.userId && cart.userId !== input.ownerId) {
    return { kind: 'forbidden' };
  }

  const items = normalizeItems(cart);

  return {
    kind: 'found',
    snapshot: {
      cartId: input.cartId,
      ownerId: input.ownerId,
      revision: observeRevision(input.cartId, items),
      items,
    },
  };
};

const completeCheckout = async (input: {
  cartId: string;
  ownerId: string;
  expectedRevision: CartRevision;
}): Promise<CompleteCheckoutResult> => {
  const cart = findMockCartById(input.cartId);

  if (!cart) {
    return { kind: 'not-found' };
  }

  if (cart.userId && cart.userId !== input.ownerId) {
    return { kind: 'forbidden' };
  }

  const currentItems = normalizeItems(cart);
  const currentRevision = observeRevision(input.cartId, currentItems);

  if (currentRevision !== input.expectedRevision) {
    return { kind: 'cart-changed' };
  }

  clearMockCartById(input.cartId);
  recordMutation(input.cartId, []);

  return { kind: 'completed' };
};

export const cart = {
  getSnapshot,
  completeCheckout,
};
