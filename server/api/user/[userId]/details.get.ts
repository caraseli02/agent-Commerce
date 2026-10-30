import { UserPermissionsEnum } from '~~/types/auth/permissions';
import { getMockUserById, getMockUserFromAuthHeader } from '~~/server/utils/mockUsers';
import { getRuntimeAddresses } from '~~/server/utils/mockRuntimeAddresses';
import { isCustomerAccountId, toCustomerAccountUser } from '~~/server/utils/accountSession';
import { findCustomerAccountById } from '~~/server/utils/customerAccounts';

// Registered customers come from PostgreSQL; seeded demo users from the mock fixtures.
const findUser = async (userId?: string) => {
  if (!isCustomerAccountId(userId)) return getMockUserById(userId);
  const account = await findCustomerAccountById(userId);
  return account ? toCustomerAccountUser(account) : null;
};

export default defineEventHandler(async (event) => {
  const headers = getHeaders(event);
  const requester = getMockUserFromAuthHeader(headers.authorization);
  const userId = getRouterParam(event, 'userId');

  if (!requester) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const user = await findUser(userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    });
  }

  const isSelfRequest = requester._id === user._id;
  const isAdmin = requester.permissions.includes(UserPermissionsEnum.AdminDashboardRead);

  if (!isSelfRequest && !isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    });
  }

  const addresses = getRuntimeAddresses(user._id);
  const userWithCurrentAddresses = user.personalDetails
    ? {
        ...user,
        personalDetails: {
          ...user.personalDetails,
          ...addresses,
        },
      }
    : {
        ...user,
        companyDetails: {
          ...user.companyDetails,
          ...addresses,
        },
      };

  return {
    status: 'success',
    data: userWithCurrentAddresses,
  };
});
