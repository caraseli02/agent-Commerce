import { describe, expect, it } from 'vitest';
import { orderTotal, orderTotalLei, orderUserInfo } from '../app/components/client-table/order/cellValues';
import { formatLei, formatNumberWithCommas, formatOrderRef } from '../app/utils/numbers';
import type { OrderTableColumns } from '../types';

const completeOrder = {
  user: { contactDetails: { firstName: 'Ana', lastName: 'Pop', email: 'ana@example.com' } },
  total: 1234.5,
} as unknown as OrderTableColumns;

describe('order table cell values', () => {
  it('renders the name, email and total of a complete order as before', () => {
    expect(orderUserInfo(completeOrder)).toEqual({ name: 'Ana Pop', email: 'ana@example.com' });
    expect(orderTotal(completeOrder.total, 'lei')).toBe(formatNumberWithCommas(1234.5, 'lei'));
    expect(orderTotal(completeOrder.total, ' lei')).toBe(formatNumberWithCommas(1234.5, ' lei'));
  });

  it('falls back to N/A for an order without a user or a total instead of throwing (#749)', () => {
    const partialOrder = { paymentDetails: { status: 0 } } as unknown as OrderTableColumns;
    expect(orderUserInfo(partialOrder)).toEqual({ name: 'N/A', email: 'N/A' });
    expect(orderTotal(undefined, 'lei')).toBe('N/A');
    expect(orderTotal(Number.NaN, 'lei')).toBe('N/A');
    expect(orderTotal('12', 'lei')).toBe('N/A');
  });

  it('keeps the parts of the contact details that exist', () => {
    const order = { user: { contactDetails: { firstName: 'Ana' } } } as unknown as OrderTableColumns;
    expect(orderUserInfo(order)).toEqual({ name: 'Ana', email: 'N/A' });
  });

  it('formats money like the storefront and unifies order references', () => {
    expect(formatLei(1499.99)).toBe('1499.99 Lei');
    expect(orderTotalLei(1499.99)).toBe('1499.99 Lei');
    expect(orderTotalLei(undefined)).toBe('N/A');
    expect(formatOrderRef('#953775')).toBe('ORD-953775');
    expect(formatOrderRef('ORD-953775')).toBe('ORD-953775');
    expect(formatOrderRef('ORD-2024-0030')).toBe('ORD-2024-0030');
    expect(formatOrderRef(undefined)).toBe('N/A');
  });
});
