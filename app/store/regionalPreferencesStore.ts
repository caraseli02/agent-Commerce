import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FormSelectOption } from '~~/types';

const currencyOptions: FormSelectOption[] = [
  { label: 'Lei', value: 'ron' },
  { label: 'EURO', value: 'euro' },
  { label: 'USD', value: 'usd' },
];

export const useRegionalPreferencesStore = defineStore(
  'regional-preferences-store',
  () => {
    const savedCurrency = useCookie<FormSelectOption | null>('demo-currency', { sameSite: 'lax' });
    const savedValue = savedCurrency.value?.value;
    const currency = ref<FormSelectOption>(currencyOptions.find((option) => option.value === savedValue) ?? currencyOptions[0]!);

    watch(
      currency,
      (option) => {
        savedCurrency.value = option;
      },
      { deep: true },
    );

    const setCurrency = (option: FormSelectOption) => {
      currency.value = option;
    };

    return {
      currency,
      setCurrency,
    };
  },
  { persist: { storage: piniaPluginPersistedstate.localStorage() } },
);
