<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Trash2Icon } from '@lucide/vue';
import { useRouter } from '#app';
import { usePaymentStore } from '~/store/paymentStore';
import type { StripeCardInterface } from '~~/types';

const paymentStore = usePaymentStore();

defineProps<{
  cardInfo?: StripeCardInterface;
  isSelected?: boolean;
  hasCard?: boolean;
  cards?: boolean;
  view: 'modal' | 'payment';
  isExpired?: boolean;
  isDefault?: boolean;
  isNewCardSelected?: boolean;
  cardType?: string;
  showPayWithLabel?: boolean;
  enableEdit?: boolean;
}>();

const emits = defineEmits(['selectPaymentOption', 'delete-card', 'set-default', 'edit-card', 'click']);
const paymentMethods = (cardInfo: StripeCardInterface | undefined, event: MouseEvent) => {
  emits('selectPaymentOption', cardInfo);
  emits('click', event);
};

const router = useRouter();

const onEditClick = () => {
  if (paymentStore.showCardsModal) {
    paymentStore.toggleCardModal();
    router.push({
      path: '/dashboard/client',
      query: { tab: 'settings', scrollTo: 'payments' },
    });
  } else {
    paymentStore.toggleCardModal();
  }
};
</script>

<template>
  <div class="flex w-full min-w-[326px] flex-col gap-3">
    <UiButton
      type="button"
      :variant="isSelected ? 'option-selected' : 'option'"
      size="card"
      class="w-full min-w-[326px] min-h-[100px] flex-col whitespace-normal group"
      :aria-label="!hasCard && !showPayWithLabel ? 'Pay by card' : undefined"
      @click="paymentMethods(cardInfo, $event)"
    >
      <div class="flex w-full flex-col gap-3">
        <div class="flex flex-row justify-between w-full gap-3">
          <SvgoRadioButtonChecked
            v-if="isSelected"
            class="w-5 h-5 my-[3px] text-blue-500 group-hover:text-blue-500 transition duration-300"
          />
          <SvgoRadioButton v-else class="w-5 h-5 my-[3px] text-gray-300 group-hover:text-foreground transition duration-300" />
          <div v-if="hasCard" class="justify-between items-center self-stretch flex gap-5 w-full">
            <span class="items-stretch flex gap-2 my-auto">
              <div class="capitalize text-foreground text-sm font-medium leading-6 whitespace-nowrap">
                {{ cardType }}
              </div>
              <div class="flex items-center gap-2 text-foreground text-sm font-medium leading-6 grow whitespace-nowrap">
                <span class="font-extrabold">••••</span>
                <span>{{ cardInfo?.card.last4 }}</span>
                <SvgoGreenCheckCircleSmall v-if="cardInfo?.default" />
              </div>
            </span>
            <SvgoCardVisa v-if="hasCard && cardType === 'visa'" />
            <SvgoCardMaster v-if="hasCard && cardType === 'mastercard'" />
            <SvgoCardAmex v-if="hasCard && cardType === 'amex'" />
          </div>
          <SvgoCardIcon v-else />
        </div>
        <div v-if="view === 'payment'" class="flex justify-between w-full">
          <span v-if="isExpired" class="items-center flex justify-start gap-2 w-full">
            <AlertTriangle class="w-5 h-5 text-rose-500" />
            <div class="text-red-500 text-sm leading-6">Card expired</div>
          </span>
          <span v-if="showPayWithLabel" class="text-foreground text-sm font-normal leading-6 w-full text-start"
            >Pay {{ isNewCardSelected ? 'with a new card' : 'by card' }}</span
          >
        </div>
      </div>
    </UiButton>
    <div
      v-if="view === 'payment' && (enableEdit || (!isExpired && !showPayWithLabel && cardInfo && !cardInfo.default))"
      class="flex justify-end w-full gap-2"
    >
      <div v-if="!isExpired && !showPayWithLabel && cardInfo && !cardInfo.default" class="flex gap-2 items-center justify-end">
        <UiButton type="button" variant="ghost" size="xs" @click.stop="emits('set-default', cardInfo)">
          <CheckCircle2 class="w-4 h-4 stroke-1 mr-1" />
          Set as default
        </UiButton>
      </div>
      <UiButton v-if="enableEdit" type="button" size="xs" variant="link" class="flex items-center justify-end" @click.stop="onEditClick()">
        <span class="inline-flex items-center gap-2">
          <SvgoChangeCard />
          <span class="text-foreground text-sm font-normal leading-6">Edit</span>
        </span>
      </UiButton>
    </div>
    <div v-if="view === 'modal'" class="flex justify-between w-full gap-2">
      <span v-if="isExpired" class="items-center flex justify-start gap-2 w-full">
        <AlertTriangle class="w-5 h-5 text-rose-500" />
        <div class="text-red-500 text-sm leading-6">Card expired</div>
      </span>
      <UiButton v-if="!isDefault && !isExpired" type="button" variant="ghost" size="xs" @click.stop="emits('set-default', cardInfo)">
        <span class="inline-flex items-center gap-1.5">
          <CheckCircle2 class="w-4 h-4" />
          <span class="text-foreground text-sm font-normal leading-6">Set as default</span>
        </span>
      </UiButton>
      <UiButton v-if="enableEdit" type="button" variant="ghost" size="xs" @click.stop="emits('edit-card', cardInfo)">
        <span class="inline-flex items-center gap-1.5">
          <SvgoChangeCard />
          <span class="text-foreground text-sm font-normal leading-6">Edit</span>
        </span>
      </UiButton>
      <UiButton type="button" variant="ghost" size="xs" @click.stop="emits('delete-card', cardInfo)">
        <span class="inline-flex items-center gap-1.5">
          <Trash2Icon class="w-4 h-4" />
          <span class="text-foreground text-sm font-normal leading-6">Delete</span>
        </span>
      </UiButton>
    </div>
  </div>
</template>

<style scoped></style>
