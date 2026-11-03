import type { H3Event } from 'h3';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';
import type { OperatorPermission } from '~~/types/inventory';
import { verifyCustomerAccountToken } from './accountSession';

export type Operator = { accountId: string; permissions: OperatorPermission[] };

// The account's current grants, read on every call so a revoke applies to the next request.
const readOperatorPermissions = async (accountId: string) => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<{ permission: OperatorPermission }>(
    'SELECT permission FROM operator_grants WHERE account_id = $1 ORDER BY permission',
    [accountId],
  );
  return rows.map((row) => row.permission);
};

// Operator boundary (docs/system-design/09-operator-authorization.md). Identity comes only from a
// signed account token; demo tokens, request bodies and headers other than Authorization never
// grant anything. 401 without a valid token, 403 without the permission (or without any grant).
export const requireOperator = async (event: H3Event, permission?: OperatorPermission): Promise<Operator> => {
  const claims = verifyCustomerAccountToken(getHeaders(event).authorization);
  if (!claims) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });

  let permissions: OperatorPermission[];
  try {
    permissions = await readOperatorPermissions(claims.sub);
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Operator access is temporarily unavailable.' });
  }
  if (!permissions.length || (permission && !permissions.includes(permission)))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  return { accountId: claims.sub, permissions };
};
