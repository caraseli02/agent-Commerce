import { useNuxtApp } from '#app';
import type { ProductAvailabilityResponse } from '~~/types/inventory';

const RESOURCE = '/inventory/availability';

export async function fetchProductAvailability(productIds: readonly string[]) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<ProductAvailabilityResponse>(RESOURCE, {
    method: 'GET',
    query: { ids: productIds.join(',') },
    cache: 'no-store',
  });
}
