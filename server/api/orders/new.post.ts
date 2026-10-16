import { z } from 'zod';
import { checkoutErrorData, checkoutErrorResponse } from '~~/types/order/checkout-error';
import { placeOrder, PlaceOrderError } from '~~/server/application/checkout/place-order';
import { createMockGuestCheckoutUser, getMockUserFromAuthHeader } from '~~/server/utils/mockUsers';
import { requireMockCartUserId } from '~~/server/utils/mockCart';
import { parseZodBody } from '~~/server/utils/zodBody';

// Shape check only: missing review fields keep the existing `cart_changed` response,
// and the remaining order fields pass through to `placeOrder` unchanged.
const createOrderBodySchema = z
  .object({
    cartId: z.string().max(128).optional(),
    checkoutRequestId: z.string().max(128).optional(),
    reviewedCartRevision: z.string().max(256).optional(),
    reviewedQuoteFingerprint: z.string().max(256).optional(),
  })
  .passthrough();

export default defineEventHandler(async (event) => {
  const body = parseZodBody(createOrderBodySchema, await readBody(event));
  const headers = getHeaders(event);
  const mockModeEnabled = String(useRuntimeConfig(event).public.MOCK_MODE) === 'true';

  let user = getMockUserFromAuthHeader(headers.authorization);
  let cartOwnerId = user?._id || '';

  if (!user && mockModeEnabled) {
    cartOwnerId = requireMockCartUserId(event, headers.authorization);
    user = createMockGuestCheckoutUser(cartOwnerId);
  }

  if (!user || !cartOwnerId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const cartId = body.cartId ?? '';
  const checkoutRequestId = body.checkoutRequestId;
  const reviewedCartRevision = body.reviewedCartRevision?.trim() ?? '';
  const reviewedQuoteFingerprint = body.reviewedQuoteFingerprint?.trim() ?? '';

  if (!reviewedCartRevision || !reviewedQuoteFingerprint) {
    throw createError(checkoutErrorResponse('cart_changed'));
  }

  try {
    const result = await placeOrder({
      checkoutRequestId,
      cartId,
      cartOwnerId,
      reviewedCartRevision,
      reviewedQuoteFingerprint,
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
        data: checkoutErrorData(error.code),
      });
    }

    throw error;
  }
});
