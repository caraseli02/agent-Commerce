import type { UserPermissionsEnum } from '~~/types/auth/permissions';
import { MOCK_CUSTOMER_PERMISSIONS, getMockPermissionsByUserId, parseMockToken } from '~/utils/mockAuth';

export const CUSTOMER_ACCOUNT_TOKEN_TYPE = 'customer-account';

/** Claims of a registered customer's session token (HS256 JWT, signed and verified on the server). */
export interface CustomerAccountClaims {
  typ: typeof CUSTOMER_ACCOUNT_TOKEN_TYPE;
  sub: string;
  user_id: string;
  role: 'customer';
  email: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return new TextDecoder().decode(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
};

/**
 * Reads a customer-account token's claims WITHOUT checking its signature. Only for
 * client-side routing and display; the server verifies every request (server/utils/accountSession.ts).
 */
export const readCustomerAccountClaims = (token?: string | null): CustomerAccountClaims | null => {
  const payload = String(token || '')
    .replace(/^Bearer\s+/i, '')
    .split('.')[1];
  if (!payload) return null;

  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as Partial<CustomerAccountClaims>;
    if (claims.typ !== CUSTOMER_ACCOUNT_TOKEN_TYPE || typeof claims.user_id !== 'string' || !claims.user_id) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null;
    return claims as CustomerAccountClaims;
  } catch {
    return null;
  }
};

/** Who a session token claims to be: a seeded demo user or a registered customer. */
export const readSessionToken = (token?: string | null): { userId: string; permissions: UserPermissionsEnum[] } | null => {
  const demo = parseMockToken(token);
  if (demo?.userId) return { userId: demo.userId, permissions: getMockPermissionsByUserId(demo.userId) || [] };

  const account = readCustomerAccountClaims(token);
  return account ? { userId: account.user_id, permissions: MOCK_CUSTOMER_PERMISSIONS } : null;
};
