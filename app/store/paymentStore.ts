import { defineStore } from 'pinia';

export const usePaymentStore = defineStore('payment', () => {
  const showCardsModal = ref(false);
  function toggleCardModal() {
    showCardsModal.value = !showCardsModal.value;
  }

  return { showCardsModal, toggleCardModal };
});
