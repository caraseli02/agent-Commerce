import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { type PriceSettingsInterface, type SmartPricingOption, PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';
import { smartPricingMargin, smartPricingQuantity, smartPricingRange } from '~/helpers/smart-pricing.helper';
import { fetchPriceSettings } from '~/composables/api/smart-pricing';

export type SmartPricingListItem = SmartPricingOption;

export const usePricingStore = defineStore(
  'pricing-store',
  () => {
    const pricing = ref<PriceSettingsInterface[] | null>(null);
    const range = ref<SmartPricingOption[]>([]);
    const quantity = ref<SmartPricingOption[]>([]);
    const margin = ref<SmartPricingOption[]>([]);

    const setPricing = (nextPricing: PriceSettingsInterface[]) => {
      pricing.value = nextPricing;
    };

    const updateAndReturnPricing = async () => {
      const pricingResponse = await fetchPriceSettings();

      if (!pricingResponse || pricingResponse.status !== 'success') {
        return null;
      }

      pricing.value = pricingResponse.data;
      range.value = smartPricingRange(pricing.value.filter((price) => price.type === PriceSettingsTypeEnum.Range));
      quantity.value = smartPricingQuantity(pricing.value.filter((item) => item.type === PriceSettingsTypeEnum.Quantity));
      margin.value = smartPricingMargin(pricing.value.filter((item) => item.type === PriceSettingsTypeEnum.Margins));
      return pricing.value;
    };

    const emptyPricing = () => {
      pricing.value = null;
    };

    const getPricing = computed(() => pricing.value);

    return {
      pricing,
      range,
      quantity,
      margin,
      setPricing,
      updateAndReturnPricing,
      emptyPricing,
      getPricing,
    };
  },
  { persist: { storage: piniaPluginPersistedstate.localStorage() } },
);
