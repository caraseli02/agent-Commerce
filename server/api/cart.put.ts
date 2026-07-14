import type { UpdateProductCartRequestInterface } from '~/types/cart';
import { getMockCartForUser, requireMockCartUserId, setProductsInMockCart } from '~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<UpdateProductCartRequestInterface>;
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  const cart = getMockCartForUser(userId);
  setProductsInMockCart(cart, body.products || []);

  return {
    status: 'success',
    data: cart,
  };
});
