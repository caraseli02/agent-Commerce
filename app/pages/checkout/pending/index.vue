<script setup lang="ts">
import { AlertTriangleIcon, ArrowLeft, LoaderIcon, RefreshCw } from '@lucide/vue';

const route = useRoute();

useHead({ title: 'Order pending' });
const router = useRouter();

const timeoutSeconds = 15;
const remainingSeconds = ref(timeoutSeconds);
const timedOut = ref(false);
let timeoutHandle: number | null = null;
let countdownHandle: number | null = null;

const routeOrderId = computed(() => {
  const queryId = route.query.id || route.query.orderId || route.query.order;

  return typeof queryId === 'string' ? queryId : '';
});

const retryTarget = computed(() => {
  return routeOrderId.value ? { path: '/checkout/session', query: { id: routeOrderId.value } } : '/checkout/session';
});

const clearTimers = () => {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  if (countdownHandle) {
    clearInterval(countdownHandle);
    countdownHandle = null;
  }
};

const startTimer = () => {
  clearTimers();
  timedOut.value = false;
  remainingSeconds.value = timeoutSeconds;

  timeoutHandle = window.setTimeout(() => {
    timedOut.value = true;
    clearTimers();
  }, timeoutSeconds * 1000);

  countdownHandle = window.setInterval(() => {
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
  }, 1000);
};

const retryPayment = async () => {
  await router.push(retryTarget.value);
};

const cancelPending = async () => {
  await router.push('/cart');
};

onMounted(() => {
  startTimer();
});

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<template>
  <div class="container py-8">
    <section class="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
      <div class="flex flex-col gap-6">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <LoaderIcon v-if="!timedOut" class="h-7 w-7 animate-spin" />
            <AlertTriangleIcon v-else class="h-7 w-7" />
          </div>

          <div class="space-y-2">
            <p class="text-sm font-semibold uppercase tracking-[0.14em] text-amber-600">
              {{ timedOut ? 'Checkout delayed' : 'Payment pending' }}
            </p>
            <h1 class="text-3xl font-semibold tracking-tight text-foreground">
              {{ timedOut ? 'We are still waiting for confirmation.' : 'Your payment is being processed.' }}
            </h1>
            <p class="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {{
                timedOut
                  ? 'The payment provider has not confirmed the charge yet. You can retry the payment session or cancel and return to your cart.'
                  : `Please keep this page open while we wait for the provider to finish. If nothing changes in ${remainingSeconds} seconds, we will switch to a timeout state with retry options.`
              }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 rounded-2xl border border-border bg-muted p-4 md:grid-cols-[auto_1fr] md:items-center">
          <div class="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
            <LoaderIcon v-if="!timedOut" class="h-5 w-5 animate-spin" />
            <AlertTriangleIcon v-else class="h-5 w-5 text-amber-600" />
          </div>
          <div class="space-y-1 text-sm leading-6 text-muted-foreground">
            <p class="font-medium text-foreground">
              {{ timedOut ? 'Timeout reached' : 'Checking payment status' }}
            </p>
            <p>
              {{
                timedOut
                  ? 'The checkout flow has paused so you can choose the next step without losing your cart.'
                  : 'We are waiting for a final response from the payment provider and will keep this session alive until the timeout.'
              }}
            </p>
            <p v-if="!timedOut" class="text-xs text-muted-foreground">Auto timeout in {{ remainingSeconds }}s.</p>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <UiButton class="w-full gap-2 sm:w-auto" @click="retryPayment">
            <RefreshCw class="h-4 w-4" />
            {{ timedOut ? 'Retry payment' : 'Retry now' }}
          </UiButton>

          <UiButton class="w-full gap-2 sm:w-auto" variant="secondary" @click="cancelPending">
            <ArrowLeft class="h-4 w-4" />
            Cancel and return to cart
          </UiButton>
        </div>
      </div>
    </section>
  </div>
</template>
