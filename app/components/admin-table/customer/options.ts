import { AccountType } from '~~/types';
import type { AccountTypeInfo } from '~~/types';

export const accountType = [
  { value: AccountType.Personal, label: 'Personal', badge: { bg: 'bg-green-800', text: 'P' } },
  { value: AccountType.Agent, label: 'Agent', badge: { bg: 'bg-yellow-800', text: 'A' } },
  { value: AccountType.Business, label: 'Business', badge: { bg: 'bg-purple-800', text: 'B' } },
  { value: AccountType.SoleTrader, label: 'Sole trader', badge: { bg: 'bg-blue-800', text: 'S' } },
];

export function getCustomerTypeInfo(type: number): AccountTypeInfo | null {
  return accountType.find((item) => item.value === type) as unknown as AccountTypeInfo | null;
}
