import { defineStore } from 'pinia';
import type { CategoriesMap } from '~/types/dashboard/categories';

export const useCategoriesStore = defineStore({
    id: 'categories-store',
    state: () => {
        return {
            categoriesMap: null as CategoriesMap | null,
        };
    },
    actions: {
        updateCategories(object: CategoriesMap) {
            this.categoriesMap = object;
        },
    },
    getters: {},
    persist: {
        storage: piniaPluginPersistedstate.localStorage(),
    },
});
