import { PaymentTypeEnum, PaymentStatusEnum } from '~/types/order-summary/item';
import { clearMockCartById, findMockCartById, requireMockCartUserId } from '~/server/utils/mockCart';
import { createRuntimeOrder } from '~/server/utils/mockRuntimeOrders';
import { getMockUserById, getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { MOCK_CUSTOMER_USER_ID } from '~/utils/mockAuth';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Record<string, unknown>;
  const headers = getHeaders(event);
  let user = getMockUserFromAuthHeader(headers.authorization);

  if (!user && process.env.NUXT_PUBLIC_MOCK_MODE === 'true') {
    const guestCartUserId = requireMockCartUserId(event, headers.authorization);
    user = getMockUserById(guestCartUserId) || getMockUserById(MOCK_CUSTOMER_USER_ID);
  }

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const cartId = typeof body.cartId === 'string' ? body.cartId : '';
  const cart = findMockCartById(cartId);
  const orderPayload = {
    ...body,
    products: Array.isArray(body.products) && body.products.length ? body.products : cart?.products || [],
  };

  const { orderId } = createRuntimeOrder(orderPayload, user);
  clearMockCartById(cartId);
  const paymentType = (body.paymentDetails as { type?: PaymentTypeEnum } | undefined)?.type;

  return {
    status: 'success',
    data: {
      orderId,
      status: PaymentStatusEnum.Paid,
      useExistingPaymentMethod: Boolean(body.stripeCardId),
      result:
        paymentType === PaymentTypeEnum.Card
          ? {
              status: 'succeeded',
            }
          : undefined,
      clientSecret: undefined,
    },
  };
});
