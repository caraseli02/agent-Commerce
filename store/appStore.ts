import { defineStore } from 'pinia';

export const useAppStore = defineStore(
  'appSettings',
  () => {
    const showAppInBeta = ref(true);

    return { showAppInBeta };
  },
  { persist: true }
);
