import { getCookie } from 'h3';
import { z } from 'zod';
import { issueCustomerAccountToken, toCustomerAccountUser } from '~~/server/utils/accountSession';
import { consumeAuthAttempts, createCustomerAccount, DuplicateEmailError } from '~~/server/utils/customerAccounts';
import { mergeGuestCartIntoMockCart } from '~~/server/utils/mockCart';
import { parseZodBody } from '~~/server/utils/zodBody';

const registerBodySchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// The only signup route: it creates a persistent customer account or fails; it never reports fake success.
export default defineEventHandler(async (event) => {
  const body = parseZodBody(registerBodySchema, await readBody(event));
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  await consumeAuthAttempts([{ scope: 'register-ip', value: ip, limit: 5 }], 60 * 60);

  let account;
  try {
    account = await createCustomerAccount(body);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      throw createError({ statusCode: 409, statusMessage: 'An account with this email already exists' });
    }
    throw error;
  }

  const user = toCustomerAccountUser(account);
  const token = issueCustomerAccountToken(account);
  await mergeGuestCartIntoMockCart(account.id, getCookie(event, 'guest-session-id'));

  setResponseStatus(event, 201);
  return { status: 'success', token, user, data: { token, user } };
});
