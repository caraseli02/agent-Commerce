import { useNuxtApp } from '#app';
import type {
  ActiveOrdersResponse,
  FavoritesResponse,
  MonthHotSaleResponse,
  RecentlyBoughtResponse,
  TotalOrdersResponse,
  TotalReturnsResponse,
  ViewHistoryResponse,
} from '~~/types/dashboard/client-dashboard';
import type { UserDetailsResponse } from '~~/types';

const MAIN_RESOURCE = '/dashboard/client';
const ORDERS_RESOURCE = '/dashboard/client/orders';

export async function fetchCustomerActiveOrders() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ActiveOrdersResponse>(`${MAIN_RESOURCE}/general/active-orders`, {
    method: 'GET',
  });
}

export async function fetchFavorites() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<FavoritesResponse>(`${ORDERS_RESOURCE}/favourites`, {
    method: 'GET',
  });
}

export async function fetchTotalOrders() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<TotalOrdersResponse>(`${ORDERS_RESOURCE}/total-orders`, {
    method: 'GET',
  });
}

export async function fetchReturns() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<TotalReturnsResponse>(`${ORDERS_RESOURCE}/returns`, {
    method: 'GET',
  });
}

export async function fetchCustomerAccountInformation() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<UserDetailsResponse>(`${ORDERS_RESOURCE}/account-information`, {
    method: 'GET',
  });
}

export async function fetchRecentlyBought() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<RecentlyBoughtResponse>(`${ORDERS_RESOURCE}/recently-bought`, {
    method: 'GET',
  });
}

export async function fetchViewHistory() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ViewHistoryResponse>(`${MAIN_RESOURCE}/general/product-history`, {
    method: 'GET',
  });
}

export async function fetchMonthHotSale() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<MonthHotSaleResponse>(`${MAIN_RESOURCE}/general/month-hot-sale`, {
    method: 'GET',
  });
}

export async function getMetadata() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<unknown>(`${MAIN_RESOURCE}/metadata`, {
    method: 'GET',
  });
}
