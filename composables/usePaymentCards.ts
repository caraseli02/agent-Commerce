// ~/composables/usePaymentCards.ts
import { ref, watch } from 'vue';
import _ from 'lodash';
import { useUser } from './useUser';
import { userCards as fetchUserCards } from '~/composables/api/user';
import type { StripeCardInterface } from '~/types';

const card = ref<StripeCardInterface | null>(null);
const cards = ref<StripeCardInterface[]>([]);
const isNewCardSelected = ref<boolean>(false);

export function usePaymentCards() {
  const { user } = useUser();

  const fetchCards = async () => {
    const response = (await fetchUserCards()) as {
      status: string;
      data: StripeCardInterface[];
    };

    if (response.status === 'success') {
      if (response.data.length) {
        cards.value = response.data;
        card.value = _.cloneDeep(cards.value.find(savedCard => savedCard.default) ?? null);
        isNewCardSelected.value = false;
      }
      else {
        isNewCardSelected.value = true;
      }
    }
  };

  watch(
    card,
    (nextCard) => {
      card.value = nextCard;
    },
    { deep: true },
  );

  watch(
    user,
    (newUser) => {
      if (!newUser) {
        cards.value = [];
        card.value = null;
        isNewCardSelected.value = false;
      }
    },
    { immediate: true },
  );

  return {
    card,
    cards,
    isNewCardSelected,
    fetchCards,
  };
}
