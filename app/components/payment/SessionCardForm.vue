<template>
  <div class="container py-8">
    <section
      class="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8"
      aria-labelledby="payment-title"
    >
      <p class="text-sm font-medium text-primary">Secure card checkout</p>
      <p class="mt-2 text-sm text-muted-foreground">Stripe test mode. Use a test card; no real money is charged.</p>
      <h1 id="payment-title" class="mt-2 text-2xl font-semibold text-foreground">{{ title }}</h1>
      <p v-if="orderId" class="mt-2 break-all text-sm text-muted-foreground">Order {{ orderId }}</p>
      <p class="mt-4 text-sm leading-6 text-muted-foreground" role="status" aria-live="polite">{{ description }}</p>
      <form v-show="showForm" class="mt-6 space-y-4" @submit.prevent="pay">
        <div class="relative rounded-lg border border-border p-4" :aria-busy="state !== 'ready' || submitting" data-testid="payment-form">
          <div ref="elementHost" :inert="state !== 'ready' || !elementReady || submitting" />
          <div
            v-if="state !== 'ready' || !elementReady || submitting"
            class="absolute inset-0 rounded-lg bg-card/70"
            data-testid="payment-disabled"
          />
          <p v-if="!elementReady" class="text-sm text-muted-foreground">Loading secure card fields…</p>
        </div>
        <p v-if="message || sdkError" role="alert" class="text-sm text-destructive dark:text-red-300">{{ message || sdkError }}</p>
        <UiButton
          type="submit"
          class="w-full"
          :disabled="state !== 'ready' || !elementReady || !complete || Boolean(sdkError) || submitting"
        >
          {{ state === 'confirming' ? 'Processing payment…' : state === 'checking' ? 'Checking your order…' : 'Pay by card' }}
        </UiButton>
        <p class="text-xs leading-5 text-muted-foreground">
          Card details go directly to Stripe. Your bank may ask you to authenticate this payment.
        </p>
      </form>
      <p v-if="!showForm && message" role="alert" class="mt-4 text-sm text-muted-foreground">{{ message }}</p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <UiButton v-if="state === 'canceled'" :disabled="restarting" @click="reviewAgain">Review order and try again</UiButton>
        <UiButton v-else-if="state === 'completed'" @click="router.push(`/order-summary/${encodeURIComponent(orderId)}`)"
          >View order</UiButton
        >
        <UiButton
          v-else-if="canCheck"
          variant="outline"
          class="bg-card text-card-foreground dark:bg-card dark:text-card-foreground"
          @click="check(true)"
          >Check payment status</UiButton
        >
        <UiButton
          v-if="state !== 'confirming' && state !== 'completed'"
          variant="outline"
          class="bg-card text-card-foreground dark:bg-card dark:text-card-foreground"
          @click="router.push('/order-summary')"
          >Back to order summary</UiButton
        >
        <UiButton
          v-if="state === 'disabled'"
          variant="outline"
          class="bg-card text-card-foreground dark:bg-card dark:text-card-foreground"
          @click="router.push('/')"
          >Back home</UiButton
        >
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { usePaymentSession } from '~/composables/usePaymentSession';
import { useCartStore } from '~/store/cartStore';

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const orderId = typeof route.query.id === 'string' ? route.query.id : '';
const { state, clientSecret, message, check, confirm, restart, dispose } = usePaymentSession(orderId);
const elementHost = ref<HTMLElement>();
const elementReady = ref(false);
const complete = ref(false);
const sdkError = ref('');
const restarting = ref(false);
const submitting = ref(false);
let stripe: Stripe | null = null;
let elements: StripeElements | undefined;
let paymentElement: StripePaymentElement | undefined;
let mountedSecret: string | undefined;
let mountGeneration = 0;
let disposed = false;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let polls = 0;
const showForm = computed(() => ['checking', 'ready', 'confirming'].includes(state.value));
const canCheck = computed(() => ['processing', 'paid-finalizing', 'recovery-required', 'compensation'].includes(state.value));
const title = computed(
  () =>
    ({
      checking: 'Checking your order…',
      ready: 'Pay by card',
      confirming: 'Processing payment…',
      processing: 'Processing payment…',
      'paid-finalizing': 'Payment received — finishing your order',
      completed: 'Payment confirmed',
      canceled: 'This payment was canceled',
      'recovery-required': 'Your payment needs review',
      compensation: 'Payment received — order under review',
      disabled: 'Card payments are temporarily unavailable',
    })[state.value],
);
const description = computed(
  () =>
    ({
      checking: 'We are checking your order and inventory before card payment can continue.',
      ready: 'Enter your card details to complete this order.',
      confirming: 'Keep this page open while Stripe and your bank confirm the payment.',
      processing: 'We are waiting for the server to confirm payment. Please do not start another checkout.',
      'paid-finalizing': 'Your payment has been received. We are finishing the order and checking fulfillment.',
      completed: 'The server confirmed your payment and completed your order.',
      canceled: 'Review the current cart and total before starting a new payment.',
      'recovery-required': 'Payment is disabled while this checkout is reviewed. Check the status again before trying another payment.',
      compensation: 'Your payment is being reviewed for fulfillment or refund. Please do not pay again.',
      disabled:
        'Card checkout is unavailable in this environment. Return to the order summary and try again later. Other payment methods are temporarily unavailable.',
    })[state.value],
);

watch(clientSecret, async (secret) => {
  // Preserve visible fields during revalidation; the overlay and inert block interaction.
  if (!secret || secret === mountedSecret) return;
  const generation = ++mountGeneration;
  paymentElement?.destroy();
  paymentElement = undefined;
  elements = undefined;
  mountedSecret = undefined;
  elementReady.value = false;
  complete.value = false;
  sdkError.value = '';
  try {
    const key = config.public.stripePublishableKey;
    if (!key) throw new Error('Card payment is unavailable. Please check your order later.');
    stripe = await loadStripe(key);
    if (disposed || generation !== mountGeneration) return;
    if (!stripe) throw new Error('Card payment could not load. Refresh this page to try again.');
    await nextTick();
    if (disposed || generation !== mountGeneration || !elementHost.value) return;
    const theme = getComputedStyle(document.documentElement);
    const color = (token: string) => `hsl(${theme.getPropertyValue(token).trim()})`;
    elements = stripe.elements({
      clientSecret: secret,
      appearance: {
        theme: document.documentElement.classList.contains('dark') ? 'night' : 'stripe',
        variables: {
          colorPrimary: color('--primary'),
          colorBackground: color('--card'),
          colorText: color('--card-foreground'),
          colorDanger: color('--destructive'),
        },
      },
    });
    paymentElement = elements.create('payment', { paymentMethodOrder: ['card'], wallets: { applePay: 'never', googlePay: 'never' } });
    paymentElement.on('ready', () => {
      if (!disposed && generation === mountGeneration) elementReady.value = true;
    });
    paymentElement.on('change', (event) => {
      if (!disposed && generation === mountGeneration) complete.value = event.complete;
    });
    paymentElement.on('loaderror', () => {
      if (!disposed && generation === mountGeneration) sdkError.value = 'Card fields could not load. Refresh this page to try again.';
    });
    mountedSecret = secret;
    paymentElement.mount(elementHost.value);
  } catch {
    if (!disposed && generation === mountGeneration) sdkError.value = 'Card payment could not load. Refresh this page to try again.';
  }
});

const pay = async () => {
  if (state.value !== 'ready' || submitting.value || !stripe || !elements || !elementReady.value || !complete.value || sdkError.value)
    return;
  const activeStripe = stripe;
  const activeElements = elements;
  submitting.value = true;
  message.value = '';
  try {
    // Validate fields in the submit gesture, then retain ECAS's fresh safety
    // authorization immediately before provider confirmation.
    const submitted = await activeElements.submit();
    if (disposed) return;
    if (submitted.error) {
      message.value = 'Check your card details and try again.';
      return;
    }
    await confirm(async (secret) => {
      const returnUrl = new URL('/checkout/session', window.location.origin);
      returnUrl.searchParams.set('id', orderId);
      returnUrl.searchParams.set('returned', '1');
      return activeStripe.confirmPayment({
        elements: activeElements,
        clientSecret: secret,
        confirmParams: { return_url: returnUrl.toString() },
        redirect: 'if_required',
      });
    });
  } catch {
    if (!disposed) message.value = 'Card payment could not continue. Check your details and try again.';
  } finally {
    submitting.value = false;
  }
};
const reviewAgain = async () => {
  restarting.value = true;
  if (await restart()) {
    sessionStorage.removeItem('checkout-draft-v1');
    const cart = useCartStore();
    cart.emptyPreviousCheckoutError();
    cart.emptyOrderClientSecret();
    cart.hasFetchedCart = false; // The summary reloads the new revision before issuing a fresh quote.
    await router.push('/order-summary');
  }
  restarting.value = false;
};
watch(state, (value) => {
  clearTimeout(pollTimer);
  if (value === 'completed') {
    sessionStorage.removeItem('checkout-draft-v1');
    const cart = useCartStore();
    cart.emptyOrderClientSecret();
    cart.emptyPreviousCheckoutError();
    // Read the server cart so revision-aware cleanup never erases newer buyer edits locally.
    void cart.updateAndReturnCart().catch(() => {
      cart.hasFetchedCart = false;
    });
  }
  if (['processing', 'paid-finalizing'].includes(value) && polls < 5)
    pollTimer = setTimeout(() => {
      polls++;
      void check(true);
    }, 3000);
});
onMounted(async () => {
  // Return query values never establish truth and secrets are not kept in the URL.
  if (!orderId) {
    state.value = 'disabled';
    return;
  }
  const returned = route.query.returned === '1';
  if (route.query.payment_intent_client_secret || route.query.payment_intent || route.query.redirect_status) {
    await router.replace({ path: route.path, query: { id: orderId, returned: '1' } });
  }
  await check(returned || route.query.returned === '1');
});
onBeforeUnmount(() => {
  disposed = true;
  mountGeneration++;
  clearTimeout(pollTimer);
  dispose();
  paymentElement?.destroy();
});
</script>
