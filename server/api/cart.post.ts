import type { AddToCartRequestInterface } from '~/types/cart';
import { addProductsToMockCart, getMockCartForUser, requireMockCartUserId } from '~/server/utils/mockCart';
import { withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<AddToCartRequestInterface>;
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  const cart = await withCheckoutTransaction(async () => {
    const currentCart = await getMockCartForUser(userId);
    return await addProductsToMockCart(currentCart, body.products || []);
  });

  return {
    status: 'success',
    data: cart,
  };
});
