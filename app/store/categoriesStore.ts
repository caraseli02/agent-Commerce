import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CategoriesMap } from '~~/types/dashboard/categories';

export const useCategoriesStore = defineStore(
  'categories-store',
  () => {
    const categoriesMap = ref<CategoriesMap | null>(null);

    const updateCategories = (object: CategoriesMap) => {
      categoriesMap.value = object;
    };

    return {
      categoriesMap,
      updateCategories,
    };
  },
  { persist: { storage: piniaPluginPersistedstate.localStorage() } },
);
