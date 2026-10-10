import { getMockCartForUser, requireMockCartUserId } from '~~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const userId = requireMockCartUserId(event, headers.authorization);
  const cart = await getMockCartForUser(userId);

  return {
    status: 'success',
    data: cart,
  };
});
