import { useNuxtApp } from '#app';
import type {
  CustomersByCountryInterface,
  NewCustomersInterface,
  PaginatedCustomersInterface,
  ReturningCustomersInterface,
  TotalCustomersInterface,
} from '~/model/dashboard/response/CustomerInterfaceResponse';

const USER_RESOURCE = '/user';
const DASHBOARD_USERS_RESOURCE = '/dashboard/users';

interface ApiStatusResponse {
  status: string;
  data?: unknown;
}

export async function fetchCustomersList(page: number, perPage: number, filters = {}, sort = {}) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<PaginatedCustomersInterface>(USER_RESOURCE, {
    method: 'GET',
    params: {
      page,
      perPage,
      ...filters,
      ...sort,
    },
  });
}

export async function fetchTotalCustomersWidget(time = 7) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<TotalCustomersInterface>(`${DASHBOARD_USERS_RESOURCE}/total-customers`, {
    method: 'GET',
    params: {
      time,
    },
  });
}

export async function fetchReturningCustomersWidget(time = 7) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ReturningCustomersInterface>(`${DASHBOARD_USERS_RESOURCE}/returning-customers`, {
    method: 'GET',
    params: {
      time,
    },
  });
}

export async function fetchNewCustomersWidget() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<NewCustomersInterface>(`${DASHBOARD_USERS_RESOURCE}/new-customers`, {
    method: 'GET',
  });
}

export async function fetchCustomersByCountryWidget() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CustomersByCountryInterface>(`${DASHBOARD_USERS_RESOURCE}/customers-top-country`, {
    method: 'GET',
  });
}

export async function deactivateUser(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ApiStatusResponse>(`${USER_RESOURCE}/deactivate/${userID}`, {
    method: 'DELETE',
  });
}

export async function activateUser(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ApiStatusResponse>(`${USER_RESOURCE}/activate/${userID}`, {
    method: 'POST',
  });
}

export async function deleteUser(userID: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ApiStatusResponse>(`${USER_RESOURCE}/${userID}`, {
    method: 'DELETE',
  });
}
