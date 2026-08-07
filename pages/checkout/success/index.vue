<script setup lang="ts">
import { ArrowRight, CheckCircle2, LayoutDashboard, ShoppingBag, TruckIcon } from 'lucide-vue-next';
import { formatReviewerDate, formatReviewerDateTime } from '~/helpers/reviewer-dates';
import { useCartStore } from '~/store/cartStore';
import { useOrderConfirmation } from '~/composables/useOrderConfirmation';
import { PaymentTypeEnum } from '~/types';
import type { OrderInterface } from '~/types';

const route = useRoute();
const cartStore = useCartStore();

const loading = ref(true);
const order = ref<OrderInterface | null>(null);
const fetchError = ref('');

const routeOrderId = computed(() => {
  const queryId = route.query.id || route.query.orderId || route.query.order;

  return typeof queryId === 'string' ? queryId : '';
});

const { loadCheckoutSuccessOrder } = useOrderConfirmation(() => routeOrderId.value);

const formatMoney = (amount?: number, currency?: string) => {
  const value = Number(amount || 0);
  const code = String(currency || 'RON').toUpperCase();
  const normalizedCurrency = code === 'LEI' ? 'RON' : code;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${normalizedCurrency}`;
  }
};

const paymentLabel = computed(() => {
  switch (order.value?.paymentDetails?.type) {
    case PaymentTypeEnum.Card:
      return order.value?.paymentDetails?.card?.card?.last4
        ? `Card ending in ${order.value.paymentDetails.card.card.last4}`
        : 'Card payment';
    case PaymentTypeEnum.Bank:
      return 'Bank transfer';
    case PaymentTypeEnum.Credit:
      return 'Account credit';
    case PaymentTypeEnum.Cash:
      return 'Cash';
    default:
      return 'Confirmed payment';
  }
});

const orderDate = computed(() => {
  if (!order.value?.createdAt) {
    return 'Just now';
  }

  return formatReviewerDateTime(order.value.createdAt);
});

const estimatedPickup = computed(() => {
  const pickupDate = order.value?.shippingDetails?.statusTracking?.estimatedPickUpDate;

  return formatReviewerDate(pickupDate);
});

const orderSummaryHref = computed(() => {
  return order.value?._id ? `/order-summary/${order.value._id}?new=true` : '/order-summary';
});

const loadOrder = async () => {
  if (!routeOrderId.value) {
    fetchError.value = '';
    loading.value = false;
    return;
  }

  loading.value = true;
  fetchError.value = '';

  try {
    const loadedOrder = await loadCheckoutSuccessOrder(routeOrderId.value);

    if (loadedOrder) {
      order.value = loadedOrder;
      cartStore.emptyOrderClientSecret();
      cartStore.emptyPreviousCheckoutError();
      loading.value = false;
      return;
    }

    fetchError.value = 'We could not find order details for this reference. Return to checkout or your cart to try again.';
  } catch {
    fetchError.value = 'We could not load order details for this reference. Return to checkout or your cart to try again.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadOrder();
});
</script>

<template>
  <div class="container py-8">
    <section v-if="!routeOrderId" class="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm md:p-8">
      <div class="space-y-4 text-center">
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">No order reference to confirm</h1>
        <p class="text-sm leading-6 text-slate-600 md:text-base">
          This success page needs a valid order reference from checkout. If you opened it directly, return to your order summary or cart to
          complete a demo purchase.
        </p>
        <div class="flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink to="/order-summary">
            <UiButton class="w-full gap-2 sm:w-auto"> Back to order summary </UiButton>
          </NuxtLink>
          <NuxtLink to="/cart">
            <UiButton class="w-full gap-2 sm:w-auto" variant="secondary"> Return to cart </UiButton>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section
      v-else-if="loading"
      class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      aria-busy="true"
      aria-label="Loading order details"
    >
      <!-- Structural skeleton mirrors the loaded success layout to avoid a spinner flash / layout jump -->
      <div class="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
        <div class="space-y-6">
          <UiSkeleton class="h-7 w-44 rounded-full" />

          <div class="space-y-3">
            <UiSkeleton class="h-10 w-full max-w-xl rounded-lg md:h-12" />
            <UiSkeleton class="h-4 w-full max-w-2xl rounded-md" />
            <UiSkeleton class="h-4 w-5/6 max-w-xl rounded-md" />
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <UiSkeleton v-for="i in 3" :key="`info-${i}`" class="h-[88px] rounded-2xl" />
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <UiSkeleton class="h-10 w-full rounded-md sm:w-44" />
            <UiSkeleton class="h-10 w-full rounded-md sm:w-44" />
            <UiSkeleton class="h-10 w-full rounded-md sm:w-36" />
          </div>
        </div>

        <div class="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
          <div class="space-y-2">
            <UiSkeleton class="h-3 w-36 rounded-md" />
            <UiSkeleton class="h-7 w-56 max-w-full rounded-md" />
          </div>

          <div class="space-y-3">
            <UiSkeleton v-for="i in 3" :key="`next-${i}`" class="h-[72px] rounded-2xl" />
          </div>
        </div>
      </div>
    </section>

    <section
      v-else-if="fetchError || !order"
      class="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm md:p-8"
    >
      <div class="space-y-4">
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Order details unavailable</h1>
        <p class="text-sm leading-6 text-slate-600 md:text-base">
          {{ fetchError || 'We could not find order details for this reference. Return to checkout or your cart to try again.' }}
        </p>
        <div class="flex flex-col gap-3 sm:flex-row">
          <NuxtLink to="/order-summary">
            <UiButton class="w-full gap-2 sm:w-auto"> Back to order summary </UiButton>
          </NuxtLink>
          <NuxtLink to="/cart">
            <UiButton class="w-full gap-2 sm:w-auto" variant="secondary"> Return to cart </UiButton>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section v-else class="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/80 shadow-sm">
      <div class="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
        <div class="space-y-6">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
          >
            <CheckCircle2 class="h-4 w-4" />
            Payment confirmed
          </div>

          <div class="space-y-3">
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">Success — your order is locked in.</h1>
            <p class="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              This payment went through. Review the live order details, keep the reference handy, and jump back into shopping whenever you
              want.
            </p>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Order reference</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ order?.shortId || order?._id }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total paid</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ formatMoney(order?.total, order?.currency) }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Confirmed at</p>
              <p class="mt-2 text-lg font-semibold text-slate-900">
                {{ orderDate }}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <NuxtLink :to="orderSummaryHref">
              <UiButton class="w-full gap-2 sm:w-auto">
                View order details
                <ArrowRight class="h-4 w-4" />
              </UiButton>
            </NuxtLink>

            <NuxtLink to="/">
              <UiButton class="w-full gap-2 sm:w-auto" variant="secondary">
                <ShoppingBag class="h-4 w-4" />
                Continue shopping
              </UiButton>
            </NuxtLink>

            <NuxtLink to="/dashboard/client?tab=orders">
              <UiButton class="w-full gap-2 sm:w-auto" variant="secondary">
                <LayoutDashboard class="h-4 w-4" />
                Dashboard
              </UiButton>
            </NuxtLink>
          </div>
        </div>

        <div class="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">What happens next</p>
            <h2 class="text-xl font-semibold text-slate-900">The order is ready for handoff.</h2>
          </div>

          <div class="space-y-3 text-sm leading-6 text-slate-600">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="font-medium text-slate-900">Payment method</p>
              <p>{{ paymentLabel }}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="font-medium text-slate-900">Shipping method</p>
              <p>{{ order?.shippingDetails?.stockorderShippingType?.service?.courierName || 'Selected at checkout' }}</p>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="flex items-start gap-3">
                <TruckIcon class="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p class="font-medium text-slate-900">Fulfilment update</p>
                  <p>
                    {{
                      estimatedPickup ? `Estimated pickup ${estimatedPickup}.` : 'Tracking updates will appear as fulfilment progresses.'
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
