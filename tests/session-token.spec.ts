import { describe, expect, it } from 'vitest';
import { MOCK_ADMIN_PERMISSIONS, MOCK_CUSTOMER_PERMISSIONS } from '~/utils/mockAuth';
import { readCustomerAccountClaims, readSessionToken } from '~/utils/sessionToken';

const accountToken = (claims: Record<string, unknown>) =>
  ['header', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'signature'].join('.');
const now = () => Math.floor(Date.now() / 1000);
const customerClaims = { typ: 'customer-account', sub: 'cus_1', user_id: 'cus_1', role: 'customer' };

describe('client session token reading', () => {
  it('reads seeded demo tokens with their demo permissions', () => {
    expect(readSessionToken(`demo-token::mock-admin-1::${Date.now()}`)).toEqual({
      userId: 'mock-admin-1',
      permissions: MOCK_ADMIN_PERMISSIONS,
    });
  });

  it('reads a registered customer token as customer-only', () => {
    expect(readSessionToken(`Bearer ${accountToken({ ...customerClaims, exp: now() + 60 })}`)).toEqual({
      userId: 'cus_1',
      permissions: MOCK_CUSTOMER_PERMISSIONS,
    });
  });

  it('ignores expired, foreign and malformed tokens', () => {
    expect(readCustomerAccountClaims(accountToken({ ...customerClaims, exp: now() - 1 }))).toBeNull();
    expect(readCustomerAccountClaims(accountToken({ user_id: 'firebase-user', exp: now() + 60 }))).toBeNull();
    expect(readSessionToken('not-a-token')).toBeNull();
    expect(readSessionToken(null)).toBeNull();
  });
});
