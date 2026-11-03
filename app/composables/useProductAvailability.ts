import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { fetchProductAvailability } from '~/composables/api/inventory';

/** `unavailable`: Inventory has no trustworthy count for this product. */
export type ProductAvailabilityStatus = 'loading' | 'ready' | 'unavailable' | 'error';

// Immediate stock for one product, read from Inventory in the browser only, so neither SSR HTML
// nor cached product payloads carry a unit count. Call `refresh` on entry and after cart changes.
export function useProductAvailability(productId: MaybeRefOrGetter<string>) {
  const status = ref<ProductAvailabilityStatus>('loading');
  const available = ref<number | null>(null);
  let latestRequest = 0;

  const refresh = async () => {
    const id = toValue(productId);
    const request = ++latestRequest;
    status.value = 'loading';
    available.value = null;

    try {
      const response = await fetchProductAvailability([id]);
      if (request !== latestRequest) return;
      const entry = response?.data?.find((item) => item.productId === id);
      if (entry?.state === 'available') {
        available.value = entry.available;
        status.value = 'ready';
      } else {
        status.value = 'unavailable';
      }
    } catch {
      if (request === latestRequest) status.value = 'error';
    }
  };

  return { status, available, refresh };
}
