import { getCookie } from 'h3';
import { z } from 'zod';
import { createMockToken, getMockUserByCredentials } from '~~/server/utils/mockUsers';
import { mergeGuestCartIntoMockCart } from '~~/server/utils/mockCart';
import { parseZodBody } from '~~/server/utils/zodBody';

const loginBodySchema = z
  .object({
    email: z.string().trim().max(254).optional(),
    clientCode: z.string().trim().max(64).optional(),
    password: z.string().min(1, 'Password is required').max(256),
  })
  .refine((body) => Boolean(body.email || body.clientCode), {
    message: 'Email or client code is required',
    path: ['email'],
  });

export default defineEventHandler(async (event) => {
  const body = parseZodBody(loginBodySchema, await readBody(event));
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
