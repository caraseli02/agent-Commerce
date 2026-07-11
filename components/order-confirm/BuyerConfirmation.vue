<script lang="ts">
/* eslint-disable import/no-duplicates, import/first */
import { format } from 'date-fns';
import type { UserInterface } from '~/types/auth/user-interface';
import type { StripeCardInterface } from '~/types';
import { paymentInfoHelper } from '~/helpers/payment-info.helper';
import { OrderType } from '~/types';
import type {
  OrderInterface,
  OrderNotesInterface,
  OrderRequestInterface,
  OrderRequestInterfaceResponse,
  PaymentInfo,
  PaymentSummaryInterface,
} from '~/types';
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';

export interface BuyerConfirmationRouteProps {
  orderId?: string | string[];
  isNew?: boolean;
}

export interface BuyerConfirmationAddressSet {
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
}

export interface BuyerConfirmationState {
  orderTypeValue: OrderType | null;
  customerDetails: {
    title: string;
    name: string;
    email: string;
    phone: string;
  };
  date: string;
  orderPaySum: PaymentSummaryInterface | null;
  paymentMethod: PaymentInfo | null;
  paymentMethodRecord: Record<string, unknown> | undefined;
  addresses: BuyerConfirmationAddressSet | undefined;
  notes: OrderNotesInterface[];
  data: OrderRequestInterfaceResponse | null;
  shippingMethod: string | undefined;
  hasMixedItems: boolean;
  stockOrderItems: CartProductsInterface[];
  backorderItems: CartProductsInterface[];
  stockOrder: OrderRequestInterface | null;
  backOrder: OrderRequestInterface | null;
}

export const normalizeBuyerConfirmationOrderId = (orderId?: string | string[]) => {
  if (Array.isArray(orderId)) {
    return orderId[0] ?? '';
  }

  return orderId ?? '';
};

export const buildBuyerConfirmationPaymentSummary = (response: OrderRequestInterfaceResponse): PaymentSummaryInterface => {
  const orderInfo = response.data.order;
  const shippingType = orderInfo.shippingDetails.stockorderShippingType;
  const paymentSummary: PaymentSummaryInterface = {
    orderTotal: orderInfo.total,
    subtotal: Number(orderInfo.subtotal),
    taxPercentage: 19,
    taxAmount: 0.19 * Number(orderInfo.subtotal || 0),
    discountPercentage: orderInfo.discount?.value || 0,
    discountAmount: (orderInfo.discount?.value || 0) * Number(orderInfo.subtotal || 0),
    handlingCharge: 0,
    shippingCost: orderInfo.shippingCost || 0,
    shippingText: shippingType?.service.courierName || '',
    orderType: orderInfo.type,
    smallOrderCharge: orderInfo.smallOrderCost || 0,
  };

  if (response.data.children?.length > 0) {
    paymentSummary.stockItemsTotal = response.data.children.find((child) => child.type === OrderType.Stock)?.total;
    paymentSummary.backorderItemsTotal = response.data.children.find((child) => child.type === OrderType.Back)?.total;
    paymentSummary.payableNow = paymentSummary.stockItemsTotal;
  }

  return paymentSummary;
};

export const buildBuyerConfirmationState = (
  response: OrderRequestInterfaceResponse,
  userDetails: UserInterface,
  userCards: StripeCardInterface[]
): BuyerConfirmationState => {
  const order = response.data.order;
  const isMixedOrder = order.type === OrderType.Mixed;
  const stockOrder = (isMixedOrder ? response.data.children.find((child) => child.type === OrderType.Stock) ?? order : order) as OrderRequestInterface;
  const backOrder = (isMixedOrder ? response.data.children.find((child) => child.type === OrderType.Back) ?? order : order) as OrderRequestInterface;
  const stockOrderItems = stockOrder.products || [];
  const backorderItems = backOrder.products || [];
  const stockOrderIds = new Set(stockOrderItems.map((item) => item.id));
  const hasMixedItems = backorderItems.some((item) => stockOrderIds.has(item.id));
  const paymentMethod = paymentInfoHelper(isMixedOrder ? (stockOrder as unknown as OrderInterface) : order, userDetails, userCards || []) ?? null;

  return {
    orderTypeValue: order.type,
    customerDetails: {
      title: 'Customer Details',
      name: `${order.user.contactDetails?.firstName} ${order.user.contactDetails?.lastName}`,
      email: order.user.contactDetails.email,
      phone: order.shippingDetails.phone,
    },
    date: order.createdAt ? format(new Date(order.createdAt), 'dd MMMM yyyy, HH:mm') : '',
    orderPaySum: buildBuyerConfirmationPaymentSummary(response),
    paymentMethod: paymentMethod,
    paymentMethodRecord: paymentMethod ? (paymentMethod as unknown as Record<string, unknown>) : undefined,
    addresses: {
      shippingAddress: {
        name1: order.shippingDetails.address.name1,
        name2: order.shippingDetails.address.name2 ? order.shippingDetails.address.name2 : '',
        postcode: order.shippingDetails.address.postcode,
        country: order.shippingDetails.address.country,
        default: order.shippingDetails.address.default || false,
      },
      billingAddress: {
        name1: order.shippingDetails.billingAddress.name1,
        name2: order.shippingDetails.billingAddress.name2 ? order.shippingDetails.billingAddress.name2 : '',
        postcode: order.shippingDetails.billingAddress.postcode,
        country: order.shippingDetails.billingAddress.country,
      },
    },
    notes: order.notes || [],
    data: response,
    shippingMethod: order.shippingDetails.stockorderShippingType?.service.courierName,
    hasMixedItems,
    stockOrderItems,
    backorderItems,
    stockOrder,
    backOrder,
  };
};

export const downloadBuyerConfirmationDocument = async (
  stockOrder: OrderRequestInterface | OrderInterface | null,
  downloadDocument: (documentId: string) => Promise<unknown>,
  notify: (payload: {
    variant?: 'default' | 'destructive' | 'success' | 'warning' | null;
    title: string;
    description: string;
  }) => unknown
) => {
  const invoiceId = stockOrder?.paymentDetails?.invoiceId;

  if (!invoiceId) {
    notify({
      variant: 'destructive',
      title: 'Error',
      description: 'Invoice is not available for the moment',
    });
    return false;
  }

  try {
    const result = await downloadDocument(invoiceId);

    if (!result) {
      notify({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download document',
      });
      return false;
    }

    return true;
  } catch {
    notify({
      variant: 'destructive',
      title: 'Error',
      description: 'Failed to download document',
    });
    return false;
  }
};
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowLeft, LayoutDashboard, PackageOpenIcon, ShoppingCart, TruckIcon, Undo2Icon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { toast } from '~/components/ui/toast';
import { orderType } from '~/components/admin-table/order/options';
import { downloadDocument as downloadDocumentApi } from '~/composables/api/documents';
import { getOrderById } from '~/composables/api/orders';
import { useAuthStore } from '~/store/authStore';

const props = withDefaults(defineProps<BuyerConfirmationRouteProps>(), {
  orderId: '',
  isNew: false,
});

const authStore = useAuthStore();
const { getUserDetails, userCards } = storeToRefs(authStore);
const normalizedOrderId = computed(() => normalizeBuyerConfirmationOrderId(props.orderId));

const orderTypeValue = ref<OrderType | null>(null);
const customerDetails = ref({
  title: 'Customer Details',
  name: '',
  email: '',
  phone: '',
});
const date = ref('');
const orderPaySum = ref<PaymentSummaryInterface | null>(null);
const paymentMethod = ref<PaymentInfo | null>(null);
const paymentMethodRecord = computed(() =>
  paymentMethod.value ? ((paymentMethod.value as unknown) as Record<string, unknown>) : undefined
);
const addresses = ref<BuyerConfirmationAddressSet>();
const notes = ref<OrderNotesInterface[]>([]);
const data = ref<OrderRequestInterfaceResponse | null>(null);
const shippingMethod = computed(() => data.value?.data.order.shippingDetails.stockorderShippingType?.service.courierName);
const hasMixedItems = ref(false);
const stockOrderItems = ref<CartProductsInterface[]>([]);
const backorderItems = ref<CartProductsInterface[]>([]);
const stockOrder = ref<OrderRequestInterface | null>(null);
const backOrder = ref<OrderRequestInterface | null>(null);

const applyState = (state: BuyerConfirmationState) => {
  orderTypeValue.value = state.orderTypeValue;
  customerDetails.value = state.customerDetails;
  date.value = state.date;
  orderPaySum.value = state.orderPaySum;
  paymentMethod.value = state.paymentMethod;
  addresses.value = state.addresses;
  notes.value = state.notes;
  data.value = state.data;
  hasMixedItems.value = state.hasMixedItems;
  stockOrderItems.value = state.stockOrderItems;
  backorderItems.value = state.backorderItems;
  stockOrder.value = state.stockOrder;
  backOrder.value = state.backOrder;
};

const getOrderInformation = async () => {
  const orderId = normalizedOrderId.value;

  if (!orderId) {
    return;
  }

  const response = (await getOrderById(orderId)) as OrderRequestInterfaceResponse;

  if (response.status === 'success' && response.data.order) {
    applyState(buildBuyerConfirmationState(response, getUserDetails.value, userCards.value || []));
  }
};

const downloadDocument = async () => {
  await downloadBuyerConfirmationDocument(stockOrder.value, downloadDocumentApi, (payload) => toast(payload as never));
};

const getOrderTypeValueByOrder = () => {
  return orderType.find((typeOption) => typeOption.value === orderTypeValue.value) || orderType[0];
};

watch(normalizedOrderId, () => {
  void getOrderInformation();
}, { immediate: true });
</script>

<template>
  <div class="container flex flex-col gap-6 p-4 transition-all duration-300 py-6 lg:px-6">
    <OrderConfirmThankYou
      v-if="props.isNew"
      :order-id="data?.data?.order?.shortId || ''"
      :email="customerDetails.email"
      :shipping-method="shippingMethod || ''"
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
        :order-id="data?.data?.order?.shortId || ''"
        :order-type="getOrderTypeValueByOrder()"
        :date="date"
        :shipping-method="shippingMethod || ''"
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
        <OrderConfirmPaySummary v-if="orderPaySum" :order-pay-sum="orderPaySum" />
      </section>
      <div v-if="getUserDetails?.role === 2" class="flex flex-wrap md:flex-nowrap justify-between gap-12 md:gap-2">
        <OrderConfirmCompanyDetails />
        <OrderConfirmBankDetails />
      </div>
      <UiSeparator class="bg-grey-100" />
      <div v-if="orderPaySum" class="flex flex-col gap-6">
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
