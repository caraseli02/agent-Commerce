import { getCookie } from 'h3';
import { z } from 'zod';
import { issueCustomerAccountToken, toCustomerAccountUser } from '~~/server/utils/accountSession';
import { authenticateCustomerAccount, consumeAuthAttempts, normalizeEmail } from '~~/server/utils/customerAccounts';
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

const signedIn = (token: string, user: object) => ({ status: 'success', token, user, data: { token, user } });

export default defineEventHandler(async (event) => {
  const body = parseZodBody(loginBodySchema, await readBody(event));
  const guestSessionId = getCookie(event, 'guest-session-id');

  // Seeded demo users exist only for the mock-mode portfolio demo.
  const mockModeEnabled = String(useRuntimeConfig(event).public.MOCK_MODE) === 'true';
  const demo = mockModeEnabled ? getMockUserByCredentials(body) : undefined;
  if (demo) {
    await mergeGuestCartIntoMockCart(demo.user._id, guestSessionId);
    return signedIn(createMockToken(demo.user._id || 'mock-customer-1'), demo.user);
  }

  const email = body.email ? normalizeEmail(body.email) : '';
  if (email) {
    const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
    await consumeAuthAttempts(
      [
        { scope: 'login-ip', value: ip, limit: 30 },
        { scope: 'login-email', value: email, limit: 10 },
      ],
      15 * 60,
    );

    const account = await authenticateCustomerAccount(email, body.password);
    if (account) {
      await mergeGuestCartIntoMockCart(account.id, guestSessionId);
      return signedIn(issueCustomerAccountToken(account), toCustomerAccountUser(account));
    }
  }

  throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' });
});
