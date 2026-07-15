import { handleDeleteAddress } from '~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => {
  const addressId = getRouterParam(event, 'id');

  return handleDeleteAddress(event, 'billing', addressId);
});
