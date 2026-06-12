import type { SelectInputObject, StringInputObject } from '../global';

export type SignupAccountType = 'personal' | 'sole-trader' | 'business';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getAccountTypeById = (enumValue: number): string | null => {
    const keys = (Object.keys(AccountType) as Array<keyof typeof AccountType>).filter((key) => AccountType[key] === enumValue);
    return keys.length > 0 ? keys[0] : null;
};

export enum AccountRole {
    SuperAdmin = 0,
    Admin = 1,
    Client = 2,
}

export interface SignupBusinessDetails {
    fullCompanyName: StringInputObject;
    companyRegistrationNumber: StringInputObject;
    vatNumber?: StringInputObject;
    country: CountryType;
    region: CountryType;
    city: StringInputObject;
    postcode: StringInputObject;
    addressLine1: StringInputObject;
    addressLine2: StringInputObject;
}

export interface SignupPersonalDetails {
    firstName: StringInputObject;
    lastName: StringInputObject;
    country: SelectInputObject;
    region: SelectInputObject;
    city: StringInputObject;
    postcode: StringInputObject;
    addressLine1: StringInputObject;
    addressLine2: StringInputObject;
}

export interface SignupContactDetails {
    firstName: StringInputObject;
    lastName: StringInputObject;
    phone: StringInputObject;
    mobile: StringInputObject;
    companyEmail: StringInputObject;
    email: StringInputObject;
    confirmCompanyEmail: StringInputObject;
    confirmEmail: StringInputObject;
}

export interface SignupProfileDetails {
    useContactEmail: boolean;
    accountEmail: StringInputObject;
    confirmAccountEmail: StringInputObject;
    password: StringInputObject;
    repeatPassword: StringInputObject;
    subscribeToNewsletter: boolean;
    agreeToTerms: boolean;
}

export interface CountryType {
    value: SelectInputObject;
    label: string;
    icon: string;
}
