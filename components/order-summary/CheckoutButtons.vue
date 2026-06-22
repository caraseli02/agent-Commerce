<template>
  <div class="flex flex-col mb-8 gap-6">
    <div class="flex flex-col gap-4">
      <div>
        <button class="px-6 flex flex-row items-center justify-center w-full min-h-[52px] bg-light-500 rounded-xl border border-slate-200">
          <ArrowLeft class="text-slate-500" />
          <div class="p-2">
            <span class="text-slate-500 text-base font-medium leading-7">Continue Shopping</span>
          </div>
        </button>
      </div>
      <div v-if="isGuestCheckout">
        <NuxtLink
          :to="signinHref"
          class="flex min-h-[52px] items-center justify-center w-full rounded-xl bg-blue-500 px-6 py-2 text-white transition-colors duration-300 hover:bg-blue-400 shadow-sm"
        >
          <ShieldIcon class="text-white" />
          <div class="p-2">
            <span class="text-white text-base font-medium leading-7">Sign in to Continue Checkout</span>
          </div>
        </NuxtLink>
      </div>
      <div v-else>
        <UiButton
          :disabled="isCheckoutDisabled"
          class="w-full min-h-[52px] rounded-xl shadow-sm"
          @click.once="
            checkout = true;
            stopButtonTrigger();
          "
        >
          <ShieldIcon class="text-white" />
          <div class="p-2">
            <span class="text-white text-base font-medium leading-7">Secure Checkout</span>
          </div>
        </UiButton>
      </div>
    </div>
    <div
      class="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:gap-6 lg:justify-between lg:gap-4"
    >
      <BadgeVisa />
      <BadgeMaster />
      <BadgeApplePay />
      <BadgeGooglePay />
      <BadgeStripe />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import ArrowLeft from '@/assets/icons/arrow-left.svg';
import ShieldIcon from '@/assets/icons/shield.svg';
import BadgeVisa from '@/assets/icons/badge-visa.svg';
import BadgeMaster from '@/assets/icons/badge-master.svg';
import BadgeApplePay from '@/assets/icons/badge-applepay.svg';
import BadgeGooglePay from '@/assets/icons/badge-googlepay.svg';
import BadgeStripe from '@/assets/icons/badge-stripe.svg';
import { useCheckoutStore } from '~/store/checkout';

defineProps<{
  isCheckoutDisabled: boolean;
  isGuestCheckout?: boolean;
  signinHref?: string;
}>();

const stopButtonTrigger = async () => {};

const checkoutStore = useCheckoutStore();
const { checkout } = storeToRefs(checkoutStore);
</script>
