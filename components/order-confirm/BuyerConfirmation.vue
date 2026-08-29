<script setup lang="ts">
import { ArrowLeft, LayoutDashboard, PackageOpenIcon, ShoppingCart, TruckIcon, Undo2Icon } from '@lucide/vue';
import { computed, onMounted, watch } from 'vue';
import { normalizeOrderConfirmationOrderId, useOrderConfirmation } from '~/composables/useOrderConfirmation';

interface BuyerConfirmationRouteProps {
  orderId?: string | string[];
  isNew?: boolean;
}

const props = withDefaults(defineProps<BuyerConfirmationRouteProps>(), {
  orderId: '',
  isNew: false,
});

const normalizedOrderId = computed(() => normalizeOrderConfirmationOrderId(props.orderId));
const {
  orderResponse,
  stockOrder,
  backOrder,
  customerDetails,
  addresses,
  notes,
  date,
  shippingMethod,
  hasMixedItems,
  paymentSummary,
  paymentMethod,
  paymentMethodRecord,
  showCompanyDetails,
  showStockOrder,
  showBackOrder,
  resolvedOrderTypeValue,
  getOrderTypeValueByOrder,
  loadOrderConfirmation,
  downloadDocument,
} = useOrderConfirmation(normalizedOrderId);

const shippingMethodLabel = computed(() => shippingMethod.value?.service?.courierName);

watch(normalizedOrderId, () => {
  void loadOrderConfirmation();
});

onMounted(() => {
  void loadOrderConfirmation();
});
</script>

<template>
  <div class="container flex flex-col gap-6 p-4 transition-all duration-300 py-6 lg:px-6">
    <OrderConfirmThankYou
      v-if="props.isNew"
      :order-id="orderResponse.data?.order?.shortId || ''"
      :email="customerDetails.email"
      :shipping-method="shippingMethodLabel || ''"
      :pickup-date="stockOrder?.shippingDetails?.statusTracking?.estimatedPickUpDate"
    />
    <section class="w-full flex justify-between">
      <NuxtLink v-if="false" class="w-fit" to="/dashboard/client?tab=orders">
        <UiButton class="gap-2" variant="secondary">
          <ArrowLeft class="w-4 h-4 stroke-2" />
          Back
        </UiButton>
      </NuxtLink>
      <NuxtLink v-if="true" to="/">
        <UiButton class="gap-2">
          <ShoppingCart class="w-4 h-4 stroke-2" />
          Continue Shopping
        </UiButton>
      </NuxtLink>
      <NuxtLink to="/dashboard/client?tab=home">
        <UiButton class="gap-2" variant="secondary">
          <LayoutDashboard class="w-4 h-4 stroke-2" />
          Dashboard
        </UiButton>
      </NuxtLink>
    </section>
    <section class="px-4 py-6 md:p-6 flex flex-col gap-10 font-Poppins shadow-s rounded-xl">
      <OrderConfirmHeader
        :order-id="orderResponse.data?.order?.shortId || ''"
        :order-type="getOrderTypeValueByOrder() ?? { value: resolvedOrderTypeValue, label: 'Unknown', badge: { bg: '', text: '' } }"
        :date="date"
        :shipping-method="shippingMethodLabel || ''"
        :pickup-date="stockOrder?.shippingDetails?.statusTracking?.estimatedPickUpDate"
        :payment-method="paymentMethodRecord"
        :on-download-document="downloadDocument"
      />
      <OrderConfirmDetails
        v-if="paymentMethod"
        :customer-details="customerDetails"
        :payment-method="paymentMethod"
        :has-mixed-items="hasMixedItems"
      />
      <UiSeparator class="bg-grey-100" />
      <OrderConfirmAddress v-if="addresses" :shipping-address="addresses.shippingAddress" :billing-address="addresses.billingAddress" />
      <OrderConfirmStackItems v-if="stockOrder && showStockOrder" :data="stockOrder" :order-type="resolvedOrderTypeValue" />
      <OrderConfirmBackItems v-if="backOrder && showBackOrder" :data="backOrder" :order-type="resolvedOrderTypeValue" />
      <section class="flex flex-col lg:flex-row gap-9">
        <div class="flex flex-col order-3 lg:order-1 w-full self-stretch text-sm leading-6 text-neutral-700">
          <h2 class="w-full font-semibold max-md:max-w-full">Customer Notes</h2>
          <textarea
            disabled
            :placeholder="notes[0] && notes[0].message ? notes[0].message : 'No message provided'"
            class="min-h-[204px] justify-center px-3 pt-3 pb-16 mt-4 rounded-lg border border-solid bg-light-100 border-grey-300 max-md:pb-10 max-md:max-w-full"
          />
        </div>
        <OrderConfirmPaySummary v-if="paymentSummary" :order-pay-sum="paymentSummary" />
      </section>
      <div v-if="showCompanyDetails" class="flex flex-wrap md:flex-nowrap justify-between gap-12 md:gap-2">
        <OrderConfirmCompanyDetails />
        <OrderConfirmBankDetails />
      </div>
      <UiSeparator class="bg-grey-100" />
      <div v-if="paymentSummary" class="flex flex-col gap-6">
        <h4 class="font-semibold text-sm">Need Help?</h4>
        <section class="flex gap-6 flex-wrap">
          <UiButton size="xs" class="gap-2 px-0" variant="link">
            <TruckIcon class="w-5 h-5 stroke-1.5" />
            Delivery Info
          </UiButton>
          <UiButton size="xs" class="gap-2 px-0" variant="link">
            <Undo2Icon class="w-5 h-5 stroke-1.5" />
            Returns
          </UiButton>
          <UiButton size="xs" class="gap-2 px-0" variant="link">
            <PackageOpenIcon class="w-5 h-5 stroke-1.5" />
            Order Issues
          </UiButton>
        </section>
      </div>
    </section>
  </div>
</template>
