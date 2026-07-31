import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Buyer-path UI coordination (account/cart modals) without a global event bus.
 */
export const useUiStore = defineStore('ui', () => {
  const accountModalRequestId = ref(0);
  const cartModalRequestId = ref(0);

  const requestOpenAccountModal = () => {
    accountModalRequestId.value += 1;
  };

  const requestOpenCartModal = () => {
    cartModalRequestId.value += 1;
  };

  return {
    accountModalRequestId,
    cartModalRequestId,
    requestOpenAccountModal,
    requestOpenCartModal,
  };
});
