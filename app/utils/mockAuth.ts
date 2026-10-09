import { UserPermissionsEnum } from '~/types/auth/permissions';

export const MOCK_CUSTOMER_USER_ID = 'mock-customer-1';
export const MOCK_ADMIN_USER_ID = 'mock-admin-1';

export const MOCK_CUSTOMER_PERMISSIONS: UserPermissionsEnum[] = [
  UserPermissionsEnum.ClientDashboardRead,
  UserPermissionsEnum.OrdersRead,
  UserPermissionsEnum.AccountDataRead,
  UserPermissionsEnum.DeliveryDetailsRead,
  UserPermissionsEnum.PaymentDetailsRead,
  UserPermissionsEnum.TransactionRead,
  UserPermissionsEnum.FavouriteRead,
];

export const MOCK_ADMIN_PERMISSIONS: UserPermissionsEnum[] = Object.values(UserPermissionsEnum) as UserPermissionsEnum[];

const MOCK_PERMISSIONS_BY_USER_ID: Record<string, UserPermissionsEnum[]> = {
  [MOCK_CUSTOMER_USER_ID]: MOCK_CUSTOMER_PERMISSIONS,
  [MOCK_ADMIN_USER_ID]: MOCK_ADMIN_PERMISSIONS,
};

export const getMockPermissionsByUserId = (userId?: string | null) => {
  if (!userId) {
    return null;
  }

  return MOCK_PERMISSIONS_BY_USER_ID[userId] || null;
};

export const parseMockToken = (token?: string | null) => {
  if (!token) {
    return null;
  }

  const normalizedToken = token.replace('Bearer ', '').trim();
  const match = /^demo-token::([^:]+)::(\d+)$/.exec(normalizedToken);

  if (!match) {
    return null;
  }

  const userId = match[1];
  const issuedAt = Number(match[2]);
  const now = Date.now();
  const maxTokenAgeMs = 60 * 60 * 1000;

  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > maxTokenAgeMs || !getMockPermissionsByUserId(userId)) {
    return null;
  }

  return {
    userId,
    issuedAt,
    token: normalizedToken,
  };
};
