import { checkoutErrorData } from '~/types/order/checkout-error';
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

  if (!stripePaymentsEnabled())
    throw createError({
      statusCode: 503,
      statusMessage: 'Stripe payments are unavailable.',
      data: checkoutErrorData('stripe_payments_disabled'),
    });

  const orderId = getRouterParam(event, 'id') || '';
  const result = await resumeOrderPayment({ ownerId, orderId });
  if (result.kind === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  if (result.kind === 'not-payable')
    throw createError({
      statusCode: 409,
      statusMessage: 'This order cannot accept another payment.',
      data: checkoutErrorData('checkout_not_payable'),
    });
  if (result.kind === 'unavailable')
    throw createError({
      statusCode: 409,
      statusMessage: 'The order is no longer available for payment.',
      data: checkoutErrorData('inventory_unavailable'),
    });
  if (result.kind === 'recovery-required')
    throw createError({
      statusCode: 409,
      statusMessage: 'Payment recovery requires review.',
      data: checkoutErrorData('payment_recovery_required'),
    });
  return { status: 'success', data: result };
});
