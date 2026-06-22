import { PaymentTypeEnum, PaymentStatusEnum } from '~/types/order-summary/item';
import { clearMockCartById, findMockCartById } from '~/server/utils/mockCart';
import { createRuntimeOrder } from '~/server/utils/mockRuntimeOrders';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as Record<string, unknown>;
  const headers = getHeaders(event);
  const user = getMockUserFromAuthHeader(headers.authorization);

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
