import { useNuxtApp } from '#app';
import type { CustomerInformationResponse, CustomerRecentTransactionsResponse } from '~/types/dashboard/customer-profile';

const MAIN_RESOURCE = '/dashboard/profile';

export async function fetchCustomerInformation(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CustomerInformationResponse>(`${MAIN_RESOURCE}/${userID}/customer-information`, {
    method: 'GET',
  });
}

export async function fetchCustomerLastOrder(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<unknown>(`${MAIN_RESOURCE}/${userID}/last-order`, {
    method: 'GET',
  });
}

export async function fetchCustomerTotalSpent(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<unknown>(`${MAIN_RESOURCE}/${userID}/total-spent`, {
    method: 'GET',
  });
}

export async function fetchCustomerAvgOrderValue(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<unknown>(`${MAIN_RESOURCE}/${userID}/average-order`, {
    method: 'GET',
  });
}

export async function fetchCustomerAbandonedCheckout(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<unknown>(`${MAIN_RESOURCE}/${userID}/abandoned-checkout`, {
    method: 'GET',
  });
}

export async function fetchCustomerShippingInformation(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<unknown>(`${MAIN_RESOURCE}/${userID}/shipping-information`, {
    method: 'GET',
  });
}

export async function fetchCustomerRecentTransactions(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CustomerRecentTransactionsResponse>(`${MAIN_RESOURCE}/${userID}/recent-transactions`, {
    method: 'GET',
  });
}
