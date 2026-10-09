import { useNuxtApp } from '#app';
import type { $Fetch } from 'ofetch';
import type { AccountAdminSettings } from '~~/types/auth/account-settings';
import type { BillingAddressInterface, ShippingAddressInterface, UserInterface } from '~~/types/auth/user-interface';
import type { PaginatedTransactionsInterface } from '~~/types/dashboard/admin-users';

const MAIN_RESOURCE = '/dashboard/control-panel';
const SETTINGS_RESOURCE = `${MAIN_RESOURCE}/settings`;
const TRANSACTION_RESOURCE = '/transaction';
const ACTIVITY_LOGS_RESOURCE = '/audit';

interface SettingTogglePayload {
  key: string;
  [option: string]: string | boolean;
}

function getApiClient(apiClient?: $Fetch) {
  return apiClient ?? useNuxtApp().$apiClient;
}

function accountResource(id: string, type: number) {
  return `${MAIN_RESOURCE}/${id}/${type === 0 ? 'personal' : 'organization'}`;
}

export async function fetchCustomerSettings(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<{ status: string; data: AccountAdminSettings }>(`${SETTINGS_RESOURCE}/${id}`, {
    method: 'GET',
  });
}

export async function markSettingsAsRead(setting: SettingTogglePayload, type: string, id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<{ status: string; data: string }>(`${SETTINGS_RESOURCE}/${id}`, {
    method: 'POST',
    body: {
      setting: {
        name: setting.key,
        value: setting[type],
        option: type,
      },
    },
  });
}

export async function fetchCustomerDiscount(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(`${SETTINGS_RESOURCE}/discount/${id}`, {
    method: 'GET',
  });
}

export async function updateCustomerDiscount(discount: number, id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(`${SETTINGS_RESOURCE}/discount/${id}`, {
    method: 'PUT',
    body: {
      value: discount,
    },
  });
}

export async function fetchCustomerCredit(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(`${SETTINGS_RESOURCE}/customer-credit/${id}`, {
    method: 'GET',
  });
}

export async function updateCustomerCredit(term: number, limit: string, id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(`${SETTINGS_RESOURCE}/customer-credit/${id}`, {
    method: 'PUT',
    body: {
      term,
      limit,
    },
  });
}

export async function toggleCloseCustomerCredit(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(`${SETTINGS_RESOURCE}/customer-credit/close/${id}`, {
    method: 'PUT',
  });
}

export async function toggleFreezeCustomerCredit(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(`${SETTINGS_RESOURCE}/customer-credit/freeze/${id}`, {
    method: 'PUT',
  });
}

export async function fetchShipping(id: string, type: number, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(accountResource(id, type), {
    method: 'GET',
  });
}

export async function fetchBilling(id: string, type: number, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(accountResource(id, type), {
    method: 'GET',
  });
}

export async function addShipping(address: ShippingAddressInterface, userId: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`user/shipping-address/${userId}`, {
    method: 'POST',
    body: { address },
  });
}

export async function updateShipping(address: ShippingAddressInterface, userId: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`user/shipping-address/${userId}`, {
    method: 'PATCH',
    body: { address },
  });
}

export async function deleteShipping(id: string, userId: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`user/shipping-address/${id}`, {
    method: 'DELETE',
    params: { userId },
  });
}

export async function addBilling(address: BillingAddressInterface, userId: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`user/billing-address/${userId}`, {
    method: 'POST',
    body: { address },
  });
}

export async function updateBilling(address: BillingAddressInterface, userId: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`user/billing-address/${userId}`, {
    method: 'PATCH',
    body: { address },
  });
}

export async function deleteBilling(id: string, userId: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`user/billing-address/${id}`, {
    method: 'DELETE',
    params: { userId },
  });
}

export async function fetchAccountDetails(id: string, type: number, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(accountResource(id, type), {
    method: 'GET',
  });
}

export async function updateAccountDetails(id: string, account: UserInterface, type: number, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<AccountAdminSettings>(accountResource(id, type), {
    method: 'POST',
    body: account,
  });
}

export async function fetchTransactions(page: number, perPage: number, filters = {}, sort = {}, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<PaginatedTransactionsInterface>(TRANSACTION_RESOURCE, {
    method: 'GET',
    params: {
      page,
      perPage,
      ...filters,
      ...sort,
    },
  });
}

export async function fetchActivityLogs(page: number, perPage: number, filters = {}, sort = {}, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(ACTIVITY_LOGS_RESOURCE, {
    method: 'GET',
    params: {
      page,
      perPage,
      ...filters,
      ...sort,
    },
  });
}
