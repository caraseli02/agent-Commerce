import { useNuxtApp } from '#app';
import type { DetailsResponse } from '~/types/dashboard/client-dashboard';
import { useAuthStore } from '~/store/authStore';
import { AccountType } from '~/types';
import type { AccountAdminSettings } from '~/types/auth/account-settings';
import type { BillingAddressInterface, ShippingAddressInterface } from '~/types/auth/user-interface';

const USER_PATH = '/user';
const DASHBOARD_PATH = '/dashboard';
const CONTROL_PANEL_PATH = '/control-panel';

function getUserDetails() {
  const authStore = useAuthStore();
  return authStore.getUserDetails;
}

export async function updateShipping(address: ShippingAddressInterface[]) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<AccountAdminSettings>(`${USER_PATH}/shipping-address`, {
    method: 'PATCH',
    body: { address },
  });
}

export async function updateBilling(address: BillingAddressInterface[]) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<AccountAdminSettings>(`${USER_PATH}/billing-address`, {
    method: 'PATCH',
    body: { address },
  });
}

export async function updateDetails(payload: object) {
  const { $apiClient } = useNuxtApp();
  const userDetails = getUserDetails();

  return await $apiClient<DetailsResponse>(
    `${DASHBOARD_PATH}${CONTROL_PANEL_PATH}/${userDetails.firebaseId}/${
      userDetails.accountType === AccountType.Personal ? 'personal' : 'organization'
    }`,
    {
      method: 'POST',
      body: payload,
    }
  );
}

export async function updateCardAsDefault(cardId: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string }>(`${USER_PATH}/card/default/${cardId}`, {
    method: 'POST',
  });
}

export async function deleteCard(cardId: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string }>(`${USER_PATH}/card/${cardId}`, {
    method: 'DELETE',
  });
}
