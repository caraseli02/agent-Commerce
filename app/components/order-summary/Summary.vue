<template>
  <div class="p-4 xl:p-6 flex flex-col gap-4 bg-card rounded-xl shadow-xs mb-9">
    <div class="flex flex-row w-full">
      <span class="text-foreground text-base font-medium leading-6">Payment Summary</span>
    </div>
    <div class="flex flex-col gap-2 relative">
      <div class="flex flex-row justify-between w-full">
        <span class="text-muted-foreground text-sm font-normal leading-6">Subtotal</span>
        <span v-if="isSummaryReady" class="text-foreground text-sm font-medium leading-6">{{ resolvedSubtotal.toFixed(2) }} Lei</span>
        <UiSkeleton v-else class="h-4 w-20" />
      </div>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-row gap-6">
          <span class="text-muted-foreground text-sm font-normal leading-6">Discount</span>
        </div>
        <span v-if="isSummaryReady" class="text-foreground text-sm font-medium leading-6">{{ resolvedDiscount.toFixed(2) }} Lei</span>
        <UiSkeleton v-else class="h-4 w-20" />
      </div>
      <div v-if="smallOrder" class="flex flex-row justify-between w-full">
        <div class="flex flex-col gap-1">
          <div class="flex flex-row gap-2 items-center">
            <span class="text-muted-foreground text-sm font-normal leading-6">Handling Charge</span>
            <UiButton
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Explain small order handling charge"
              @click="showSmallOrderModal = true"
            >
              <InformationIcon />
            </UiButton>
          </div>
          <span class="text-foreground italic text-sm font-normal leading-6">Small order charge</span>
        </div>
        <div class="flex flex-col justify-end">
          <span v-if="isSummaryReady" class="text-foreground text-sm font-medium leading-6">{{ smallOrder.toFixed(2) }} Lei</span>
          <UiSkeleton v-else class="h-4 w-20" />
        </div>
      </div>
      <UiDialog v-model:open="showSmallOrderModal">
        <UiDialogContent class="max-w-[calc(100vw-32px)] sm:max-w-md">
          <UiDialogHeader>
            <UiDialogTitle>Small Order Handling Charge</UiDialogTitle>
            <UiDialogDescription>The handling charge is based on your reviewed merchandise subtotal, excluding VAT.</UiDialogDescription>
          </UiDialogHeader>
          <OrderSummarySmallOrderModal v-if="quote?.smallOrderTier" :tier="quote.smallOrderTier" />
        </UiDialogContent>
      </UiDialog>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-col gap-1">
          <div v-if="shipping" class="flex flex-row gap-2 items-center">
            <span class="text-muted-foreground text-sm font-normal leading-6">Shipping</span>
            <UiButton variant="ghost" size="icon">
              <InformationIcon />
            </UiButton>
          </div>
          <span v-if="shipping" class="text-foreground italic text-sm font-normal leading-6">{{ shippingText }}</span>
        </div>
        <div v-if="shipping" class="flex flex-col justify-end">
          <span v-if="isSummaryReady" class="text-foreground text-sm font-medium leading-6">{{ formattedShippingPrice }}</span>
          <UiSkeleton v-else class="h-4 w-20" />
        </div>
      </div>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-row">
          <span class="text-muted-foreground text-sm font-normal leading-6">Tax:</span>
          <UiButton variant="ghost" size="icon" class="ml-2">
            <InformationIcon />
          </UiButton>
          <span class="text-foreground text-sm font-normal leading-6 ml-6">(VAT {{ vatPercent }}%)</span>
        </div>
        <span v-if="isSummaryReady" class="text-foreground text-sm font-medium leading-6">{{ calculatedVAT }} Lei</span>
        <UiSkeleton v-else class="h-4 w-20" />
      </div>
      <div class="w-full h-[1px] bg-accent rounded-lg" />
      <div class="flex flex-row justify-between w-full">
        <span class="text-foreground text-xl font-normal leading-9">Total</span>
        <span v-if="isSummaryReady" class="text-foreground text-2xl font-semibold leading-9">{{ calculatedTotal }} Lei</span>
        <UiSkeleton v-else class="h-8 w-24" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import OrderSummarySmallOrderModal from './SmallOrderModal.vue';
import InformationIcon from '~/assets/icons/information.svg';
import { toCheckoutMoneyView, type CheckoutQuote } from '~~/helpers/checkout-quote';
import type { CheckoutOrderDraft } from '~~/types';
import { useCartStore } from '~/store/cartStore';

const cartStore = useCartStore();
const { hasFetchedCart } = storeToRefs(cartStore);
// Wait for a completed cart fetch — client mount alone still races the async cart load.
const isSummaryReady = computed(() => hasFetchedCart.value && Boolean(props.quote));

const props = defineProps<{
  order: CheckoutOrderDraft;
  quote?: CheckoutQuote;
}>();

const showSmallOrderModal = ref(false);

const money = computed(() => (props.quote ? toCheckoutMoneyView(props.quote) : null));
const resolvedSubtotal = computed(() => money.value?.subtotal ?? 0);
const resolvedDiscount = computed(() => money.value?.discountAmount ?? 0);
const shipping = computed(() => props.order.deliveryMethod);
const smallOrder = computed(() => money.value?.smallOrderCharge ?? 0);
const calculatedVAT = computed(() => money.value?.vatAmount ?? 0);
const calculatedTotal = computed(() => money.value?.total ?? 0);
const vatPercent = computed(() => Math.round((money.value?.vatRate ?? 0) * 100));

const shippingText = computed(() => {
  if (!shipping.value) return '';

  return `${shipping.value.service.courierName} (${shipping.value.service.courierName})`;
});
const formattedShippingPrice = computed(() => `${(money.value?.shippingCost ?? 0).toFixed(2)} Lei`);
</script>
