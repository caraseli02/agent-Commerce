import { handleUpdateAddress } from '~~/server/utils/mockAddressHandlers';

export default defineEventHandler(async (event) => {
  // The segment is named `id` to match `[id].delete.ts`: the router names a shared segment once (#723).
  const userId = getRouterParam(event, 'id');

  return handleUpdateAddress(event, 'shipping', userId);
});
