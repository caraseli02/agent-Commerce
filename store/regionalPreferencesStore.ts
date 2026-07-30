import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FormSelectOption } from '~~/types';

export const useRegionalPreferencesStore = defineStore(
  'regional-preferences-store',
  () => {
    const currency = ref<FormSelectOption>({
      label: 'Lei',
      value: 'ron',
    });

    const setCurrency = (option: FormSelectOption) => {
      currency.value = option;
    };

    return {
      currency,
      setCurrency,
    };
  },
  { persist: { storage: piniaPluginPersistedstate.localStorage() } }
);
