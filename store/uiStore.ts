import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Buyer-path UI coordination (account modal) without a global event bus.
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
