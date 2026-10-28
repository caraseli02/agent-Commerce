import { createHmac, timingSafeEqual } from 'node:crypto';
import { AccountRole, AccountType } from '~~/types/signup/form';
import type { UserPermissionsEnum } from '~~/types/auth/permissions';
import type { UserInterface } from '~~/types/auth/user-interface';
import { MOCK_CUSTOMER_PERMISSIONS } from '~/utils/mockAuth';
import { CUSTOMER_ACCOUNT_TOKEN_TYPE, type CustomerAccountClaims } from '~/utils/sessionToken';

export type { CustomerAccountClaims };

export type CustomerAccountUser = UserInterface & { permissions: UserPermissionsEnum[]; roles: AccountRole[] };

export const CUSTOMER_ACCOUNT_ID_PATTERN = /^cus_[0-9a-f]{32}$/;

export const isCustomerAccountId = (id?: string | null) => CUSTOMER_ACCOUNT_ID_PATTERN.test(String(id || ''));

/** A registered customer as the app's user shape: customer permissions only, no demo profile data. */
export const toCustomerAccountUser = (account: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
}): CustomerAccountUser => ({
  _id: account.id,
  firebaseId: account.id,
  role: AccountRole.Client,
  accountType: AccountType.Personal,
  verified: false,
  status: 1,
  permissions: [...MOCK_CUSTOMER_PERMISSIONS],
  roles: [AccountRole.Client],
  contactDetails: { firstName: account.firstName, lastName: account.lastName, email: account.email, phone: '' },
  profileDetails: { email: account.email },
  personalDetails: {
    firstName: account.firstName,
    lastName: account.lastName,
    address: { _id: `${account.id}-address`, name1: '', country: '', region: '', city: '', postcode: '' },
    shippingAddress: [],
    billingAddress: [],
  },
  adminSettings: { discount: { value: 0, startDate: '', endDate: '' } },
  ...(account.createdAt ? { createdAt: account.createdAt } : {}),
});

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
// Local development and tests only; deployed environments must set AUTH_SESSION_SECRET.
const DEVELOPMENT_SECRET = 'agent-commerce-development-session-secret-not-for-deployments';

const sessionSecret = () => {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.VERCEL) {
    throw createError({ statusCode: 503, statusMessage: 'Account sessions are not configured' });
  }
  return DEVELOPMENT_SECRET;
};

/** Throws 503 before any account write when a deployment has no session secret. */
export const assertCustomerSessionsConfigured = () => void sessionSecret();

const sign = (input: string) => createHmac('sha256', sessionSecret()).update(input).digest('base64url');

export const issueCustomerAccountToken = (account: { id: string; email: string; firstName: string; lastName: string }) => {
  const now = Math.floor(Date.now() / 1000);
  const claims: CustomerAccountClaims = {
    typ: CUSTOMER_ACCOUNT_TOKEN_TYPE,
    sub: account.id,
    user_id: account.id,
    role: 'customer',
    email: account.email,
    given_name: account.firstName,
    family_name: account.lastName,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const unsigned = `${HEADER}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
  return `${unsigned}.${sign(unsigned)}`;
};

// Verifies signature, type and expiry. A forged, modified or expired token identifies nobody.
export const verifyCustomerAccountToken = (authorization?: string | null): CustomerAccountClaims | null => {
  const token = String(authorization || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  const [header, payload, signature, ...rest] = token.split('.');
  if (!header || !payload || !signature || rest.length || header !== HEADER) return null;

  const expected = Buffer.from(sign(`${header}.${payload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CustomerAccountClaims;
    const now = Math.floor(Date.now() / 1000);
    if (claims.typ !== CUSTOMER_ACCOUNT_TOKEN_TYPE || claims.role !== 'customer' || claims.sub !== claims.user_id) return null;
    if (!isCustomerAccountId(claims.sub) || !(claims.exp > now) || claims.iat > now + 60) return null;
    return claims;
  } catch {
    return null;
  }
};
