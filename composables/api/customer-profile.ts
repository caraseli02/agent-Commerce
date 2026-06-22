import { useNuxtApp } from '#app';
import type { CustomersProfileInformation } from '~/model/dashboard/customer-information/customer-information';
import type { OrderInterface } from '~/types';

const MAIN_RESOURCE = '/dashboard/profile';

export async function fetchCustomerInformation(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CustomersProfileInformation>(`${MAIN_RESOURCE}/${userID}/customer-information`, {
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

  return await $apiClient<OrderInterface[]>(`${MAIN_RESOURCE}/${userID}/recent-transactions`, {
    method: 'GET',
  });
}