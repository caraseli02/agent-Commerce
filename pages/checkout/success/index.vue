<script setup lang="ts">
import { ArrowRight, CheckCircle2, LayoutDashboard, ShoppingBag, TruckIcon } from 'lucide-vue-next';
import { format } from 'date-fns';
import { useCartStore } from '~/store/cartStore';
import { getOrderById } from '~/composables/api/orders';
import { PaymentTypeEnum } from '~/types';
import type { OrderInterface, OrderRequestInterfaceResponse } from '~/types';

const route = useRoute();
const cartStore = useCartStore();

const loading = ref(true);
const order = ref<OrderInterface | null>(null);
const fetchError = ref('');

const routeOrderId = computed(() => {
  const queryId = route.query.id || route.query.orderId || route.query.order;

  return typeof queryId === 'string' ? queryId : '';
});

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

  return format(new Date(order.value.createdAt), 'dd MMM yyyy, HH:mm');
});

const estimatedPickup = computed(() => {
  const pickupDate = order.value?.shippingDetails?.statusTracking?.estimatedPickUpDate;

  return pickupDate ? format(new Date(pickupDate), 'dd MMM yyyy') : '';
});

const orderSummaryHref = computed(() => {
  return order.value?._id ? `/order-summary/${order.value._id}?new=true` : '/order-summary';
});

const loadOrder = async () => {
  if (!routeOrderId.value) {
    fetchError.value = 'We could not find an order reference for this payment.';
    loading.value = false;
    return;
  }

  loading.value = true;
  fetchError.value = '';

  try {
    const response = (await getOrderById(routeOrderId.value)) as OrderRequestInterfaceResponse;

    if (response.status === 'success' && response.data?.order) {
      order.value = response.data.order;
      cartStore.emptyOrderClientSecret();
      cartStore.emptyPreviousCheckoutError();
      loading.value = false;
      return;
    }

    fetchError.value = 'Payment was confirmed, but the order details are not available yet.';
  } catch {
    fetchError.value = 'Payment was confirmed, but we could not load the order details just yet.';
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
    <section class="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/80 shadow-sm">
      <!-- Structural skeleton mirrors the loaded success layout to avoid a spinner flash / layout jump -->
      <div
        v-if="loading"
        class="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-start"
        aria-busy="true"
        aria-label="Loading confirmed order details"
      >
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

        <div class="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div class="space-y-2">
            <UiSkeleton class="h-3 w-36 rounded-md" />
            <UiSkeleton class="h-7 w-56 max-w-full rounded-md" />
          </div>

          <div class="space-y-3">
            <UiSkeleton v-for="i in 3" :key="`next-${i}`" class="h-[72px] rounded-2xl" />
          </div>
        </div>
      </div>

      <div v-else class="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
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

          <div v-if="fetchError" class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm leading-6 text-amber-900">
            {{ fetchError }}
          </div>

          <div v-else class="grid gap-3 md:grid-cols-3">
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
