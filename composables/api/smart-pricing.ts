import { useNuxtApp } from '#app';
import { useAuthStore } from '~/store/authStore';
import { AccountRole } from '~/types';
import { PriceSettingsTypeEnum, type PriceSettingsResponseInterface } from '~/model/prices/price-settings.interface';

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

export async function setNewPriceRange(range: { min: number | null; max: number | null; label: string | null }) {
  const { $apiClient } = useNuxtApp();

  const data = {
    type: PriceSettingsTypeEnum.Range,
    range: {
      min: range.min,
      max: range.max,
    },
    label: range.label,
  };

  return await $apiClient<{ status: string; data: { id: string } }>(`${MAIN}/price-setting`, {
    method: 'POST',
    body: data,
  });
}

export async function setNewQuantityRange(quantity: { values: number[]; label: string | null }) {
  const { $apiClient } = useNuxtApp();

  const data = {
    type: PriceSettingsTypeEnum.Quantity,
    values: quantity.values,
    label: quantity.label,
  };

  return await $apiClient<{ status: string; data: { id: string } }>(`${MAIN}/price-setting`, {
    method: 'POST',
    body: data,
  });
}

export async function setNewMarginRange(margin: { values: number[]; label: string | null }) {
  const { $apiClient } = useNuxtApp();

  const data = {
    type: PriceSettingsTypeEnum.Margins,
    values: margin.values,
    label: margin.label,
  };

  return await $apiClient<{ status: string; data: { id: string } }>(`${MAIN}/price-setting`, {
    method: 'POST',
    body: data,
  });
}

export async function deleteSmartPricingEntity(type: PriceSettingsTypeEnum, id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: string }>(`${MAIN}/price-setting/${id}`, {
    method: 'DELETE',
    body: { type },
  });
}

export async function editPriceRange(data: object, id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<{ status: string; data: { id: string } }>(`${MAIN}/price-setting/${id}`, {
    method: 'PATCH',
    body: data,
  });
}
