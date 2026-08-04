import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Buyer-path UI coordination without a global event bus.
 * Account modal opens via requestOpenAccountModal(); header badge and cart panel read cartStore directly.
 */
export const useUiStore = defineStore('ui', () => {
  const accountModalRequestId = ref(0);

  const requestOpenAccountModal = () => {
    accountModalRequestId.value += 1;
  };

  return {
    accountModalRequestId,
    requestOpenAccountModal,
  };
});
