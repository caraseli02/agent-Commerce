<template>
  <div class="relative items-stretch shadow-xs bg-card flex w-full flex-col p-6 rounded-xl">
    <template v-if="card">
      <section class="justify-between items-stretch flex gap-5">
        <div class="text-foreground text-sm font-medium leading-5 capitalize">Card</div>
        <UiButton variant="ghost" class="p-1 w-10 h-10" aria-label="Edit payment settings" @click="openSettingTab">
          <SvgoEditGray24 class="text-slate-300 hover:text-primary" />
        </UiButton>
      </section>
      <div v-if="card && card.type" class="items-stretch flex justify-between gap-3 mt-6 pr-7">
        <component :is="cardImg[card?.card?.brand as keyof typeof cardImg]" />
        <div class="justify-center items-stretch flex grow basis-[0%] flex-col">
          <div class="items-stretch flex gap-2">
            <div class="text-foreground text-base font-medium leading-5 capitalize">
              {{ card?.card?.brand }}
            </div>
            <div class="text-foreground text-base font-medium leading-5">
              <span class="font-extrabold">{{ '••••' }}</span> {{ card?.card?.last4 }}
            </div>
            <SvgoCheckCircle20 class="text-green-600 aspect-square object-contain object-center w-5 overflow-hidden shrink-0 max-w-full" />
          </div>
          <div class="items-stretch flex gap-1 text-sm text-muted-foreground mt-1">
            <div class="leading-5 shrink basis-auto">Expiration date:</div>
            <div class="font-medium leading-5 grow shrink basis-auto">
              {{ card?.card?.exp_month + '/' + card?.card?.exp_year }}
            </div>
          </div>
        </div>
      </div>
      <UiButton
        variant="bare"
        size="flush"
        class="flex mt-6 self-end"
        @click="
          Emitter.emit('customer-dashboard-nav-tab', {
            label: 'Transaction History',
            value: 'transaction_history',
          })
        "
      >
        <div class="text-sm font-medium leading-5 grow">Transactions</div>
        <SvgoArrowLeft16
          class="aspect-square object-contain object-center w-4 justify-center items-center overflow-hidden shrink-0 max-w-full my-auto ml-2"
        />
      </UiButton>
    </template>
    <section v-else class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="w-full">No results.</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance';
import amexIcon from '@/assets/icons/amex58.svg';
import masterIcon from '@/assets/icons/mastercard58.svg';
import visaIcon from '@/assets/icons/visa58.svg';
import type { StripeCardInterface } from '~~/types';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';

defineProps<{
  card?: StripeCardInterface | null;
}>();

const cardImg = {
  mastercard: masterIcon,
  amex: amexIcon,
  visa: visaIcon,
};

const { activeOrderFilter } = useCustomerDashboard();

const route = useRoute();
const openSettingTab = () => {
  route.query.scrollTo = 'payments';
  activeOrderFilter.value = {
    value: 'settings',
  };
};
</script>

<style scoped></style>
