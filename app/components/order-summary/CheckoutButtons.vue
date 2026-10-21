<template>
  <div class="flex flex-col mb-8 gap-6">
    <div class="flex flex-col gap-4">
      <div>
        <UiButton as-child variant="secondary" size="lg" class="w-full min-h-[52px]">
          <NuxtLink to="/search">
            <ArrowLeft />
            <div>
              <span>Continue Shopping</span>
            </div>
          </NuxtLink>
        </UiButton>
      </div>

      <div v-if="showGuestSignInWall" class="flex flex-col gap-3">
        <UiButton as-child size="lg" class="w-full min-h-[52px]">
          <NuxtLink :to="signinHref">
            <ShieldIcon />
            <div>
              <span>Sign in to Continue Checkout</span>
            </div>
          </NuxtLink>
        </UiButton>
        <UiButton
          type="button"
          data-testid="checkout-as-guest"
          variant="outline"
          size="lg"
          class="w-full min-h-[52px]"
          @click="startGuestCheckout"
        >
          <span>Checkout as Guest</span>
        </UiButton>
      </div>

      <div v-else>
        <UiButton
          :disabled="isCheckoutDisabled"
          size="lg"
          class="w-full min-h-[52px]"
          @click.once="
            checkout = true;
            stopButtonTrigger();
          "
        >
          <ShieldIcon />
          <div>
            <span>Secure Checkout</span>
          </div>
        </UiButton>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 sm:gap-6 lg:justify-between lg:gap-4">
      <BadgeVisa />
      <BadgeMaster />
      <BadgeApplePay />
      <BadgeGooglePay />
      <BadgeStripe />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import ArrowLeft from '@/assets/icons/arrow-left.svg';
import ShieldIcon from '@/assets/icons/shield.svg';
import BadgeVisa from '@/assets/icons/badge-visa.svg';
import BadgeMaster from '@/assets/icons/badge-master.svg';
import BadgeApplePay from '@/assets/icons/badge-applepay.svg';
import BadgeGooglePay from '@/assets/icons/badge-googlepay.svg';
import BadgeStripe from '@/assets/icons/badge-stripe.svg';
import { useCheckoutStore } from '~/store/checkoutStore';
import { useGuestCheckout } from '~/composables/useGuestCheckout';

const props = defineProps<{
  isCheckoutDisabled: boolean;
  isGuestCheckout?: boolean;
  signinHref?: string;
}>();

const router = useRouter();
const { guestCheckoutMode, enableGuestCheckout } = useGuestCheckout();

const showGuestSignInWall = computed(() => Boolean(props.isGuestCheckout) && !guestCheckoutMode.value);

const startGuestCheckout = async () => {
  enableGuestCheckout();
  if (router.currentRoute.value.path !== '/order-summary') {
    await router.push('/order-summary');
  }
};

const stopButtonTrigger = async () => {};

const checkoutStore = useCheckoutStore();
const { checkout } = storeToRefs(checkoutStore);
</script>
