import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { type PriceSettingsInterface, type SmartPricingOption, PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';
import { smartPricingMargin, smartPricingQuantity, smartPricingRange } from '~/helpers/smart-pricing.helper';
import { fetchPriceSettings } from '~/composables/api/smart-pricing';

export type SmartPricingListItem = SmartPricingOption;

export const usePricingStore = defineStore('pricing-store', () => {
  const pricing = ref<PriceSettingsInterface[] | null>(null);
  const range = ref<SmartPricingOption[]>([]);
  const quantity = ref<SmartPricingOption[]>([]);
  const margin = ref<SmartPricingOption[]>([]);
  const showEntryModal = ref(false);
  const showMarginModal = ref(false);
  const showQuantityModal = ref(false);
  const editEntryPriceModal = ref<PriceSettingsInterface | null>(null);
  const editQuantityModal = ref<SmartPricingOption | null>(null);
  const editMarginModal = ref<SmartPricingOption | null>(null);
  const type = ref<'add' | 'edit'>('add');

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

  const addPriceRange = (nextRange: { min: number | null; max: number | null }, label: string | null, _id: string) => {
    range.value.push({ value: [`$${nextRange.min} - $${nextRange.max}`], label: label ?? '', selected: false, _id });
  };

  const addQuantityRange = (nextQuantity: { values: string[]; label: string }, _id: string) => {
    quantity.value.push({ value: nextQuantity.values, label: nextQuantity.label, selected: false, _id });
  };

  const addMarginRange = (nextMargin: { values: string[]; label: string | null }, _id: string) => {
    margin.value.push({ value: nextMargin.values, label: nextMargin.label ?? '', selected: false, _id });
  };

  const removePriceRange = (_id: string) => {
    range.value = range.value.filter((nextRange) => nextRange._id !== _id);
  };

  const removeQuantityRange = (_id: string) => {
    quantity.value = quantity.value.filter((nextQuantity) => nextQuantity._id !== _id);
  };

  const removeMarginRange = (_id: string) => {
    margin.value = margin.value.filter((nextMargin) => nextMargin._id !== _id);
  };

  const editPriceRange = (nextRange: { min: number | null; max: number | null }, label: string | null, _id: string) => {
    range.value = range.value.map((r) => {
      if (r._id === _id) {
        return {
          ...r,
          value: [`$${nextRange.min} - $${nextRange.max}`],
          label: label ?? r.label,
        };
      }
      return r;
    });
  };

  const getPricing = computed(() => pricing.value);

  return {
    pricing,
    range,
    quantity,
    margin,
    showEntryModal,
    showMarginModal,
    showQuantityModal,
    editEntryPriceModal,
    editQuantityModal,
    editMarginModal,
    type,
    setPricing,
    updateAndReturnPricing,
    emptyPricing,
    addPriceRange,
    addQuantityRange,
    addMarginRange,
    removePriceRange,
    removeQuantityRange,
    removeMarginRange,
    editPriceRange,
    getPricing,
  };
}, { persist: { storage: piniaPluginPersistedstate.localStorage() } });
