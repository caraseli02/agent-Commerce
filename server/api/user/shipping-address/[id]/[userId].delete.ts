import { handleDeleteAddress } from '~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => {
  const addressId = getRouterParam(event, 'id');
  const userId = getRouterParam(event, 'userId');

  return handleDeleteAddress(event, 'shipping', addressId, userId);
});
