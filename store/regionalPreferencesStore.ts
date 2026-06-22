import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FormSelectOption } from '~~/types';

export const useRegionalPreferencesStore = defineStore(
  'regional-preferences-store',
  () => {
    const language = ref<FormSelectOption>({
      label: 'English',
      value: 'english',
    });

    const currency = ref<FormSelectOption>({
      label: 'Lei',
      value: 'ron',
    });

    const setLanguage = (option: FormSelectOption) => {
      language.value = option;
    };

    const setCurrency = (option: FormSelectOption) => {
      currency.value = option;
    };

    return {
      language,
      currency,
      setLanguage,
      setCurrency,
    };
  },
  { persist: { storage: piniaPluginPersistedstate.localStorage() } }
);
