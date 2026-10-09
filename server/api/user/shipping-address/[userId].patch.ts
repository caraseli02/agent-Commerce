import { handleUpdateAddress } from '~~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId');

  return handleUpdateAddress(event, 'shipping', userId);
});
