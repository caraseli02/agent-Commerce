import type { DeleteProductCartRequestInterface } from '~/types/cart';
import { getMockCartForUser, removeProductsFromMockCart, requireMockCartUserId } from '~/server/utils/mockCart';
import { withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<DeleteProductCartRequestInterface>;
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  const cart = await withCheckoutTransaction(async () => {
    const currentCart = await getMockCartForUser(userId);
    return await removeProductsFromMockCart(currentCart, body.products || []);
  });

  return {
    status: 'success',
    data: cart,
  };
});
