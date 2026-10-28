import { isCustomerAccountId, toCustomerAccountUser } from '~~/server/utils/accountSession';
import { findCustomerAccountById } from '~~/server/utils/customerAccounts';
import { getDemoUserProfile } from '~~/server/utils/mockDashboardDemo';
import { requireSelfOrAdmin } from '~~/server/utils/requireRequester';

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId');
  requireSelfOrAdmin(event, userId);

  if (!isCustomerAccountId(userId)) return { status: 'success', data: getDemoUserProfile(userId) };

  const account = await findCustomerAccountById(userId);
  if (!account) throw createError({ statusCode: 404, statusMessage: 'User not found' });
  return { status: 'success', data: toCustomerAccountUser(account) };
});
