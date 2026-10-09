import type { CustomerCreditInterface } from '~~/types/auth/account-settings';

export const resolveCreditUnavailableReason = (accountCredit: CustomerCreditInterface, orderTotal: number) => {
  if (!accountCredit.active) return 'Credit checkout is unavailable because this account has no active credit facility.';
  if (accountCredit.freeze) return 'Credit checkout is temporarily unavailable because this account is frozen.';

  const available = Number(accountCredit.available || 0);
  const required = Number(orderTotal || 0);
  if (available < required) {
    return `Credit checkout requires ${required.toFixed(2)} Lei, but only ${available.toFixed(2)} Lei is available.`;
  }

  return null;
};
