import { useNuxtApp } from '#app';
import { useAuthStore } from '~/store/authStore';
import { AccountRole } from '~/types';
import type { PriceSettingsResponseInterface } from '~/model/prices/price-settings.interface';

const MAIN = '/prices';

export async function fetchPriceSettings() {
  const { $apiClient } = useNuxtApp();
  const user = useAuthStore().userDetails;

  if (user && user.role === AccountRole.Client) {
    return null;
  }

  return await $apiClient<PriceSettingsResponseInterface>(`${MAIN}/price-settings`, {
    method: 'GET',
  });
}
