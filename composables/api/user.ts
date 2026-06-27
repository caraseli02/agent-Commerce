import { useNuxtApp } from '#app';
import type { PaginatedUserRequest } from '~/model/user/request/PaginatedUserRequest';
import type { ProductResponse } from '~/model/products/response/ProductResponse';
import type { AccountAdminSettings, CardsResponse } from '~/types/auth/account-settings';
import type { ShippingAddressInterface } from '~/types/auth/user-interface';

const RESOURCE = '/user';

export async function fetchPaginatedUser(params: PaginatedUserRequest) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient(`${RESOURCE}`, {
    method: 'GET',
    params,
  });
}

export async function resetPasswordLink(email: string): Promise<ProductResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ProductResponse>(`${RESOURCE}/password/email/reset`, {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(email: string, newPassword: string, code: string): Promise<ProductResponse> {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ProductResponse>(`${RESOURCE}/password/reset`, {
    method: 'POST',
    body: {
      email,
      newPassword,
      code,
    },
  });
}

export async function fetchCustomerCredit(_id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<AccountAdminSettings>(`${RESOURCE}/credit`, {
    method: 'GET',
  });
}

export async function userCards() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<CardsResponse>(`${RESOURCE}/cards`, {
    method: 'GET',
  });
}

export async function addShippingAsCustomer(address: ShippingAddressInterface) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${RESOURCE}/shipping-address/`, {
    method: 'POST',
    body: { address },
  });
}

export async function updateShippingAsCustomer(address: ShippingAddressInterface) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${RESOURCE}/shipping-address/`, {
    method: 'PATCH',
    body: { address },
  });
}

export async function deleteShippingAsCustomer(id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${RESOURCE}/shipping-address/${id}`, {
    method: 'DELETE',
  });
}

export async function addBillingAsCustomer(address: ShippingAddressInterface) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${RESOURCE}/billing-address/`, {
    method: 'POST',
    body: { address },
  });
}

export async function updateBillingAsCustomer(address: ShippingAddressInterface) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${RESOURCE}/billing-address/`, {
    method: 'PATCH',
    body: { address },
  });
}

export async function deleteBillingAsCustomer(id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${RESOURCE}/billing-address/${id}`, {
    method: 'DELETE',
  });
}
