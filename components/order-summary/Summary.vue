<template>
  <div class="p-4 xl:p-6 flex flex-col gap-4 bg-white rounded-xl shadow-xs mb-9">
    <div class="flex flex-row w-full">
      <span class="text-neutral-700 text-base font-medium leading-6">Payment Summary</span>
    </div>
    <div class="flex flex-col gap-2 relative">
      <div class="flex flex-row justify-between w-full">
        <span class="text-slate-500 text-sm font-normal leading-6">Subtotal</span>
        <span v-if="isSummaryReady" class="text-neutral-700 text-sm font-medium leading-6">{{ resolvedSubtotal.toFixed(2) }} Lei</span>
        <UiSkeleton v-else class="h-4 w-20" />
      </div>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-row gap-6">
          <span class="text-slate-500 text-sm font-normal leading-6">Discount</span>
        </div>
        <span v-if="isSummaryReady" class="text-neutral-700 text-sm font-medium leading-6">{{ resolvedDiscount.toFixed(2) }} Lei</span>
        <UiSkeleton v-else class="h-4 w-20" />
      </div>
      <div v-if="smallOrder" class="flex flex-row justify-between w-full">
        <div class="flex flex-col gap-1">
          <div class="flex flex-row gap-2 items-center">
            <span class="text-slate-500 text-sm font-normal leading-6">Handling Charge</span>
            <button class="group" @click="showSmallOrderModal = true">
              <InformationIcon class="text-slate-500 group-hover:text-blue-500 transition duration-300" />
            </button>
          </div>
          <span class="text-neutral-700 italic text-sm font-normal leading-6">Small order charge</span>
        </div>
        <div class="flex flex-col justify-end">
          <span v-if="isSummaryReady" class="text-neutral-700 text-sm font-medium leading-6">{{ smallOrder }} Lei</span>
          <UiSkeleton v-else class="h-4 w-20" />
        </div>
      </div>
      <Transition name="fade-bottom">
        <div v-if="showSmallOrderModal" v-click-outside="() => (showSmallOrderModal = false)" class="absolute bottom-[200px] left-0">
          <OrderSummarySmallOrderModal />
        </div>
      </Transition>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-col gap-1">
          <div v-if="shipping" class="flex flex-row gap-2 items-center">
            <span class="text-slate-500 text-sm font-normal leading-6">Shipping</span>
            <button class="group">
              <InformationIcon class="text-slate-500 group-hover:text-blue-500 transition duration-300" />
            </button>
          </div>
          <span v-if="shipping" class="text-neutral-700 italic text-sm font-normal leading-6">{{ shippingText }}</span>
        </div>
        <div v-if="shipping" class="flex flex-col justify-end">
          <span v-if="isSummaryReady" class="text-neutral-700 text-sm font-medium leading-6">{{ formattedShippingPrice }}</span>
          <UiSkeleton v-else class="h-4 w-20" />
        </div>
      </div>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-row">
          <span class="text-slate-500 text-sm font-normal leading-6">Tax:</span>
          <button class="group ml-2">
            <InformationIcon class="text-slate-500 group-hover:text-blue-500 transition duration-300" />
          </button>
          <span class="text-neutral-700 text-sm font-normal leading-6 ml-6">(VAT 19%)</span>
        </div>
        <span v-if="isSummaryReady" class="text-neutral-700 text-sm font-medium leading-6">{{ calculatedVAT }} Lei</span>
        <UiSkeleton v-else class="h-4 w-20" />
      </div>
      <div class="w-full h-[1px] bg-light-500 rounded-lg" />
      <div class="flex flex-row justify-between w-full">
        <span class="text-neutral-700 text-xl font-normal leading-9">Total</span>
        <span v-if="isSummaryReady" class="text-neutral-700 text-2xl font-semibold leading-9">{{ calculatedTotal }} Lei</span>
        <UiSkeleton v-else class="h-8 w-24" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import OrderSummarySmallOrderModal from './SmallOrderModal.vue';
import InformationIcon from '~/assets/icons/information.svg';
import { calculateOrderMoney } from '~/helpers/order-money';
import type { CheckoutOrderDraft } from '~/types';
import type { GeneralSettingsInterface, SmallOrderChargeInterface } from '~/types/general-settings/general-settings';
import { useCartStore } from '~/store/cartStore';

const cartStore = useCartStore();
const { getCartSubtotal, itemsDiscount, hasFetchedCart } = storeToRefs(cartStore);
// Wait for a completed cart fetch — client mount alone still races the async cart load.
const isSummaryReady = computed(() => hasFetchedCart.value);

const props = defineProps<{
  order: CheckoutOrderDraft;
  generalSettings: GeneralSettingsInterface | null;
}>();

const emit = defineEmits<{
  'update:smallOrder': [value: SmallOrderChargeInterface | null];
}>();

const showSmallOrderModal = ref(false);

const resolvedSubtotal = computed(() => Number(props.order.subtotal || getCartSubtotal.value || 0));
const resolvedDiscount = computed(() => Number(props.order.discount?.total || itemsDiscount.value || 0));
const shipping = computed(() => props.order.deliveryMethod);

const orderMoney = computed(() =>
  calculateOrderMoney({
    subtotal: resolvedSubtotal.value,
    discountAmount: resolvedDiscount.value,
    shippingCost: shipping.value?.price.total || 0,
    smallOrderTiers: props.generalSettings?.orderSettings?.smallOrderCharge,
  }),
);

watch(
  () => orderMoney.value.matchedSmallOrderTier,
  (tier) => {
    emit('update:smallOrder', tier?._id ? (tier as SmallOrderChargeInterface) : null);
  },
  { immediate: true },
);

const smallOrder = computed(() => orderMoney.value.smallOrderCharge);
const calculatedVAT = computed(() => orderMoney.value.vatAmount);
const calculatedTotal = computed(() => orderMoney.value.grandTotal);

const shippingText = computed(() => {
  if (!shipping.value) return '';

  return `${shipping.value.service.courierName} (${shipping.value.service.courierName})`;
});
const formattedShippingPrice = computed(() => `${shipping.value?.price.total.toFixed(2)} Lei`);
</script>
