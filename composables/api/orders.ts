import { useNuxtApp } from '#app';
import type { $Fetch } from 'ofetch';
import type { OrderStatus, MarkAsPaidRequestInterface, OrderRequestInterface } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

const RESOURCE = '/orders';
const ORDERS_DASHBOARD_RESOURCE = '/dashboard/orders/admin';

function getApiClient(apiClient?: $Fetch) {
  return apiClient ?? useNuxtApp().$apiClient;
}

export async function fetchWidget(type: string, time: number, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`${ORDERS_DASHBOARD_RESOURCE}/${type}`, {
    method: 'GET',
    params: {
      time,
    },
  });
}

export async function fetchOrders(page: number, perPage: number, filters = {}, sort = {}, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(RESOURCE, {
    method: 'GET',
    params: {
      page,
      perPage,
      ...filters,
      ...sort,
    },
  });
}

export async function sendOrder(order: OrderRequestInterface) {
  const $apiClient = getApiClient();

  return await $apiClient<unknown>(`${RESOURCE}/new`, {
    method: 'POST',
    body: order,
  });
}

export async function getOrderById(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`${RESOURCE}/${id}`, {
    method: 'GET',
  });
}

export async function getShippingPricesForOrder(order: unknown) {
  const $apiClient = getApiClient();

  return await $apiClient<unknown>(`${RESOURCE}/price`, {
    method: 'POST',
    body: {
      order,
    },
  });
}

export async function validateAddress(address: ShippingAddressInterface, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<unknown>(`${RESOURCE}/validate-address`, {
    method: 'POST',
    body: address,
  });
}

export async function cancelOrder(id: string) {
  const $apiClient = getApiClient();

  return await $apiClient<unknown>(`${RESOURCE}/${id}/cancel`, {
    method: 'POST',
  });
}

export async function markAsPaid(id: string, payload: MarkAsPaidRequestInterface) {
  const $apiClient = getApiClient();

  return await $apiClient<unknown>(`${RESOURCE}/${id}/paid`, {
    method: 'POST',
    body: payload,
  });
}

export async function changeStatus(id: string, status: OrderStatus) {
  const $apiClient = getApiClient();

  return await $apiClient<unknown>(`${RESOURCE}/${id}`, {
    method: 'POST',
    body: {
      status,
    },
  });
}

export async function retryFailedShippingOrders(id: string) {
  const $apiClient = getApiClient();

  return await $apiClient<unknown>(`${RESOURCE}/${id}/shipping/retry`, {
    method: 'POST',
  });
}
