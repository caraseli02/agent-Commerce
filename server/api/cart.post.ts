import type { AddToCartRequestInterface } from '~/types/cart';
import { addProductsToMockCart, getMockCartForUser, requireMockCartUserId } from '~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<AddToCartRequestInterface>;
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  const cart = getMockCartForUser(userId);
  addProductsToMockCart(cart, body.products || []);

  return {
    status: 'success',
    data: cart,
  };
});
