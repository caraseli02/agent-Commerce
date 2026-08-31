import { placeOrder, PlaceOrderError } from '~/server/application/checkout/place-order';
import { createMockGuestCheckoutUser, getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { requireMockCartUserId } from '~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Record<string, unknown>;
  const headers = getHeaders(event);

  let user = getMockUserFromAuthHeader(headers.authorization);
  let cartOwnerId = user?._id || '';

  if (!user && process.env.NUXT_PUBLIC_MOCK_MODE === 'true') {
    cartOwnerId = requireMockCartUserId(event, headers.authorization);
    user = createMockGuestCheckoutUser(cartOwnerId);
  }

  if (!user || !cartOwnerId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const cartId = typeof body.cartId === 'string' ? body.cartId : '';
  const checkoutRequestId = typeof body.checkoutRequestId === 'string' ? body.checkoutRequestId : undefined;

  try {
    const result = await placeOrder({
      checkoutRequestId,
      cartId,
      cartOwnerId,
      user,
      order: body,
    });

    return {
      status: 'success',
      data: result,
    };
  } catch (error) {
    if (error instanceof PlaceOrderError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: {
          code: error.code,
        },
      });
    }

    throw error;
  }
});
