import { isCustomerAccountId, toCustomerAccountUser } from '~~/server/utils/accountSession';
import { findCustomerAccountById } from '~~/server/utils/customerAccounts';
import { getMockUserById } from '~~/server/utils/mockUsers';
import { requireSelfOrAdmin } from '~~/server/utils/requireRequester';

// Returns the stored account; an unknown id is a 404, never a fabricated demo profile.
export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id');
  requireSelfOrAdmin(event, userId);

  const account = isCustomerAccountId(userId) ? await findCustomerAccountById(userId) : null;
  const user = account ? toCustomerAccountUser(account) : getMockUserById(userId);
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' });

  return { status: 'success', data: user };
});
