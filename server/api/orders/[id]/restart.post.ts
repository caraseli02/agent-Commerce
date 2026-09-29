import { restartCanceledCheckout } from '~/server/application/checkout/restart-canceled-checkout';
import { getExistingMockCartUserId } from '~/server/utils/mockCart';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';

export default defineEventHandler(async (event) => {
  const authorization = getHeaders(event).authorization;
  const authenticatedUser = getMockUserFromAuthHeader(authorization);
  const mockModeEnabled = String(useRuntimeConfig(event).public.MOCK_MODE) === 'true';
  const ownerId = authenticatedUser?._id || (mockModeEnabled ? getExistingMockCartUserId(event, authorization) : '');
  if (!ownerId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  const orderId = getRouterParam(event, 'id') || '';
  const result = await restartCanceledCheckout({ ownerId, orderId });
  if (result.kind === 'not-found') throw createError({ statusCode: 404, statusMessage: 'Order not found' });
  if (result.kind === 'not-canceled')
    throw createError({ statusCode: 409, statusMessage: 'This checkout has not been canceled.', data: { code: 'checkout_not_canceled' } });
  if (result.kind === 'cart-empty')
    throw createError({
      statusCode: 409,
      statusMessage: 'The cart is empty. Add items before reviewing a new order.',
      data: { code: 'cart_empty' },
    });
  if (result.kind === 'recovery-required')
    throw createError({
      statusCode: 409,
      statusMessage: 'The cart could not be prepared for review.',
      data: { code: 'cart_recovery_required' },
    });

  return {
    status: 'success',
    data: { reviewRequired: true, cartId: result.cartId, cartRevision: result.cartRevision },
  };
});
