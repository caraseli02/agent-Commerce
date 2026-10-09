import type { AccountRole, AccountType } from '~~/types';
import type { AccountAdminSettings } from '~~/types/auth/account-settings';

export interface UserInterface {
  _id?: string;
  accountType?: AccountType;
  role: AccountRole;
  firebaseId?: string;
  stripeId?: string;
  verified: boolean;
  status: AccountStatusEnum;
  erpId?: string;
  companyDetails?: CompanyDetails;
  contactDetails: ContactDetails;
  personalDetails?: PersonalDetails;
  profileDetails?: ProfileDetails;
  currentStatus?: 'online' | 'offline';
  adminSettings?: AccountAdminSettings;
  spent?: number;
  ordersCount?: number;
  messages?: AccountMessageInterface[];
  productVisitedHistory?: ProductVisitedHistory[];
  createdAt?: string;
  clientCode?: string;
}

export enum AccountStatusEnum {
  Inactive = 0,
  Active = 1,
  Pending = 2,
}

export type CustomerTableColumns = Pick<
  UserInterface,
  | '_id'
  | 'accountType'
  | 'firebaseId'
  | 'verified'
  | 'status'
  | 'spent'
  | 'ordersCount'
  | 'contactDetails'
  | 'personalDetails'
  | 'companyDetails'
  | 'adminSettings'
  | 'createdAt'
>;

export interface ProductVisitedHistory {
  productId: string;
  count: number;
  createdAt?: string;
}

export interface AccountMessageInterface extends MessageEntityInterface {
  messageTemplateId?: string;
  read?: boolean;
}

export interface MessageEntityInterface {
  _id?: string;
  title: string;
  body: string;
  icon?: string;
  link: string;
  sentTo?: string[];
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  address: AddressInterface;
  shippingAddress: ShippingAddressInterface[];
  billingAddress: BillingAddressInterface[];
}

export interface ContactDetails {
  firstName: string;
  lastName: string;
  phone: string;
  mobile?: string;
  email: string;
  _id?: string;
}

export interface ProfileDetails {
  email: string;
  password?: string;
  _id?: string;
}

export interface CompanyDetails {
  name: string;
  registrationNumber: string;
  bank_name?: string;
  bank_iban?: string;
  vat?: string;
  taxId?: string;
  address: AddressInterface;
  shippingAddress: ShippingAddressInterface[];
  billingAddress: BillingAddressInterface[];
  _id?: string;
}

export interface AddressInterface {
  alias?: string;
  name1: string;
  name2?: string;
  country: string;
  region: string;
  city: string;
  postcode: string;
  _id: string;
  icon?: string;
}

export interface ShippingAddressInterface {
  alias?: string;
  name1: string;
  name2?: string;
  default: boolean;
  country: string;
  region: string;
  city: string;
  postcode: string;
  phone?: string;
  _id?: string;
}

export interface BillingAddressInterface {
  alias?: string;
  name1: string;
  name2?: string;
  default: boolean;
  country: string;
  region: string;
  city: string;
  postcode: string;
  phone?: string;
  _id?: string;
}

export interface MarketingPreferences {
  cookiesPolicy?: object;
  newsletter?: object;
  emailMarketing?: EmailMarketing;
  _id?: string;
}

export interface EmailMarketing {
  app?: boolean;
  email: string;
  _id?: string;
}
