import { orders } from '~/server/domain/orders';
import { getExistingMockCartUserId } from '~/server/utils/mockCart';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { AccountRole } from '~/types/signup/form';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const authorization = getHeaders(event).authorization;
  const authenticatedUser = getMockUserFromAuthHeader(authorization);
  const guestOwnerId =
    !authenticatedUser && process.env.NUXT_PUBLIC_MOCK_MODE === 'true' ? getExistingMockCartUserId(event, authorization) : null;

  if (!authenticatedUser && !guestOwnerId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const scopedCustomerId = authenticatedUser?.role === AccountRole.Admin ? undefined : authenticatedUser?._id || guestOwnerId || undefined;
  const order = await orders.findById(id, scopedCustomerId);

  if (!order) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Order not found',
    });
  }

  return {
    status: 'success',
    data: order,
  };
});
