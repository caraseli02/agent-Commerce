<template>
  <div class="container my-10 flex min-h-[50vh] flex-col items-center gap-8">
    <template v-if="cartStore.previousCheckoutError">
      <section class="flex w-full flex-col items-center justify-center gap-4 rounded-lg border-[1.5px] border-red-500 bg-light-100 p-6">
        <h4 class="text-2xl font-medium">Payment failed</h4>
        <AlertTriangleIcon class="h-10 w-10 stroke-2 text-red-500" />
        <p>Reason: {{ getPreviousCheckoutError?.message || 'Something went wrong' }}</p>
      </section>
      <div class="flex flex-wrap justify-center gap-4">
        <UiButton
          class="w-fit"
          variant="secondary"
          @click="
            cancelOrder();
            router.push({ path: `/dashboard/client` });
          "
        >
          <span class="text-sm font-medium leading-[1.42857]"> Cancel order </span>
        </UiButton>
        <UiButton class="w-fit" @click="retryCheckout">
          <span class="text-sm font-medium leading-[1.42857]"> Try again </span>
        </UiButton>
      </div>
    </template>

    <PaymentSessionCardForm v-else-if="getOrderClientSecret" />

    <section v-else class="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
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
import { AlertTriangleIcon } from 'lucide-vue-next';
import { useCartStore } from '~/store/cartStore';
import { cancelOrder as cancelOrderApi } from '~/composables/api/orders';

const route = useRoute();
const router = useRouter();

const cartStore = useCartStore();
const { getPreviousCheckoutError, getOrderClientSecret } = storeToRefs(cartStore);

const orderId = ref<string>();

orderId.value = route.query.id as string;

const cancelOrder = async () => {
  if (!orderId.value) {
    return;
  }

  await cancelOrderApi(orderId.value);

  cartStore.emptyOrderClientSecret();
  cartStore.emptyPreviousCheckoutError();
};

const retryCheckout = async () => {
  cartStore.emptyPreviousCheckoutError();
  await router.push(orderId.value ? `/order-summary/${orderId.value}` : '/order-summary');
};

onBeforeRouteLeave(async (to, from, next) => {
  if (cartStore.previousCheckoutError) {
    await cancelOrder();
  }
  next();
});
</script>
