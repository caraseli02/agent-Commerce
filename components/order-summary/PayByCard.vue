<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Trash2Icon } from '@lucide/vue';
import { useRouter } from '#app';
import { usePaymentStore } from '~/store/paymentStore';
import type { StripeCardInterface } from '~/types';

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

const emits = defineEmits(['selectPaymentOption', 'delete-card', 'set-default', 'edit-card']);
const paymentMethods = (cardInfo?: StripeCardInterface) => {
  emits('selectPaymentOption', cardInfo);
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
  <button
    class="p-3 w-full min-w-[326px] min-h-[100px] flex flex-col gap-3 border rounded-lg hover:bg-blue-500/5 hover:border-blue-500 transition duration-300 group"
    :class="isSelected ? 'border-blue-500 bg-blue-500/5' : 'border-gray-300'"
    @click="paymentMethods(cardInfo)"
  >
    <div class="flex flex-row justify-between w-full gap-3">
      <SvgoRadioButtonChecked v-if="isSelected" class="w-5 h-5 my-[3px] text-blue-500 group-hover:text-blue-500 transition duration-300" />
      <SvgoRadioButton v-else class="w-5 h-5 my-[3px] text-gray-300 group-hover:text-neutral-700 transition duration-300" />
      <div v-if="hasCard" class="justify-between items-center self-stretch flex gap-5 w-full">
        <span class="items-stretch flex gap-2 my-auto">
          <div class="capitalize text-zinc-800 text-sm font-medium leading-6 whitespace-nowrap">
            {{ cardType }}
          </div>
          <div class="flex items-center gap-2 text-zinc-800 text-sm font-medium leading-6 grow whitespace-nowrap">
            <span class="font-extrabold">••••</span>
            <span class="">{{ cardInfo?.card.last4 }}</span>
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
      <span v-if="showPayWithLabel" class="text-neutral-700 text-sm font-normal leading-6 w-full text-start"
        >Pay {{ isNewCardSelected ? 'with a new card' : 'by card' }}</span
      >
      <div class="flex justify-end w-full gap-2">
        <div v-if="!isExpired && !showPayWithLabel && cardInfo && !cardInfo.default" class="flex gap-2 items-center justify-end">
          <UiButton
            variant="ghost"
            size="xs"
            class="text-neutral-700 text-sm font-normal leading-6"
            @click.stop="emits('set-default', cardInfo)"
          >
            <CheckCircle2 class="w-4 h-4 stroke-1 mr-1" />
            Set as default
          </UiButton>
        </div>
        <UiButton
          v-if="enableEdit"
          size="xs"
          variant="link"
          class="flex gap-2 items-center justify-end hover:underline"
          @click="onEditClick()"
        >
          <SvgoChangeCard />
          <span class="text-neutral-700 text-sm font-normal leading-6">Edit</span>
        </UiButton>
      </div>
    </div>
    <div v-if="view === 'modal'" class="flex justify-between w-full gap-2">
      <span v-if="isExpired" class="items-center flex justify-start gap-2 w-full">
        <AlertTriangle class="w-5 h-5 text-rose-500" />
        <div class="text-red-500 text-sm leading-6">Card expired</div>
      </span>
      <UiButton v-if="!isDefault && !isExpired" class="gap-1.5" variant="ghost" size="xs" @click.stop="emits('set-default', cardInfo)">
        <CheckCircle2 class="w-4 h-4" />
        <span class="text-neutral-700 text-sm font-normal leading-6">Set as default</span>
      </UiButton>
      <UiButton v-if="enableEdit" class="gap-1.5" variant="ghost" size="xs" @click.stop="emits('edit-card', cardInfo)">
        <SvgoChangeCard />
        <span class="text-neutral-700 text-sm font-normal leading-6">Edit</span>
      </UiButton>
      <UiButton class="gap-1.5" variant="ghost" size="xs" @click.stop="emits('delete-card', cardInfo)">
        <Trash2Icon class="w-4 h-4" />
        <span class="text-neutral-700 text-sm font-normal leading-6">Delete</span>
      </UiButton>
    </div>
  </button>
</template>

<style scoped></style>
