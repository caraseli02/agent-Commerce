import {
  addBilling as addBillingApi,
  addShipping as addShippingApi,
  deleteBilling as deleteBillingApi,
  deleteShipping as deleteShippingApi,
  fetchActivityLogs as fetchActivityLogsApi,
  fetchBilling as fetchBillingApi,
  fetchCustomerCredit as fetchCustomerCreditApi,
  fetchCustomerDiscount as fetchCustomerDiscountApi,
  fetchCustomerSettings as fetchCustomerSettingsApi,
  fetchShipping as fetchShippingApi,
  fetchTransactions as fetchTransactionsApi,
  markSettingsAsRead as markSettingsAsReadApi,
  toggleCloseCustomerCredit as toggleCloseCustomerCreditApi,
  toggleFreezeCustomerCredit as toggleFreezeCustomerCreditApi,
  updateAccountDetails as updateAccountDetailsApi,
  updateBilling as updateBillingApi,
  updateCustomerCredit as updateCustomerCreditApi,
  updateCustomerDiscount as updateCustomerDiscountApi,
  updateShipping as updateShippingApi,
} from '~/composables/api/control-panel';
import { fetchCustomerInformation as fetchCustomerInformationApi } from '~/composables/api/customer-profile';
import { validateAddress as validateAddressApi } from '~/composables/api/orders';
import { resetPasswordLink as resetPasswordLinkApi } from '~/composables/api/user';
import type { AccountAdminSettings, CustomerCreditInterface, DiscountInterface } from '~~/types/auth/account-settings';
import type {
  AddressInterface,
  BillingAddressInterface,
  CompanyDetails,
  ContactDetails,
  ShippingAddressInterface,
  UserInterface,
} from '~~/types/auth/user-interface';
import type { BillingAddressesData, ShippingAddressesData } from '~~/types/dashboard/control-panel';

type StatusPayload<T> = { status: string; data: T };

function isStatusPayload<T>(value: unknown): value is StatusPayload<T> {
  return Boolean(value && typeof value === 'object' && typeof (value as { status?: unknown }).status === 'string');
}

function asSuccessData<T>(value: unknown): T | null {
  if (!isStatusPayload<T>(value) || value.status !== 'success') {
    return null;
  }

  return value.data;
}

function isAddressValidationResult(value: unknown): value is { data: { valid: boolean } } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = (value as { data?: unknown }).data;
  return Boolean(data && typeof data === 'object' && typeof (data as { valid?: unknown }).valid === 'boolean');
}

export interface SaveOrganizationDetailsInput {
  customerId: string;
  accountType: number;
  address: AddressInterface;
  companyDetails: Partial<CompanyDetails>;
  contactDetails: ContactDetails;
  shippingAddress?: ShippingAddressInterface[];
}

export function useControlPanel() {
  const isAccountAddressValid = async (address: ShippingAddressInterface): Promise<boolean> => {
    const result = await validateAddressApi(address);

    if (!isAddressValidationResult(result)) {
      return false;
    }

    return result.data.valid;
  };

  const saveOrganizationDetails = async ({
    customerId,
    accountType,
    address,
    companyDetails,
    contactDetails,
    shippingAddress = [],
  }: SaveOrganizationDetailsInput): Promise<boolean> => {
    const addressValid = await isAccountAddressValid({
      country: address.country,
      region: address.region,
      city: address.city,
      postcode: address.postcode,
      name1: address.name1,
      name2: address.name2,
      default: false,
    });

    if (!addressValid) {
      return false;
    }

    const payload = {
      companyDetails: {
        ...companyDetails,
        address,
        shippingAddress,
      },
      contactDetails,
    } as UserInterface;

    await updateAccountDetailsApi(customerId, payload, accountType);
    return true;
  };

  const loadBillingAddresses = async (customerId: string, accountType: number): Promise<BillingAddressInterface[] | null> => {
    const response = await fetchBillingApi(customerId, accountType);
    const data = asSuccessData<BillingAddressesData>(response);
    return data?.billingAddress ?? null;
  };

  const loadShippingAddresses = async (customerId: string, accountType: number): Promise<ShippingAddressInterface[] | null> => {
    const response = await fetchShippingApi(customerId, accountType);
    const data = asSuccessData<ShippingAddressesData>(response);
    return data?.shippingAddress ?? null;
  };

  const loadCustomerSettings = async (customerId: string): Promise<AccountAdminSettings | null> => {
    const response = await fetchCustomerSettingsApi(customerId);
    return asSuccessData<AccountAdminSettings>(response);
  };

  const loadCustomerDiscount = async (customerId: string): Promise<number | null> => {
    const response = await fetchCustomerDiscountApi(customerId);

    if (isStatusPayload<DiscountInterface>(response) && response.status === 'success') {
      return response.data.value;
    }

    return null;
  };

  const saveCustomerDiscount = async (discount: number, customerId: string): Promise<boolean> => {
    const response = await updateCustomerDiscountApi(discount, customerId);
    return isStatusPayload(response) ? response.status === 'success' : Boolean(response);
  };

  const loadCustomerCredit = async (customerId: string): Promise<CustomerCreditInterface | null> => {
    const response = await fetchCustomerCreditApi(customerId);

    if (isStatusPayload<CustomerCreditInterface>(response) && response.status === 'success') {
      return response.data;
    }

    return null;
  };

  const addShipping = async (address: ShippingAddressInterface, userId: string) => {
    return (await addShippingApi(address, userId)) as StatusPayload<string>;
  };

  const updateShipping = async (address: ShippingAddressInterface, userId: string) => {
    return (await updateShippingApi(address, userId)) as StatusPayload<string>;
  };

  const deleteShipping = async (addressId: string, userId: string) => {
    return await deleteShippingApi(addressId, userId);
  };

  const addBilling = async (address: BillingAddressInterface, userId: string) => {
    return (await addBillingApi(address, userId)) as StatusPayload<string>;
  };

  const updateBilling = async (address: BillingAddressInterface, userId: string) => {
    return (await updateBillingApi(address, userId)) as StatusPayload<string>;
  };

  const deleteBilling = async (addressId: string, userId: string) => {
    return await deleteBillingApi(addressId, userId);
  };

  return {
    isAccountAddressValid,
    saveOrganizationDetails,
    loadBillingAddresses,
    loadShippingAddresses,
    loadCustomerSettings,
    loadCustomerDiscount,
    saveCustomerDiscount,
    loadCustomerCredit,
    updateAccountDetails: updateAccountDetailsApi,
    addShipping,
    updateShipping,
    deleteShipping,
    addBilling,
    updateBilling,
    deleteBilling,
    fetchCustomerSettings: fetchCustomerSettingsApi,
    markSettingsAsRead: markSettingsAsReadApi,
    fetchCustomerDiscount: fetchCustomerDiscountApi,
    updateCustomerDiscount: updateCustomerDiscountApi,
    fetchCustomerCredit: fetchCustomerCreditApi,
    updateCustomerCredit: updateCustomerCreditApi,
    toggleCloseCustomerCredit: toggleCloseCustomerCreditApi,
    toggleFreezeCustomerCredit: toggleFreezeCustomerCreditApi,
    fetchTransactions: fetchTransactionsApi,
    fetchActivityLogs: fetchActivityLogsApi,
    fetchCustomerInformation: fetchCustomerInformationApi,
    resetPasswordLink: resetPasswordLinkApi,
  };
}
