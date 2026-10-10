import type { UpdateProductCartRequestInterface } from '~~/types/cart';
import { getMockCartForUser, requireMockCartUserId, setProductsInMockCart } from '~~/server/utils/mockCart';
import { withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Partial<UpdateProductCartRequestInterface>;
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);

  const cart = await withCheckoutTransaction(async () => {
    const currentCart = await getMockCartForUser(userId);
    return await setProductsInMockCart(currentCart, body.products || []);
  });

  return {
    status: 'success',
    data: cart,
  };
});
