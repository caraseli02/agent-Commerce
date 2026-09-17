import { describe, expect, it } from 'vitest';
import { resolveCreditUnavailableReason } from '../helpers/checkout-credit';
import type { CustomerCreditInterface } from '../types/auth/account-settings';

const credit = (overrides: Partial<CustomerCreditInterface> = {}): CustomerCreditInterface => ({
  limit: 5000,
  spent: 1200,
  available: 3800,
  dueDate: '2026-03-31T00:00:00.000Z',
  tillDue: '30',
  term: 30,
  freeze: false,
  active: true,
  ...overrides,
});

describe('checkout credit availability', () => {
  it('allows credit when the active balance covers the order', () => {
    expect(resolveCreditUnavailableReason(credit(), 3500)).toBeNull();
  });

  it('explains the exact required and available amounts when credit is insufficient', () => {
    expect(resolveCreditUnavailableReason(credit(), 43430.62)).toBe(
      'Credit checkout requires 43430.62 Lei, but only 3800.00 Lei is available.',
    );
  });

  it('keeps inactive and frozen facilities disabled for their actual reason', () => {
    expect(resolveCreditUnavailableReason(credit({ active: false }), 100)).toMatch(/no active credit facility/);
    expect(resolveCreditUnavailableReason(credit({ freeze: true }), 100)).toMatch(/account is frozen/);
  });
});
