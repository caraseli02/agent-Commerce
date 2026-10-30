export enum AccountType {
  Personal = 0,
  SoleTrader = 1,
  Business = 2,
  Agent = 3,
}

export interface AccountTypeInfo {
  value: AccountType;
  label: string;
  badge: { bg: string; text: string };
}

export const getAccountTypeById = (enumValue: number): string | null => {
  const keys = (Object.keys(AccountType) as Array<keyof typeof AccountType>).filter((key) => AccountType[key] === enumValue);
  return keys[0] ?? null;
};

export enum AccountRole {
  SuperAdmin = 0,
  Admin = 1,
  Client = 2,
}
