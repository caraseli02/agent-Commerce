import { checkoutErrorResponse } from '~/types/order/checkout-error';
import { resumeOrderPayment } from '~/server/application/checkout/resume-order-payment';
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
  const result = await resumeOrderPayment({ ownerId, orderId });
  if (result.kind === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  if (result.kind === 'not-payable') throw createError(checkoutErrorResponse('checkout_not_payable'));
  if (result.kind === 'unavailable') throw createError(checkoutErrorResponse('inventory_unavailable'));
  if (result.kind === 'recovery-required') throw createError(checkoutErrorResponse('payment_recovery_required'));
  return { status: 'success', data: result };
});
