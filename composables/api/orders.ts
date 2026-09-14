import { useNuxtApp } from '#app';
import type { $Fetch } from 'ofetch';
import type { OrderStatus, MarkAsPaidRequestInterface, OrderRequestInterface, OrderRequestInterfaceResponse } from '~/types';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';
import type { PaginatedOrdersResponse, WidgetApiType, WidgetResponse } from '~/types/dashboard/admin-orders';
import type { PlaceOrderInterface } from '~/types/order';

const RESOURCE = '/orders';
const ORDERS_DASHBOARD_RESOURCE = '/dashboard/orders/admin';

const pendingCheckoutRequestIds = new Map<string, string>();

function getApiClient(apiClient?: $Fetch) {
  return apiClient ?? useNuxtApp().$apiClient;
}

const createCheckoutRequestId = () => globalThis.crypto?.randomUUID?.() ?? `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const buildCheckoutIntentKey = (order: OrderRequestInterface) =>
  JSON.stringify({
    cartId: order.cartId,
    reviewedCartRevision: order.reviewedCartRevision,
    reviewedQuoteFingerprint: order.reviewedQuoteFingerprint,
    products: (order.products || []).map((product) => ({
      id: product.id,
      stock: product.stock,
      backorderStock: product.backorder_stock,
    })),
    shippingDetails: order.shippingDetails,
    paymentType: order.paymentDetails?.type,
    stripeCardId: order.stripeCardId,
    shippingCost: order.shippingCost,
    type: order.type,
    notes: order.notes,
  });

export async function fetchWidget(type: WidgetApiType, time: number, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<WidgetResponse>(`${ORDERS_DASHBOARD_RESOURCE}/${type}`, {
    method: 'GET',
    params: {
      time,
    },
  });
}

export async function fetchOrders(page: number, perPage: number, filters = {}, sort = {}, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<PaginatedOrdersResponse>(RESOURCE, {
    method: 'GET',
    params: {
      page,
      perPage,
      ...filters,
      ...sort,
    },
  });
}

export async function sendOrder(order: OrderRequestInterface, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);
  const intentKey = buildCheckoutIntentKey(order);
  const checkoutRequestId = pendingCheckoutRequestIds.get(intentKey) ?? createCheckoutRequestId();

  pendingCheckoutRequestIds.set(intentKey, checkoutRequestId);

  const response = await $apiClient<PlaceOrderInterface>(`${RESOURCE}/new`, {
    method: 'POST',
    body: {
      ...order,
      checkoutRequestId,
    },
  });

  if (response.status === 'success') {
    pendingCheckoutRequestIds.delete(intentKey);
  }

  return response;
}

export async function getOrderById(id: string, apiClient?: $Fetch) {
  const $apiClient = getApiClient(apiClient);

  return await $apiClient<OrderRequestInterfaceResponse>(`${RESOURCE}/${id}`, {
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

export type OrderStatusChangeResponse = OrderRequestInterfaceResponse & {
  description?: string;
};

export async function changeStatus(id: string, status: OrderStatus) {
  const $apiClient = getApiClient();

  return await $apiClient<OrderStatusChangeResponse>(`${RESOURCE}/${id}`, {
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
