<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-row justify-between items-center">
      <span class="text-neutral-700 text-sm font-medium leading-6">Select Payment</span>
      <button v-if="paymentManagementVisible" data-testid="payment-management" class="group">
        <SettingCog class="text-slate-500 group-hover:text-blue-500 transition duration-300" />
      </button>
    </div>
    <div class="flex flex-col gap-4 relative">
      <OrderSummaryNewCard
        v-if="isNewCardSelected"
        :is-selected="order?.paymentDetails?.type === PaymentTypeEnum.Card && !order?.paymentDetails?.card"
        @click="selectPaymentOption({ type: PaymentTypeEnum.Card, info: null })"
      >
        <UiButton
          v-if="cards.length > 0 && paymentManagementVisible"
          size="xs"
          variant="link"
          class="flex gap-2 items-center justify-end hover:underline pt-4"
          @click="paymentStore.toggleCardModal()"
        >
          <SvgoChangeCard />
          <span class="text-neutral-700 text-sm font-normal leading-6">Change</span>
        </UiButton>
      </OrderSummaryNewCard>
      <template v-else>
        <OrderSummaryPayByCard
          v-if="card && card.card?.brand && !isNewCardSelected && availablePaymentMethods.includes(PaymentTypeEnum.Card)"
          view="payment"
          :cards="true"
          :card-info="card"
          :card-type="card.card.brand"
          :is-selected="order?.paymentDetails?.type === PaymentTypeEnum.Card && order?.paymentDetails?.card?.id === card.id"
          :has-card="true"
          :is-expired="cardExpired(card)"
          :is-default="card.default"
          :enable-edit="paymentManagementVisible"
          show-pay-with-label
          @select-payment-option="selectPaymentOption({ type: PaymentTypeEnum.Card, info: $event })"
        />
        <OrderSummaryPayByCard
          v-else-if="card && isNewCardSelected && availablePaymentMethods.includes(PaymentTypeEnum.Card)"
          view="payment"
          :cards="true"
          :is-new-card-selected="isNewCardSelected"
          :is-selected="order?.paymentDetails?.type === PaymentTypeEnum.Card && !order?.paymentDetails?.card"
          show-pay-with-label
          @select-payment-option="selectPaymentOption({ type: PaymentTypeEnum.Card, info: null })"
        />
        <OrderSummaryPayByCard
          v-else-if="!card && availablePaymentMethods.includes(PaymentTypeEnum.Card)"
          :enable-edit="paymentManagementVisible"
          view="payment"
          :cards="false"
          :is-new-card-selected="false"
          :is-selected="order?.paymentDetails?.type === PaymentTypeEnum.Card && !order?.paymentDetails?.card"
          @select-payment-option="selectPaymentOption({ type: PaymentTypeEnum.Card, info: null })"
        />
      </template>
      <button
        v-if="availablePaymentMethods.includes(PaymentTypeEnum.Bank)"
        class="p-3 flex flex-col gap-3 border rounded-lg hover:bg-[#007FFF0D] hover:border-blue-500 transition duration-300 group"
        :class="order.paymentDetails?.type === 3 ? 'border-blue-500 bg-[#007FFF0D]' : 'border-grey-300 bg-white'"
        @click="selectPaymentOption({ type: PaymentTypeEnum.Bank })"
      >
        <div class="flex flex-row justify-between w-full">
          <RadioButtonChecked
            v-if="order.paymentDetails?.type === 3"
            class="w-5 h-5 my-[3px] text-blue-500 group-hover:text-blue-500 transition duration-300"
          />
          <RadioButton v-else class="w-5 h-5 my-[3px] text-grey-300 group-hover:text-slate-500 transition duration-300" />
          <BankIcon />
        </div>
        <div>
          <span class="text-neutral-700 text-sm font-normal leading-6">Bank Transfer</span>
        </div>
      </button>
      <button
        v-if="availablePaymentMethods.includes(PaymentTypeEnum.Credit)"
        data-testid="credit-payment-option"
        class="p-3 flex flex-col gap-3 border rounded-lg hover:bg-[#007FFF0D] hover:border-blue-500 transition duration-300 group"
        :class="order.paymentDetails?.type === 1 ? 'border-blue-500 bg-[#007FFF0D]' : 'border-grey-300 bg-white'"
        :disabled="creditUnavailableReason !== null"
        @click="selectPaymentOption({ type: PaymentTypeEnum.Credit })"
      >
        <div class="flex flex-row justify-between w-full">
          <RadioButtonChecked
            v-if="order.paymentDetails?.type === 1"
            class="w-5 h-5 my-[3px] text-blue-500 group-hover:text-blue-500 transition duration-300"
          />
          <RadioButton v-else class="w-5 h-5 my-[3px] text-grey-300 group-hover:text-slate-500 transition duration-300" />
          <PieChart />
        </div>
        <div class="flex flex-row justify-between w-full">
          <span class="text-neutral-700 text-sm font-normal leading-6">Pay from credit</span>
          <div class="flex flex-row gap-2">
            <span class="text-neutral-700 text-sm font-normal leading-6">Available:</span>
            <button @click="showCreditInfoModal = true">
              <span class="text-blue-500 text-sm font-semibold leading-6">{{ accountCredit?.available?.toFixed(2) || 0 }}</span>
            </button>
          </div>
        </div>
        <p v-if="creditUnavailableReason" class="text-left text-xs leading-5 text-slate-500" data-testid="credit-unavailable-reason">
          {{ creditUnavailableReason }}
        </p>
      </button>
      <Transition name="fade-bottom">
        <div v-if="showCreditInfoModal" v-click-outside="() => (showCreditInfoModal = false)" class="absolute bottom-[160px] right-0">
          <OrderSummaryCreditInfoModal :account-credit="accountCredit" />
        </div>
      </Transition>
      <button
        v-if="availablePaymentMethods.includes(PaymentTypeEnum.Cash)"
        class="p-3 flex flex-col gap-3 border rounded-lg hover:bg-[#007FFF0D] hover:border-blue-500 transition duration-300 group"
        :class="order.paymentDetails?.type === 2 ? 'border-blue-500 bg-[#007FFF0D]' : 'border-grey-300 bg-white'"
        @click="selectPaymentOption({ type: PaymentTypeEnum.Cash })"
      >
        <div class="flex flex-row justify-between w-full">
          <RadioButtonChecked
            v-if="order.paymentDetails?.type === 2"
            class="w-5 h-5 my-[3px] text-blue-500 group-hover:text-blue-500 transition duration-300"
          />
          <RadioButton v-else class="w-5 h-5 my-[3px] text-grey-300 group-hover:text-slate-500 transition duration-300" />
          <MoneyIcon />
        </div>
        <div>
          <span class="text-neutral-700 text-sm font-normal leading-6">Cash on delivery</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRuntimeConfig } from '#app';
import SettingCog from '@/assets/icons/setting-cog.svg';
import RadioButton from '@/assets/icons/radio-button.svg';
import RadioButtonChecked from '@/assets/icons/radio-button-checked.svg';
import BankIcon from '@/assets/icons/bank.svg';
import PieChart from '@/assets/icons/pie-chart.svg';
import MoneyIcon from '@/assets/icons/money.svg';
import { PaymentTypeEnum, type CheckoutOrderDraft, type PaymentDetails, type StripeCardInterface } from '~/types';
import { isPaymentManagementVisible } from '~/helpers/mock-integration';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import { resolveCreditUnavailableReason } from '~/helpers/checkout-credit';
import { useAuthStore } from '~/store/authStore';
import { usePaymentStore } from '~/store/paymentStore';
import { usePaymentCards } from '~/composables/usePaymentCards';

const paymentStore = usePaymentStore();
const config = useRuntimeConfig();
const paymentManagementVisible = isPaymentManagementVisible(Boolean(config.public.MOCK_MODE));

const { card, cards, isNewCardSelected } = usePaymentCards();

const props = defineProps<{
  order: CheckoutOrderDraft;
  accountCredit: CustomerCreditInterface;
}>();

const emits = defineEmits(['update-payment-details', 'change-is-new-card-selected']);
const showCreditInfoModal = ref(false);
const payment = ref<PaymentDetails>({} as PaymentDetails);

const authStore = useAuthStore();

const { getGeneralSettings } = storeToRefs(authStore);
const availablePaymentMethods = ref<PaymentTypeEnum[]>([]);
const creditUnavailableReason = computed(() => resolveCreditUnavailableReason(props.accountCredit, Number(props.order.total || 0)));

const paymentMethods = () => {
  getGeneralSettings.value?.orderSettings?.paymentMethods.forEach((method) => {
    availablePaymentMethods.value.push(method.type);
  });
};

paymentMethods();

function selectPaymentOption(option: { type: PaymentTypeEnum; info?: StripeCardInterface | null }) {
  payment.value = {} as PaymentDetails;

  if (props.order.paymentDetails) {
    payment.value.type = option.type;

    if (option.type === PaymentTypeEnum.Card) {
      payment.value.card = option.info ?? null;
    }
    emits('update-payment-details', payment.value);
  }
}

function cardExpired(savedCard: StripeCardInterface) {
  const expDate = new Date(savedCard.card.exp_year, savedCard.card.exp_month - 1);
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth());
  return expDate < currentMonth;
}
</script>
