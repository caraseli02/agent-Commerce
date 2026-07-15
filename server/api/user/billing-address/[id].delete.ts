import { handleDeleteAddress } from '~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => {
  const addressId = getRouterParam(event, 'id');
  const query = getQuery(event);
  const userId = typeof query.userId === 'string' ? query.userId : null;

  return handleDeleteAddress(event, 'billing', addressId, userId);
});
