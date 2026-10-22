<template>
  <div class="flex flex-col mb-8 gap-4">
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

    <div v-else class="flex flex-col gap-2">
      <UiButton
        :disabled="isCheckoutDisabled || isSubmitting"
        :aria-describedby="showMissingRequirements ? 'checkout-missing-requirements' : undefined"
        size="lg"
        class="w-full min-h-[52px]"
        data-testid="secure-checkout"
        @click="placeOrder"
      >
        <ShieldIcon />
        <div>
          <span>{{ isSubmitting ? 'Placing order…' : 'Secure Checkout' }}</span>
        </div>
      </UiButton>
      <p
        v-if="showMissingRequirements"
        id="checkout-missing-requirements"
        class="text-sm leading-5 text-muted-foreground"
        data-testid="checkout-missing-requirements"
      >
        To continue, add: {{ missingRequirements.join(', ') }}.
      </p>
    </div>

    <UiButton as-child variant="ghost" class="self-center">
      <NuxtLink to="/search">
        <ArrowLeft />
        <span>Continue shopping</span>
      </NuxtLink>
    </UiButton>

    <p class="rounded-xl border border-border bg-card p-4 text-xs leading-5 text-muted-foreground" data-testid="checkout-trust-note">
      Demo store: orders use sample data and no money is charged.{{ paymentMethodsNote }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import ArrowLeft from '@/assets/icons/arrow-left.svg';
import ShieldIcon from '@/assets/icons/shield.svg';
import { PaymentTypeEnum } from '~~/types';
import { useCheckoutStore } from '~/store/checkoutStore';
import { useAuthStore } from '~/store/authStore';
import { useGuestCheckout } from '~/composables/useGuestCheckout';

const props = withDefaults(
  defineProps<{
    isCheckoutDisabled: boolean;
    isGuestCheckout?: boolean;
    signinHref?: string;
    /** Human-readable names of the details still blocking checkout. */
    missingRequirements?: string[];
  }>(),
  { isGuestCheckout: false, signinHref: '/', missingRequirements: () => [] },
);

const router = useRouter();
const { guestCheckoutMode, enableGuestCheckout } = useGuestCheckout();

const showGuestSignInWall = computed(() => props.isGuestCheckout && !guestCheckoutMode.value);
const showMissingRequirements = computed(() => props.isCheckoutDisabled && props.missingRequirements.length > 0);

const startGuestCheckout = async () => {
  enableGuestCheckout();
  if (router.currentRoute.value.path !== '/order-summary') {
    await router.push('/order-summary');
  }
};

const checkoutStore = useCheckoutStore();
const { checkout } = storeToRefs(checkoutStore);
// The page resets `checkout` once the attempt settles, so a failed attempt can be retried.
const isSubmitting = computed(() => Boolean(checkout.value));

const placeOrder = () => {
  if (props.isCheckoutDisabled || isSubmitting.value) return;
  checkout.value = true;
};

// Only name the methods this store actually offers; card payment needs Stripe, which the demo keeps off.
const paymentMethodLabels: Partial<Record<PaymentTypeEnum, string>> = {
  [PaymentTypeEnum.Bank]: 'bank transfer',
  [PaymentTypeEnum.Cash]: 'cash on delivery',
  [PaymentTypeEnum.Credit]: 'account credit',
};
const { getGeneralSettings } = storeToRefs(useAuthStore());
const paymentMethodsNote = computed(() => {
  const labels = (getGeneralSettings.value?.orderSettings?.paymentMethods ?? [])
    .filter((method) => method.type !== PaymentTypeEnum.Credit || !props.isGuestCheckout)
    .map((method) => paymentMethodLabels[method.type])
    .filter((label): label is string => Boolean(label));
  return labels.length ? ` Pay by ${labels.join(', ')}.` : '';
});
</script>
