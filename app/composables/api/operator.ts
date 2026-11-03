import { useNuxtApp } from '#app';
import type { OperatorInventoryResponse, OperatorMeResponse } from '~~/types/inventory';

const ME_RESOURCE = '/operator/me';
const INVENTORY_RESOURCE = '/operator/inventory';

export async function fetchOperatorMe() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<OperatorMeResponse>(ME_RESOURCE, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchOperatorInventory() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<OperatorInventoryResponse>(INVENTORY_RESOURCE, {
    method: 'GET',
    cache: 'no-store',
  });
}
