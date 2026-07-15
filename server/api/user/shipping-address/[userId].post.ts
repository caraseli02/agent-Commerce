import { handleAddAddress } from '~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId');

  return handleAddAddress(event, 'shipping', userId);
});
