<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ArrowLeft, LayoutDashboard, PackageOpenIcon, ShoppingCart, TruckIcon, Undo2Icon } from 'lucide-vue-next';

import moment from 'moment';
import { storeToRefs } from 'pinia';
import { useNuxtApp, useRoute } from '#app';
import { OrderType } from '~/types';
import type {
  OrderInterface,
  OrderNotesInterface,
  OrderRequestInterface,
  OrderRequestInterfaceResponse,
  PaymentInfo,
  PaymentSummaryInterface,
} from '~/types';
import { paymentInfoHelper } from '~/helpers/payment-info.helper';

import { useAuthStore } from '~/store/authStore';
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';
import { toast } from '~/components/ui/toast';
import { orderType } from '~/components/admin-table/order/options';
import { downloadDocument as downloadDocumentApi } from '~/composables/api/documents';

const authStore = useAuthStore();
const { getUserDetails, userCards } = storeToRefs(authStore);

const { $api } = useNuxtApp();

const route = useRoute();
const isNew = route.query.new === 'true';

const orderTypeValue = ref<OrderType | null>(null);
const customerDetails = ref({
  title: 'Customer Details',
  name: '',
  email: '',
  phone: '',
});
const date = ref<string>('' as string);
const orderPaySum = ref<PaymentSummaryInterface>({} as PaymentSummaryInterface);
const paymentMethod = ref<PaymentInfo>();
const paymentMethodRecord = computed(() => paymentMethod.value as Record<string, unknown> | undefined);
const addresses = ref<{
  shippingAddress: {
    name1: string;
    name2: string;
    postcode: string;
    country: string;
    default: boolean;
  };
  billingAddress: {
    name1: string;
    name2: string;
    postcode: string;
    country: string;
  };
}>();

const notes = ref<OrderNotesInterface[] | []>([] as OrderNotesInterface[] | []);
const data = ref<OrderRequestInterfaceResponse>({} as OrderRequestInterfaceResponse);
const shippingMethod = computed(() => data.value.data?.order.shippingDetails.stockorderShippingType);

const hasMixedItems = computed(() => {
  const stockIds = new Set(stockOrderItems.value.map((item) => item.id));

  return backorderItems.value.some((item) => stockIds.has(item.id));
});

// eslint-disable-next-line vue/return-in-computed-property
const paymentSummary = computed(() => {
  const shippingType = data.value.data?.order.shippingDetails.stockorderShippingType;
  const orderInfo = data.value.data?.order;

  if (orderInfo) {
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.orderTotal = orderInfo.total;
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.subtotal = Number(orderInfo.subtotal);
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.taxPercentage = 19;
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.taxAmount = 0.19 * (orderPaySum.value.subtotal || 0);
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.discountPercentage = orderInfo.discount?.value || 0;
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.discountAmount = orderPaySum.value.discountPercentage * (orderPaySum.value.subtotal || 0);
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.handlingCharge = 0;
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.shippingCost = orderInfo.shippingCost || 0;
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.shippingText = shippingType?.service.courierName || '';
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.orderType = orderInfo.type;
    // eslint-disable-next-line vue/no-side-effects-in-computed-properties
    orderPaySum.value.smallOrderCharge = orderInfo.smallOrderCost || 0;

    if (data.value.data?.children?.length > 0) {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      orderPaySum.value.stockItemsTotal = data.value.data.children.find((child) => child.type === OrderType.Stock)?.total;
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      orderPaySum.value.backorderItemsTotal = data.value.data.children.find((child) => child.type === OrderType.Back)?.total;
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      orderPaySum.value.payableNow = orderPaySum.value.stockItemsTotal;
    }

    return true;
  }
});

const stockOrderItems = ref<CartProductsInterface[]>([] as CartProductsInterface[]);
const backorderItems = ref<CartProductsInterface[]>([] as CartProductsInterface[]);

const stockOrder = ref<OrderRequestInterface>({} as OrderRequestInterface);
const backOrder = ref<OrderRequestInterface>({} as OrderRequestInterface);

const getOrderInformation = async () => {
  const orderId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const response = (await $api.orders.getOrderById(orderId)) as OrderRequestInterfaceResponse;

  if (response.status === 'success' && response.data.order) {
    data.value = response;
    orderTypeValue.value = response.data.order.type;
    stockOrder.value = (
      response.data.order.type === OrderType.Mixed
        ? response.data.children.find((child) => child.type === OrderType.Stock) ?? response.data.order
        : response.data.order
    ) as OrderRequestInterface;

    stockOrderItems.value = stockOrder.value.products || [];
    backOrder.value = (
      response.data.order.type === OrderType.Mixed
        ? response.data.children.find((child) => child.type === OrderType.Back) ?? response.data.order
        : response.data.order
    ) as OrderRequestInterface;
    backorderItems.value = backOrder.value.products || [];

    if (response.data.order.notes) {
      notes.value = response.data.order.notes || [];
    }

    if (orderTypeValue.value === OrderType.Mixed) {
      const mixedPayment = paymentInfoHelper(stockOrder.value as unknown as OrderInterface, getUserDetails.value, userCards.value || []);
      if (mixedPayment) {
        paymentMethod.value = mixedPayment;
      }
    } else {
      const orderPayment = paymentInfoHelper(response.data.order, getUserDetails.value, userCards.value || []);
      if (orderPayment) {
        paymentMethod.value = orderPayment;
      }
    }

    addresses.value = {
      shippingAddress: {
        name1: response.data.order.shippingDetails.address.name1,
        name2: response.data.order.shippingDetails.address.name2 ? response.data.order.shippingDetails.address.name2 : '',
        postcode: response.data.order.shippingDetails.address.postcode,
        country: response.data.order.shippingDetails.address.country,
        default: response.data.order.shippingDetails.address.default || false,
      },
      billingAddress: {
        name1: response.data.order.shippingDetails.billingAddress.name1,
        name2: response.data.order.shippingDetails.billingAddress.name2 ? response.data.order.shippingDetails.billingAddress.name2 : '',
        postcode: response.data.order.shippingDetails.billingAddress.postcode,
        country: response.data.order.shippingDetails.billingAddress.country,
      },
    };
    customerDetails.value = {
      title: 'Customer Details',
      name: `${response?.data?.order.user.contactDetails?.firstName} ${response?.data?.order.user.contactDetails?.lastName}`,
      email: response?.data?.order.user.contactDetails.email,
      phone: response?.data?.order.shippingDetails.phone,
    };
    date.value = moment(response.data.order.createdAt).format('DD MMMM YYYY, HH:mm');
  }
};

const downloadDocument = async () => {
  if (!stockOrder.value.paymentDetails?.invoiceId) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Invoice is not available for the moment',
    });
    return;
  }
  const result = await downloadDocumentApi(stockOrder.value.paymentDetails.invoiceId);

  if (!result) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to download document',
    });
  }
};

const getOrderTypeValueByOrder = () => {
  return orderType.find((type) => type.value === orderTypeValue.value) || orderType[0];
};

onMounted(() => {
  getOrderInformation();
});
</script>

<template>
  <div class="container flex flex-col gap-6 p-4 transition-all duration-300 py-6 lg:px-6">
    <OrderConfirmThankYou
      v-if="isNew"
      :order-id="data.data?.order?.shortId"
      :email="customerDetails.email"
      :shipping-method="shippingMethod?.service?.courierName"
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
        :order-id="data.data?.order?.shortId"
        :order-type="getOrderTypeValueByOrder()"
        :date="date"
        :shipping-method="shippingMethod?.service?.courierName"
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
      <OrderConfirmStackItems
        v-if="stockOrder && (orderTypeValue === OrderType.Stock || orderTypeValue === OrderType.Mixed)"
        :data="stockOrder"
        :order-type="orderTypeValue"
      />
      <OrderConfirmBackItems
        v-if="backOrder && (orderTypeValue === OrderType.Back || orderTypeValue === OrderType.Mixed)"
        :data="backOrder"
        :order-type="orderTypeValue"
      />
      <section class="flex flex-col lg:flex-row gap-9">
        <div class="flex flex-col order-3 lg:order-1 w-full self-stretch text-sm leading-6 text-neutral-700">
          <h2 class="w-full font-semibold max-md:max-w-full">Customer Notes</h2>
          <textarea
            disabled
            :placeholder="notes[0] && notes[0].message ? notes[0].message : 'No message provided'"
            class="min-h-[204px] justify-center px-3 pt-3 pb-16 mt-4 rounded-lg border border-solid bg-light-100 border-grey-300 max-md:pb-10 max-md:max-w-full"
          />
        </div>
        <OrderConfirmPaySummary v-if="paymentSummary" :order-pay-sum="orderPaySum" />
      </section>
      <div v-if="getUserDetails?.role === 2" class="flex flex-wrap md:flex-nowrap justify-between gap-12 md:gap-2">
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

<style scoped></style>
