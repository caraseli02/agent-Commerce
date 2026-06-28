import type { DeleteProductCartRequestInterface } from '~/model/cart/request/cart.interface';
import { getMockCartForUser, removeProductsFromMockCart, requireMockCartUserId } from '~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<DeleteProductCartRequestInterface>;
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  const cart = getMockCartForUser(userId);
  removeProductsFromMockCart(cart, body.products || []);

  return {
    status: 'success',
    data: cart,
  };
});
