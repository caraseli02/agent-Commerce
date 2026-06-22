<template>
  <div class="p-4 xl:p-6 flex flex-col gap-4 bg-white rounded-xl shadow-xs mb-9">
    <div class="flex flex-row w-full">
      <span class="text-neutral-700 text-base font-medium leading-6">Payment Summary</span>
    </div>
    <div class="flex flex-col gap-2 relative">
      <div class="flex flex-row justify-between w-full">
        <span class="text-slate-500 text-sm font-normal leading-6">Subtotal</span>
        <span class="text-neutral-700 text-sm font-medium leading-6">{{ cartSubtotal.toFixed(2) }} Lei</span>
      </div>
      <div class="flex flex-row justify-between w-full">
        <div class="flex flex-row gap-6">
          <span class="text-slate-500 text-sm font-normal leading-6">Discount</span>
        </div>
        <span class="text-neutral-700 text-sm font-medium leading-6">{{ itemsDiscount?.toFixed(2) }} Lei</span>
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
          <span class="text-neutral-700 text-sm font-medium leading-6">{{ smallOrder }} Lei</span>
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
          <span class="text-neutral-700 text-sm font-medium leading-6">{{ formattedShippingPrice }}</span>
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
        <span class="text-neutral-700 text-sm font-medium leading-6">{{ calculatedVAT }} Lei</span>
      </div>
      <div class="w-full h-[1px] bg-light-500 rounded-lg" />
      <div class="flex flex-row justify-between w-full">
        <span class="text-neutral-700 text-xl font-normal leading-9">Total</span>
        <span class="text-neutral-700 text-2xl font-semibold leading-9">{{ calculatedTotal }} Lei</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import OrderSummarySmallOrderModal from './SmallOrderModal.vue';
import InformationIcon from '~/assets/icons/information.svg';
import type { CheckoutOrderDraft } from '~/types';
import type { GeneralSettingsInterface } from '~/types/general-settings/general-settings';
import { useCartStore } from '~/store/cartStore';

const cartStore = useCartStore();
const { cartSubtotal, itemsDiscount } = storeToRefs(cartStore);

const props = defineProps<{
  order: CheckoutOrderDraft;
  generalSettings: GeneralSettingsInterface | null;
}>();

const showSmallOrderModal = ref(false);

const smallOrder = computed(() => {
  let smallOrderFee = 0;
  props.generalSettings?.orderSettings?.smallOrderCharge?.forEach((charge) => {
    if (Number(cartSubtotal.value) < charge.max && Number(cartSubtotal.value) >= charge.min) {
      smallOrderFee = charge.price;
      // eslint-disable-next-line vue/no-mutating-props
      props.order.smallOrder = charge;
    }
  });

  return smallOrderFee;
});

const calculatedVAT = computed(() => parseFloat((cartSubtotal.value * 0.19).toFixed(2)));
const calculatedTotal = computed(() => {
  const subtotal = Number(cartSubtotal.value || 0);
  const VAT = calculatedVAT.value;
  const shippingFee = shipping.value?.price.total || 0;
  const discount = itemsDiscount.value || 0;
  return parseFloat((subtotal + VAT + shippingFee + smallOrder.value - discount).toFixed(2));
});

const shipping = computed(() => props.order.deliveryMethod);
const shippingText = computed(() => {
  if (!shipping.value) return '';

  return `${shipping.value.service.courierName} (${shipping.value.service.courierName})`;
});
const formattedShippingPrice = computed(() => `${shipping.value?.price.total.toFixed(2)} Lei`);
</script>
