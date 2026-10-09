import { getCookie } from 'h3';
import { createMockToken, getMockUserByCredentials } from '~~/server/utils/mockUsers';
import { mergeGuestCartIntoMockCart } from '~~/server/utils/mockCart';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as { email?: string; clientCode?: string; password?: string };
  const match = getMockUserByCredentials(body);

  if (!match) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' });
  }

  const token = createMockToken(match.user._id || 'mock-customer-1');
  await mergeGuestCartIntoMockCart(match.user._id, getCookie(event, 'guest-session-id'));

  return {
    status: 'success',
    token,
    user: match.user,
    data: {
      token,
      user: match.user,
    },
  };
});
