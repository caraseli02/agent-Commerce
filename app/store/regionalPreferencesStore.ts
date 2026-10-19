import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FormSelectOption } from '~~/types';

export const useRegionalPreferencesStore = defineStore(
  'regional-preferences-store',
  () => {
    const savedCurrency = useCookie<FormSelectOption | null>('demo-currency', { sameSite: 'lax' });
    const currency = ref<FormSelectOption>({
      ...(savedCurrency.value || { label: 'RON', value: 'ron' }),
    });

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
