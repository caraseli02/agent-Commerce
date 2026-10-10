<template>
  <div class="container my-10 flex min-h-[50vh] flex-col items-center gap-8">
    <template v-if="cartStore.previousCheckoutError">
      <section class="flex w-full flex-col items-center justify-center gap-4 rounded-lg border-[1.5px] border-red-500 bg-light-100 p-6">
        <h4 class="text-2xl font-medium">{{ failurePresentation.title }}</h4>
        <AlertTriangleIcon class="h-10 w-10 stroke-2 text-red-500" />
        <p>Reason: {{ failurePresentation.message }}</p>
      </section>
      <div class="flex flex-wrap justify-center gap-4">
        <UiButton class="w-fit" variant="secondary" @click="cancelAndLeave">
          <span class="text-sm font-medium leading-[1.42857]"> Cancel order </span>
        </UiButton>
        <UiButton class="w-fit" @click="retryCheckout">
          <span class="text-sm font-medium leading-[1.42857]">
            {{ failurePresentation.action }}
          </span>
        </UiButton>
      </div>
    </template>

    <PaymentSessionCardForm v-else-if="getOrderClientSecret" />

    <section
      v-else
      class="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8"
    >
      <AlertTriangleIcon class="h-10 w-10 text-amber-600" />
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold text-slate-900">No checkout failure details to show</h1>
        <p class="text-sm leading-6 text-slate-600 md:text-base">
          This page opens after a payment failure during checkout. If you arrived here directly, return to your order summary or cart to
          continue the demo checkout flow.
        </p>
      </div>
      <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <NuxtLink to="/order-summary">
          <UiButton class="w-full gap-2 sm:w-auto"> Back to order summary </UiButton>
        </NuxtLink>
        <NuxtLink to="/cart">
          <UiButton class="w-full gap-2 sm:w-auto" variant="secondary"> Return to cart </UiButton>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { AlertTriangleIcon } from '@lucide/vue';
import { useCartStore } from '~/store/cartStore';
import { checkoutFailurePresentation } from '~~/helpers/checkout-error-presentation';
import { cancelOrder as cancelOrderApi } from '~/composables/api/orders';

const route = useRoute();
const router = useRouter();

const cartStore = useCartStore();
const { getPreviousCheckoutError, getOrderClientSecret } = storeToRefs(cartStore);
const failurePresentation = computed(() => checkoutFailurePresentation(getPreviousCheckoutError.value));

const orderId = ref<string>();

orderId.value = typeof route.query.id === 'string' ? route.query.id : undefined;

const clearFailureContext = () => {
  cartStore.emptyOrderClientSecret();
  cartStore.emptyPreviousCheckoutError();
};

const cancelOrder = async () => {
  // A cancellation 401 redirects through the API client before rejecting. Clear first so that
  // redirect cannot re-enter this page's leave guard and repeat the cancellation request.
  clearFailureContext();
  try {
    if (orderId.value) await cancelOrderApi(orderId.value);
  } catch (error) {
    // Leaving the error page must not depend on a remote cancellation being confirmed.
    console.warn('Checkout cancellation could not be confirmed.', error);
  }
};

const cancelAndLeave = async () => {
  await cancelOrder();
  await router.push({ path: '/dashboard/client' });
};

const retryCheckout = async () => {
  clearFailureContext();
  await router.push(orderId.value ? `/order-summary/${orderId.value}` : '/order-summary');
};

onBeforeRouteLeave(async (to, from, next) => {
  if (cartStore.previousCheckoutError && failurePresentation.value.cancelOnLeave) {
    await cancelOrder();
  }
  clearFailureContext();
  next();
});
</script>
