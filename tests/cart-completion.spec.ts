import { beforeEach, describe, expect, it } from 'vitest';
import { cart } from '~/server/domain/cart';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
import { addProductsToMockCart, getMockCartForUser } from '~/server/utils/mockCart';

const cleanCheckout = async () => {
  const database = await getCheckoutDatabase();
  await database.execute(
    'TRUNCATE checkout_claim_aliases, checkout_claims, checkout_payments, checkout_orders, checkout_reservations, checkout_inventory, checkout_carts CASCADE',
  );
};

const readPersistedCart = async (cartId: string) => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<{ revision: number; payload_json: string }>(
    'SELECT revision, payload_json FROM checkout_carts WHERE cart_id = $1',
    [cartId],
  );
  if (!row) throw new Error(`Expected checkout cart ${cartId} to exist.`);
  return row;
};

describe('Cart checkout completion', () => {
  beforeEach(cleanCheckout);

  it('preserves the complete newer cart payload when an edit commits before a competing completion reads it', async () => {
    const ownerId = 'cart-completion-edit-first';
    const mockCart = await getMockCartForUser(ownerId);
    await addProductsToMockCart(mockCart, [{ id: 'prod-1', stock: 1, isFolder: false }]);
    const beforeCompletion = await readPersistedCart(String(mockCart._id));
    let releaseCompletion!: () => void;
    const completionMayRead = new Promise<void>((resolve) => {
      releaseCompletion = resolve;
    });
    let markCompletionActive!: () => void;
    const completionActive = new Promise<void>((resolve) => {
      markCompletionActive = resolve;
    });

    const completion = withCheckoutTransaction(async () => {
      markCompletionActive();
      await completionMayRead;
      return cart.completeCheckout({
        cartId: String(mockCart._id),
        ownerId,
        expectedRevision: String(beforeCompletion.revision),
      });
    });
    await completionActive;
    await addProductsToMockCart(mockCart, [{ id: 'prod-2', stock: 1, isFolder: false }]);
    const newerCart = await readPersistedCart(String(mockCart._id));

    releaseCompletion();
    await expect(completion).resolves.toEqual({ kind: 'cart-changed' });
    expect(await readPersistedCart(String(mockCart._id))).toEqual(newerCart);
    expect(newerCart.revision).toBe(beforeCompletion.revision + 1);
    expect(JSON.parse(newerCart.payload_json).products).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'prod-1', stock: 1 }), expect.objectContaining({ id: 'prod-2', stock: 1 })]),
    );
  });

  it('converges concurrent completion attempts on one clear and one revision increment', async () => {
    const ownerId = 'cart-completion-concurrent';
    const mockCart = await getMockCartForUser(ownerId);
    await addProductsToMockCart(mockCart, [{ id: 'prod-1', stock: 1, isFolder: false }]);
    const beforeCompletion = await readPersistedCart(String(mockCart._id));
    const completionInput = {
      cartId: String(mockCart._id),
      ownerId,
      expectedRevision: String(beforeCompletion.revision),
    };

    const results = await Promise.all([
      withCheckoutTransaction(() => cart.completeCheckout(completionInput)),
      withCheckoutTransaction(() => cart.completeCheckout(completionInput)),
    ]);

    expect(results.sort((left, right) => left.kind.localeCompare(right.kind))).toEqual([{ kind: 'cart-changed' }, { kind: 'completed' }]);
    const afterCompletion = await readPersistedCart(String(mockCart._id));
    expect(afterCompletion.revision).toBe(beforeCompletion.revision + 1);
    expect(JSON.parse(afterCompletion.payload_json).products).toEqual([]);
  });
});
