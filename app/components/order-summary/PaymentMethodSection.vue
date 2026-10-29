<template>
  <div class="flex flex-col gap-6">
    <div
      v-if="requiresPaymentReselection"
      role="alert"
      class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900"
    >
      Your selected payment method is no longer available. Choose a card to continue.
    </div>
    <div class="flex flex-row justify-between items-center">
      <span class="text-foreground text-sm font-medium leading-6">Select Payment</span>
      <UiButton
        v-if="paymentManagementVisible"
        type="button"
        data-testid="payment-management"
        aria-label="Manage payment methods"
        variant="ghost"
        size="icon"
        class="group"
      >
        <SettingCog class="text-muted-foreground group-hover:text-blue-500 transition duration-300" />
      </UiButton>
    </div>
    <div class="flex flex-col gap-4 relative">
      <OrderSummaryNewCard
        :is-selected="order?.paymentDetails?.type === PaymentTypeEnum.Card && !order?.paymentDetails?.card"
        @click="selectPaymentOption({ type: PaymentTypeEnum.Card, info: null })"
      >
        <UiButton
          v-if="cards.length > 0 && paymentManagementVisible"
          type="button"
          size="xs"
          variant="link"
          class="flex items-center justify-end mt-4"
          @click.stop="paymentStore.toggleCardModal()"
        >
          <SvgoChangeCard />
          <span class="text-foreground text-sm font-normal leading-6">Change</span>
        </UiButton>
      </OrderSummaryNewCard>
      <OrderSummaryPayByCard
        v-if="card && card.card?.brand"
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
      <UiButton
        type="button"
        disabled
        :aria-label="`Bank Transfer — ${unavailablePaymentMethodMessage}`"
        variant="option"
        size="card"
        class="flex-col whitespace-normal group cursor-not-allowed"
      >
        <div class="flex w-full flex-col gap-3">
          <div class="flex flex-row justify-between w-full">
            <RadioButton class="w-5 h-5 my-[3px] text-grey-300 transition duration-300" />
            <BankIcon />
          </div>
          <div>
            <span class="text-foreground text-sm font-normal leading-6">Bank Transfer</span>
          </div>
          <p class="text-left text-xs leading-5 text-muted-foreground">{{ unavailablePaymentMethodMessage }}</p>
        </div>
      </UiButton>
      <div class="flex flex-col gap-2">
        <UiButton
          type="button"
          data-testid="credit-payment-option"
          variant="option"
          size="card"
          class="flex-col whitespace-normal group cursor-not-allowed"
          :disabled="true"
          :aria-label="`Pay from credit — ${unavailablePaymentMethodMessage}`"
        >
          <div class="flex w-full flex-col gap-3">
            <div class="flex flex-row justify-between w-full">
              <RadioButton class="w-5 h-5 my-[3px] text-grey-300 transition duration-300" />
              <PieChart />
            </div>
            <div class="flex flex-row justify-between w-full">
              <span class="text-foreground text-sm font-normal leading-6">Pay from credit</span>
            </div>
            <p class="text-left text-xs leading-5 text-muted-foreground">{{ unavailablePaymentMethodMessage }}</p>
          </div>
        </UiButton>
        <div class="flex flex-row items-center justify-end gap-2">
          <span class="text-foreground text-sm font-normal leading-6">Available:</span>
          <UiButton type="button" variant="link" size="xs" @click="showCreditInfoModal = true">
            <span class="text-blue-500 text-sm font-semibold leading-6">{{ accountCredit?.available?.toFixed(2) || 0 }}</span>
          </UiButton>
        </div>
      </div>
      <Transition name="fade-bottom">
        <div v-if="showCreditInfoModal" v-click-outside="() => (showCreditInfoModal = false)" class="absolute bottom-[160px] right-0">
          <OrderSummaryCreditInfoModal :account-credit="accountCredit" />
        </div>
      </Transition>
      <UiButton
        type="button"
        disabled
        :aria-label="`Cash on delivery — ${unavailablePaymentMethodMessage}`"
        variant="option"
        size="card"
        class="flex-col whitespace-normal group cursor-not-allowed"
      >
        <div class="flex w-full flex-col gap-3">
          <div class="flex flex-row justify-between w-full">
            <RadioButton class="w-5 h-5 my-[3px] text-grey-300 transition duration-300" />
            <MoneyIcon />
          </div>
          <div>
            <span class="text-foreground text-sm font-normal leading-6">Cash on delivery</span>
          </div>
          <p class="text-left text-xs leading-5 text-muted-foreground">{{ unavailablePaymentMethodMessage }}</p>
        </div>
      </UiButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRuntimeConfig } from '#app';
import SettingCog from '@/assets/icons/setting-cog.svg';
import RadioButton from '@/assets/icons/radio-button.svg';
import BankIcon from '@/assets/icons/bank.svg';
import PieChart from '@/assets/icons/pie-chart.svg';
import MoneyIcon from '@/assets/icons/money.svg';
import { PaymentTypeEnum, type CheckoutOrderDraft, type PaymentDetails, type StripeCardInterface } from '~~/types';
import { isPaymentManagementVisible } from '~~/helpers/mock-integration';
import type { CustomerCreditInterface } from '~~/types/auth/account-settings';
import { isBuyerCheckoutPaymentType, unavailablePaymentMethodMessage } from '~~/helpers/checkout-payment-methods';
import { usePaymentStore } from '~/store/paymentStore';
import { usePaymentCards } from '~/composables/usePaymentCards';

const paymentStore = usePaymentStore();
const config = useRuntimeConfig();
const paymentManagementVisible = isPaymentManagementVisible(Boolean(config.public.MOCK_MODE));

const { card, cards } = usePaymentCards();

const props = defineProps<{
  order: CheckoutOrderDraft;
  accountCredit: CustomerCreditInterface;
  requiresPaymentReselection?: boolean;
}>();

const emits = defineEmits(['update-payment-details', 'change-is-new-card-selected']);
const showCreditInfoModal = ref(false);
const payment = ref<PaymentDetails>({} as PaymentDetails);

function selectPaymentOption(option: { type: PaymentTypeEnum; info?: StripeCardInterface | null }) {
  if (!isBuyerCheckoutPaymentType(option.type)) return;
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
