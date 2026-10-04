import { checkoutErrorResponse } from '~/types/order/checkout-error';
import { refreshOrderPayment } from '~/server/application/checkout/refresh-order-payment';
import { stripePaymentsEnabled } from '~/server/application/checkout/stripe-payment';
import { getExistingMockCartUserId } from '~/server/utils/mockCart';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';

export default defineEventHandler(async (event) => {
  const authorization = getHeaders(event).authorization;
  const authenticatedUser = getMockUserFromAuthHeader(authorization);
  const mockModeEnabled = String(useRuntimeConfig(event).public.MOCK_MODE) === 'true';
  const ownerId = authenticatedUser?._id || (mockModeEnabled ? getExistingMockCartUserId(event, authorization) : '');
  if (!ownerId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  if (!stripePaymentsEnabled()) throw createError(checkoutErrorResponse('stripe_payments_disabled'));

  const orderId = getRouterParam(event, 'id') || '';
  const state = await refreshOrderPayment({ ownerId, orderId });
  if (state.kind === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  return { status: 'success', data: state };
});
