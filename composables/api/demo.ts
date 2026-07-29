import { useNuxtApp } from '#app';
import type { CartInterface } from '~/types/cart';
import type { PriceSettingsInterface } from '~/model/prices/price-settings.interface';

type DemoResetResponse = {
  status: string;
  data: {
    cart: CartInterface;
    pricing: PriceSettingsInterface[];
  };
};

export async function resetDemoData() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<DemoResetResponse>('/demo/reset', {
    method: 'POST',
  });
}
