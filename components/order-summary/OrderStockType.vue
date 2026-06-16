<template>
  <div class="flex flex-col p-4 xl:p-6 rounded-xl bg-white items-start shadow-xs gap-4 mb-6 h-fit">
    <div
      v-if="stockOrder || backOrder"
      class="flex flex-col gap-6"
    >
      <h2 class="text-neutral-500 text-base font-medium leading-6">
        Order Type
      </h2>
      <div class="flex flex-row gap-3">
        <div
          v-if="stockOrder && backOrder"
          class="px-3 py-[3px] justify-center flex rounded bg-blue-50"
        >
          <span class="text-blue-500 text-sm font-medium leading-5">Mixed Order</span>
        </div>
        <template v-else>
          <div
            v-if="stockOrder"
            class="px-3 py-[3px] justify-center flex rounded bg-green-50"
          >
            <span class="text-green-500 text-sm font-medium leading-5">Stock Order</span>
          </div>
          <div
            v-if="backOrder"
            class="px-3 py-[3px] justify-center flex rounded bg-orange-50"
          >
            <span class="text-orange-500 text-sm font-medium leading-5">Back Order</span>
          </div>
        </template>
      </div>
    </div>
    <div class="gap-2 flex flex-col w-full">
      <div class="h-[1px] rounded-lg bg-neutral-100 block" />
      <div class="flex flex-col">
        <button
          class="flex flex-row justify-between py-2 group header-transition"
          @click="expandShippingAndBilling"
        >
          <span
            class="text-base font-medium leading-6 transition duration-300 group-hover:text-blue-500"
            :class="shippingAndBillingExpanded ? 'text-blue-500' : 'text-neutral-700'"
          >Shipping and Billing</span>
          <div class="flex flex-row gap-6">
            <div
              v-if="shippingAndBillingMissingInfoWarning"
              class="flex flex-row gap-2 items-center"
            >
              <DemoTooltip
                theme="black"
                position="top"
                class="flex sm:hidden lg:flex"
              >
                <WarningErrorYellow />
                <template #content>
                  <span class="capitalize">Missing Info</span>
                </template>
              </DemoTooltip>
              <WarningErrorYellow class="hidden sm:flex lg:hidden" />
              <span class="text-slate-500 text-xs font-medium leading-4 hidden sm:flex lg:hidden">Missing Info</span>
            </div>
            <ChevronDownIcon
              class="w-5 h-5 flex-shrink-0 rounded-full transition duration-300 flex"
              :class="[shippingAndBillingExpanded ? 'rotate-180 text-blue-500' : 'text-slate-500']"
            />
          </div>
        </button>
        <Transition name="expand">
          <OrderSummaryShippingAndBillingSection
            v-if="shippingAndBillingExpanded"
            :order="order"
            class="item"
          />
        </Transition>
      </div>
      <div class="h-[1px] rounded-lg bg-neutral-100 block" />
      <div class="flex flex-col">
        <button
          class="flex flex-row justify-between py-2 group"
          @click="expandShippingPreferences"
        >
          <span
            class="text-base font-medium leading-6 transition duration-300 group-hover:text-blue-500"
            :class="shippingPreferencesExpanded ? 'text-blue-500' : 'text-neutral-700'"
          >Shipping Preferences</span>
          <div class="flex flex-row gap-6">
            <div
              v-if="!shippingPreferencesExpanded && ((mixedOrBackOrder && !order.backorderOption) || !order.deliveryMethod)"
              class="flex flex-row gap-2 items-center"
            >
              <DemoTooltip
                theme="black"
                position="top"
                class="flex sm:hidden lg:flex"
              >
                <WarningErrorHuge />
                <template #content>
                  <span class="capitalize">Mandatory</span>
                </template>
              </DemoTooltip>
              <WarningErrorHuge class="hidden sm:flex lg:hidden" />
              <span class="text-slate-500 text-xs font-medium leading-4 hidden sm:flex lg:hidden">Mandatory</span>
            </div>
            <ChevronDownIcon
              class="w-5 h-5 flex-shrink-0 rounded-full transition duration-300 flex"
              :class="[shippingPreferencesExpanded ? 'rotate-180 text-blue-500' : 'text-slate-500']"
            />
          </div>
        </button>
        <Transition name="expand">
          <OrderSummaryShippingPreferencesSection
            v-if="shippingPreferencesExpanded"
            :order="order"
            class="item"
            :general-settings="generalSettings"
            :shipping-preferences="shippingPreferences"
            @select-backorder-preference="selectBackorderPreference"
          />
        </Transition>
      </div>
      <div class="h-[1px] rounded-lg bg-neutral-100 block" />
      <button
        class="flex flex-row justify-between py-2 group"
        @click="expandPaymentMethod"
      >
        <span
          class="text-base font-medium leading-6 transition duration-300 group-hover:text-blue-500"
          :class="paymentMethodExpanded ? 'text-blue-500' : 'text-neutral-700'"
        >Payment Method</span>
        <div class="flex flex-row gap-6">
          <div
            v-if="paymentMethodWarning"
            class="flex flex-row gap-2 items-center"
          >
            <DemoTooltip
              theme="black"
              position="top"
              class="flex sm:hidden lg:flex"
            >
              <WarningErrorHuge />
              <template #content>
                <span class="capitalize">Mandatory</span>
              </template>
            </DemoTooltip>
            <WarningErrorHuge class="hidden sm:flex lg:hidden" />
            <span class="text-slate-500 text-xs font-medium leading-4 hidden sm:flex lg:hidden">Mandatory</span>
          </div>
          <ChevronDownIcon
            class="w-5 h-5 flex-shrink-0 rounded-full transition duration-300 flex"
            :class="[paymentMethodExpanded ? 'rotate-180 text-blue-500' : 'text-slate-500']"
          />
        </div>
      </button>
      <Transition name="expand">
        <OrderSummaryPaymentMethodSection
          v-if="paymentMethodExpanded"
          :order="order"
          :account-credit="accountCredit"
          class="item"
          @update-payment-details="emits('update-payment-details', $event)"
        />
      </Transition>
      <AppModal
        v-if="!config.public.MOCK_MODE"
        v-model="showCardsModal"
        side="right"
      >
        <OrderSummaryPaymentModal :order="order" />
      </AppModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRuntimeConfig } from '#app';
import { OrderType, type CheckoutOrderDraft } from '~/types';
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';
import ChevronDownIcon from '@/assets/icons/dashboard/chevron-down.svg';
import WarningErrorYellow from '@/assets/icons/warning-error-yellow.svg';
import WarningErrorHuge from '@/assets/icons/warning-error-huge.svg';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import type { BackorderShippingTypesInterface } from '~/types/general-settings/general-settings';
import { useAuthStore } from '~/store/authStore';
import { usePaymentStore } from '~/store/paymentStore';
import { useCartStore } from '~/store/cartStore';
import type { ShippingOrderPricingResponse } from '~/types/order-summary/shipping-services';

const props = defineProps<{
  items: CartProductsInterface[];
  accountCredit: CustomerCreditInterface;
  order: CheckoutOrderDraft;
  shippingPreferences: ShippingOrderPricingResponse | null;
}>();

const emits = defineEmits(['update-payment-details']);
const config = useRuntimeConfig();

const shippingAndBillingExpanded = ref(false);
const shippingPreferencesExpanded = ref(false);
const paymentMethodExpanded = ref(false);

const generalSettings = useAuthStore().generalSettings;

const cartStore = useCartStore();

const stockOrder = computed(() => {
  return (
    (cartStore.cart?.products?.filter((item: CartProductsInterface) => item.productEntity?.stock !== undefined && item.stock > 0)
      .length ?? 0) > 0
  );
});

const backOrder = computed(() => {
  return (
    (cartStore.cart?.products?.filter((item: CartProductsInterface) => {
      return item.productEntity?.stock !== undefined && (item.backorder_stock ?? 0) > 0;
    }).length ?? 0) > 0
  );
});

const orderType = computed((): OrderType => {
  if (stockOrder.value && backOrder.value) {
    Emitter.emit('order-type', OrderType.Mixed);
    return OrderType.Mixed;
  }
  if (stockOrder.value) {
    Emitter.emit('order-type', OrderType.Stock);
    return OrderType.Stock;
  }
  Emitter.emit('order-type', OrderType.Back);
  return OrderType.Back;
});

// eslint-disable-next-line vue/return-in-computed-property
const shippingAndBillingMissingInfoWarning = computed(() => {
  if (props.order.shippingDetails?.address && props.order.shippingDetails?.billingAddress) {
    return (
      !props.order.shippingDetails.address.name1
      || !props.order.shippingDetails.address.city
      || !props.order.shippingDetails.address.region
      || !props.order.shippingDetails.address.postcode
      || !props.order.shippingDetails.address.country
      || !props.order.shippingDetails.billingAddress.name1
      || !props.order.shippingDetails.billingAddress.city
      || !props.order.shippingDetails.billingAddress.region
      || !props.order.shippingDetails.billingAddress.postcode
      || !props.order.shippingDetails.billingAddress.country
    );
  }
});

const mixedOrBackOrder = computed(() => props.order.type === OrderType.Back || props.order.type === OrderType.Mixed);

const paymentMethodWarning = computed(() => {
  const paymentDetails = props.order.paymentDetails;
  return !paymentDetails || paymentDetails.type == null;
});

watch(orderType, () => {
  // eslint-disable-next-line vue/no-mutating-props
  props.order.type = orderType.value;
});

onMounted(() => {
  // eslint-disable-next-line vue/no-mutating-props
  props.order.type = orderType.value;
  if (config.public.MOCK_MODE) {
    showCardsModal.value = false;
  }
});

onBeforeUnmount(() => {
  // Cleanup logic, if needed
});

function expandShippingAndBilling() {
  shippingAndBillingExpanded.value = !shippingAndBillingExpanded.value;
}

function expandShippingPreferences() {
  shippingPreferencesExpanded.value = !shippingPreferencesExpanded.value;
}

function expandPaymentMethod() {
  paymentMethodExpanded.value = !paymentMethodExpanded.value;
}

function selectBackorderPreference(option: BackorderShippingTypesInterface) {
  // eslint-disable-next-line vue/no-mutating-props
  props.order.backorderOption = option;
}

const paymentStore = usePaymentStore();
const { showCardsModal } = storeToRefs(paymentStore);
</script>

<style scoped>
.expand-enter-from,
.expand-leave-to {
    opacity: 0.5;
    max-height: 0;
    overflow: hidden;
}

.expand-enter-to,
.expand-leave-from {
    opacity: 1;
    max-height: 1000px;
    /* Adjust this value as needed */
}

.expand-enter-active,
.expand-leave-active {
    transition: max-height 0.5s cubic-bezier(0, 0.3, 0.6, 1), opacity 0.5s ease;
}

.item {
    transform-origin: top;
}

.header-transition {
    transition-property: box-shadow, border-radius, opacity;
    transition-timing-function: cubic-bezier(0, 0.3, 0.6, 1);
    transition-duration: 150ms;
}
</style>
