import type { OrderTableColumns } from '~~/types';
import { formatLei, formatNumberWithCommas } from '~/utils/numbers';

const MISSING = 'N/A';

// A persisted order payload is not validated on read, so one incomplete row must not crash the whole table.
export function orderUserInfo(order: Partial<Pick<OrderTableColumns, 'user'>>): { name: string; email: string } {
  const contact = order.user?.contactDetails;
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ');
  return { name: name || MISSING, email: contact?.email ?? MISSING };
}

export function orderTotal(total: unknown, prefix: string): string {
  return typeof total === 'number' && Number.isFinite(total) ? formatNumberWithCommas(total, prefix) : MISSING;
}

export function orderTotalLei(total: unknown): string {
  return typeof total === 'number' && Number.isFinite(total) ? formatLei(total) : MISSING;
}
