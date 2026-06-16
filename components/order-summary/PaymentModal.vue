<template>
  <section
    class="flex flex-col items-center justify-between min-h-screen w-full shadow-xs bg-white max-w-[358px] md:max-w-[400px] px-4 md:px-6 py-0 rounded-l-xl h-full overflow-hidden scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-700 scrollbar-track-slate-300"
  >
    <div class="sticky top-0 justify-between items-start self-stretch flex gap-5 bg-white z-10 min-h-16 pt-6">
      <div class="text-zinc-800 text-base font-semibold leading-7 my-auto">
        Payment Method
      </div>
      <button
        class="justify-center items-center bg-zinc-100 self-stretch flex aspect-square flex-col w-8 h-8 px-1 rounded-lg"
        @click="
          paymentStore.toggleCardModal();
          exitCardModal(true);
        "
      >
        <SvgoX class="aspect-square object-contain object-center w-full justify-center items-center overflow-hidden" />
      </button>
    </div>
    <div class="flex flex-col gap-3 h-full overflow-y-auto relative">
      <OrderSummaryNewCard
        class="mt-8 sticky top-0 bg-white"
        :is-selected="isNewCardSelected"
        @click="isNewCardSelected = true"
        @select-payment-option="selectPaymentOption({ type: PaymentTypeEnum.Card, info: null })"
      />
      <h4
        v-if="cards.length > 1"
        class="text-zinc-800 text-sm font-medium leading-6 self-stretch mt-2"
      >
        Saved cards
      </h4>
      <div
        v-for="savedCard in cards"
        :key="savedCard.id"
        class="pt-4"
      >
        <OrderSummaryPayByCard
          view="payment"
          :cards="true"
          :card-info="savedCard"
          :card-type="savedCard.card?.brand ?? savedCard.card?.display_brand"
          :is-selected="
            !isNewCardSelected
              && (payment.card?.id ? payment.card.id === savedCard.id : order.paymentDetails?.card?.id === savedCard.id)
          "
          :has-card="true"
          :is-expired="cardExpired(savedCard)"
          @click="isNewCardSelected = false"
          @select-payment-option="selectPaymentOption({ type: PaymentTypeEnum.Card, info: savedCard })"
          @set-default="setCardAsDefault"
        />
      </div>
    </div>
    <div class="sticky bottom-0 flex flex-col justify-center items-center w-full justify-self-end bg-white z-10 pb-6">
      <div class="items-stretch self-center flex gap-3 mt-10">
        <svg
          width="41"
          height="40"
          viewBox="0 0 41 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M9.38747 7.85107L17.7847 3.94024C19.5224 3.13092 21.506 3.13092 23.2437 3.94024L31.6076 7.83556C34.0534 8.97466 35.6589 11.5348 35.4875 14.3338C34.8302 25.0698 31.9011 29.9231 23.9831 35.5537C21.8935 37.0396 19.1371 37.036 17.046 35.5524C9.15234 29.9524 6.11452 25.1667 5.51028 14.2961C5.35572 11.5156 6.95858 8.98228 9.38747 7.85107ZM26.4407 17.4897C26.8953 16.9702 26.8426 16.1805 26.3231 15.7259C25.8035 15.2713 25.0138 15.3239 24.5592 15.8435L19.776 21.31C19.6292 21.4778 19.3763 21.5002 19.2022 21.3609L16.2808 19.0239C15.7417 18.5926 14.9551 18.68 14.5239 19.2191C14.0926 19.7581 14.18 20.5448 14.7191 20.976L17.6404 23.3131C18.8593 24.2882 20.6297 24.1309 21.6575 22.9562L26.4407 17.4897Z"
            fill="#00C088"
          />
        </svg>
        <div class="text-zinc-800 text-sm leading-6 self-center grow whitespace-nowrap my-auto">
          Secure credit card payment
        </div>
      </div>
      <button
        class="justify-center items-center self-stretch bg-blue-500 flex w-full flex-col mt-4 px-16 py-2 h-11 rounded-lg"
        @click="
          paymentStore.toggleCardModal();
          exitCardModal(false);
        "
      >
        <span class="flex items-center gap-2">
          <div class="text-white text-base font-medium leading-7 grow whitespace-nowrap">Continue</div>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 8L18 12M18 12L14 16M18 12L6 12"
              stroke="white"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import moment from 'moment';
import { ref } from 'vue';
import { useNuxtApp } from '#app';
import { usePaymentStore } from '~/store/paymentStore';
import { PaymentTypeEnum, type CheckoutOrderDraft, type PaymentDetails, type StripeCardInterface } from '~/types';
import { usePaymentCards } from '~/composables/usePaymentCards';

const paymentStore = usePaymentStore();

const { card, cards, isNewCardSelected } = usePaymentCards();

const props = defineProps<{
  order: CheckoutOrderDraft;
}>();

const emits = defineEmits(['change-is-new-card-selected']);
const payment = ref<PaymentDetails>({} as PaymentDetails);

function selectPaymentOption(option: { type: PaymentTypeEnum; info?: StripeCardInterface | null }) {
  if (props.order.paymentDetails) {
    payment.value.type = option.type;

    if (option.type === PaymentTypeEnum.Card) {
      payment.value.card = option.info ?? null;
    }
  }
}

function exitCardModal(cancelled: boolean) {
  if (!cancelled) {
    // eslint-disable-next-line vue/no-mutating-props
    props.order.paymentDetails = payment.value;
    if (payment.value.card && card.value) {
      card.value.billing_details = payment.value.card.billing_details;
      card.value.card = payment.value.card.card;
      card.value.id = payment.value.card.id;
      card.value.customer = payment.value.card.customer;
      card.value.default = payment.value.card.default ?? false;
      emits('change-is-new-card-selected', false);
    }
    else {
      emits('change-is-new-card-selected', true);
    }
  }
}

function cardExpired(savedCard: StripeCardInterface) {
  const expDate = moment([savedCard.card.exp_year, savedCard.card.exp_month]);
  const now = moment([Number(moment().format('y')), Number(moment().format('M'))]);
  return expDate.diff(now, 'months') < 0;
}

const { $api } = useNuxtApp();
const setCardAsDefault = async (cardInfo: StripeCardInterface) => {
  cards.value = cards.value.map((savedCard) => {
    return {
      ...savedCard,
      default: savedCard.id === cardInfo.id,
    };
  });
  const response = (await $api.settingsClient.updateCardAsDefault(cardInfo.id)) as { status: string };
  if (response.status === 'success') {
    selectPaymentOption({ type: PaymentTypeEnum.Card, info: cardInfo });
  }
};
</script>

<style scoped></style>
