<template>
    <div v-if="cards.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[480px] h-fit overflow-y-auto">
        <template v-if="!isLoading">
            <OrderSummaryPayByCard
                v-for="item in cards"
                :key="item.id"
                view="modal"
                :card-info="item"
                :card-type="item?.card?.display_brand"
                :is-selected="item.id === selectedCard?.id"
                :is-default="item.default"
                :enable-edit="false"
                :has-card="true"
                :is-expired="item.card.is_expired"
                @select-payment-option="selectNewCard"
                @set-default="setCardAsDefault"
                @delete-card="selectedCardToDelete"
                @edit-card="handleEditCard"
            />
        </template>
        <UiSkeleton v-for="i in 3" v-else :key="i" class="w-[432px] h-[92px]" />
    </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import type { StripeCardInterface } from '~/types';
import { useNuxtApp } from '#app';
import { userCards as fetchUserCards } from '~/composables/api/user';

const card = ref<unknown | null>({});
const cards = ref<StripeCardInterface[]>([]);
const isNewCardSelected = ref<boolean>(false);

const emits = defineEmits(['editCard']);

const selectedCard = ref(cards.value.find((card: StripeCardInterface) => card.default));

const selectNewCard = async (cardInfo: StripeCardInterface) => {
    selectedCard.value = cardInfo;
};

const handleEditCard = (cardInfo: StripeCardInterface) => {
    emits('editCard', cardInfo); // Emit the editCard event up to Payment.vue
};

const setCardAsDefault = async (cardInfo: StripeCardInterface) => {
    cards.value = cards.value.map((card: StripeCardInterface) => {
        return {
            ...card,
            default: card.id === cardInfo.id,
        };
    });
    selectedCard.value = cardInfo;
    const response = (await $api.settingsClient.updateCardAsDefault(cardInfo.id)) as { status: string };
    if (response.status === 'success') {
        // noop
    }
};

const selectedCardToDelete = async (cardInfo: StripeCardInterface) => {
    const response = await $api.settingsClient.deleteCard(cardInfo.id);
    if (response.status === 'success') {
        cards.value = cards.value.filter((card: StripeCardInterface) => card.id !== cardInfo.id);
    }
};

const { $api } = useNuxtApp();
const isLoading = ref(false);
const fetchCards = async () => {
    isLoading.value = true;
    const response = (await fetchUserCards()) as unknown as {
        status: string;
        data: StripeCardInterface[];
    };

    if (response.status === 'success') {
        if (response.data.length) {
            cards.value = response.data;
            card.value = _.cloneDeep(cards.value.find((card: StripeCardInterface) => card.default));
        } else {
            isNewCardSelected.value = true;
        }
    }
    isLoading.value = false;
};

await fetchCards();
</script>

<style scoped></style>
