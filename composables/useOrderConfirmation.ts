import { computed, ref, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import { orderType } from '~/components/admin-table/order/options';
import { formatReviewerDateTime } from '~/helpers/reviewer-dates';
import { toast } from '~/components/ui/toast';
import { downloadDocument as downloadDocumentApi } from '~/composables/api/documents';
import { getOrderById } from '~/composables/api/orders';
import { calculateOrderMoney } from '~/helpers/order-money';
import { paymentInfoHelper } from '~/helpers/payment-info.helper';
import { useAuthStore } from '~/store/authStore';
import { OrderType } from '~/types';
import type { CartProductsInterface } from '~/types/cart';
import type {
  OrderInterface,
  OrderNotesInterface,
  OrderRequestInterface,
  OrderRequestInterfaceResponse,
  PaymentInfo,
  PaymentSummaryInterface,
} from '~/types';

interface OrderConfirmationCustomerDetails {
  title: string;
  name: string;
  email: string;
  phone: string;
}

export function normalizeOrderConfirmationOrderId(orderId?: string | string[]) {
  if (Array.isArray(orderId)) {
    return orderId[0] ?? '';
  }

  return orderId ?? '';
}

interface OrderConfirmationAddressGroup {
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

export function useOrderConfirmation(orderId: MaybeRefOrGetter<string | undefined>) {
  const authStore = useAuthStore();

  const orderTypeValue = ref<OrderType | null>(null);
  const orderResponse = ref<OrderRequestInterfaceResponse>({} as OrderRequestInterfaceResponse);
  const stockOrder = ref<OrderRequestInterface>({} as OrderRequestInterface);
  const backOrder = ref<OrderRequestInterface>({} as OrderRequestInterface);
  const stockOrderItems = ref<CartProductsInterface[]>([]);
  const backorderItems = ref<CartProductsInterface[]>([]);

  const customerDetails = computed<OrderConfirmationCustomerDetails>(() => {
    const currentOrder = orderResponse.value.data?.order;

    return {
      title: 'Customer Details',
      name: `${currentOrder?.user.contactDetails?.firstName ?? ''} ${currentOrder?.user.contactDetails?.lastName ?? ''}`.trim(),
      email: currentOrder?.user.contactDetails?.email ?? '',
      phone: currentOrder?.shippingDetails.phone ?? '',
    };
  });

  const addresses = computed<OrderConfirmationAddressGroup | null>(() => {
    const currentOrder = orderResponse.value.data?.order;

    if (!currentOrder) {
      return null;
    }

    return {
      shippingAddress: {
        name1: currentOrder.shippingDetails.address.name1,
        name2: currentOrder.shippingDetails.address.name2 ? currentOrder.shippingDetails.address.name2 : '',
        postcode: currentOrder.shippingDetails.address.postcode,
        country: currentOrder.shippingDetails.address.country,
        default: currentOrder.shippingDetails.address.default || false,
      },
      billingAddress: {
        name1: currentOrder.shippingDetails.billingAddress.name1,
        name2: currentOrder.shippingDetails.billingAddress.name2 ? currentOrder.shippingDetails.billingAddress.name2 : '',
        postcode: currentOrder.shippingDetails.billingAddress.postcode,
        country: currentOrder.shippingDetails.billingAddress.country,
      },
    };
  });

  const notes = computed<OrderNotesInterface[]>(() => orderResponse.value.data?.order.notes ?? []);
  const date = computed(() => {
    const createdAt = orderResponse.value.data?.order.createdAt;

    return formatReviewerDateTime(createdAt);
  });

  const shippingMethod = computed(() => orderResponse.value.data?.order.shippingDetails.stockorderShippingType);
  const hasMixedItems = computed(() => {
    const stockIds = new Set(stockOrderItems.value.map((item) => item.id));

    return backorderItems.value.some((item) => stockIds.has(item.id));
  });

  const paymentSummary = computed<PaymentSummaryInterface | null>(() => {
    const currentOrder = orderResponse.value.data?.order;
    const children = orderResponse.value.data?.children ?? [];

    if (!currentOrder) {
      return null;
    }

    const subtotal = Number(currentOrder.subtotal || 0);
    const discountPercentage = currentOrder.discount?.value || 0;
    const stockChild = children.find((child) => child.type === OrderType.Stock);
    const backorderChild = children.find((child) => child.type === OrderType.Back);
    const orderMoney = calculateOrderMoney({
      subtotal,
      discountRate: discountPercentage,
      shippingCost: currentOrder.shippingCost || 0,
      smallOrderTiers: currentOrder.smallOrderCost
        ? [{ min: 0, max: Number.POSITIVE_INFINITY, price: currentOrder.smallOrderCost }]
        : undefined,
    });

    return {
      subtotal,
      discountPercentage,
      discountAmount: orderMoney.discountAmount,
      handlingCharge: 0,
      shippingCost: orderMoney.shippingCost,
      taxPercentage: Math.round(orderMoney.vatRate * 100),
      taxAmount: orderMoney.vatAmount,
      backorderItemsTotal: currentOrder.type === OrderType.Mixed ? backorderChild?.total : undefined,
      stockItemsTotal: currentOrder.type === OrderType.Mixed ? stockChild?.total : undefined,
      orderTotal: currentOrder.total,
      payableNow: currentOrder.type === OrderType.Mixed ? stockChild?.total : undefined,
      shippingText: shippingMethod.value?.service?.courierName || '',
      orderType: currentOrder.type,
      smallOrderCharge: currentOrder.smallOrderCost || 0,
    };
  });

  const paymentMethod = computed<PaymentInfo | undefined>(() => {
    const currentOrder = orderResponse.value.data?.order;

    if (!currentOrder) {
      return undefined;
    }

    const resolvedOrder = orderTypeValue.value === OrderType.Mixed ? (stockOrder.value as unknown as OrderInterface) : currentOrder;
    return paymentInfoHelper(resolvedOrder, authStore.getUserDetails, authStore.userCards || []) || undefined;
  });

  const paymentMethodRecord = computed(() => paymentMethod.value as Record<string, unknown> | undefined);
  const showCompanyDetails = computed(() => authStore.getUserDetails?.role === 2);

  const resolvedOrderTypeValue = computed(() => orderTypeValue.value ?? OrderType.Stock);

  const showStockOrder = computed(() => orderTypeValue.value === OrderType.Stock || orderTypeValue.value === OrderType.Mixed);
  const showBackOrder = computed(() => orderTypeValue.value === OrderType.Back || orderTypeValue.value === OrderType.Mixed);

  const getOrderTypeValueByOrder = () => {
    return orderType.find((type) => type.value === orderTypeValue.value) || orderType[0];
  };

  const loadOrderConfirmation = async () => {
    const resolvedOrderId = toValue(orderId);

    if (!resolvedOrderId) {
      return;
    }

    const response = (await getOrderById(resolvedOrderId)) as OrderRequestInterfaceResponse;

    if (response.status !== 'success' || !response.data?.order) {
      return;
    }

    orderResponse.value = response;
    orderTypeValue.value = response.data.order.type;

    if (response.data.order.type === OrderType.Mixed) {
      stockOrder.value = (response.data.children.find((child) => child.type === OrderType.Stock) ??
        response.data.order) as unknown as OrderRequestInterface;
      backOrder.value = (response.data.children.find((child) => child.type === OrderType.Back) ??
        response.data.order) as unknown as OrderRequestInterface;
      stockOrderItems.value = stockOrder.value.products || [];
      backorderItems.value = backOrder.value.products || [];
      return;
    }

    stockOrder.value = response.data.order as unknown as OrderRequestInterface;
    backOrder.value = response.data.order as unknown as OrderRequestInterface;
    stockOrderItems.value = response.data.order.products || [];
    backorderItems.value = [];
  };

  const downloadDocument = async () => {
    const invoiceId = stockOrder.value.paymentDetails?.invoiceId;

    if (!invoiceId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Invoice is not available for the moment',
      });
      return false;
    }

    const result = await downloadDocumentApi(invoiceId);

    if (!result) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download document',
      });
      return false;
    }

    return true;
  };

  return {
    orderResponse,
    orderTypeValue,
    stockOrder,
    backOrder,
    stockOrderItems,
    backorderItems,
    customerDetails,
    addresses,
    notes,
    date,
    shippingMethod,
    hasMixedItems,
    paymentSummary,
    paymentMethod,
    paymentMethodRecord,
    resolvedOrderTypeValue,
    showCompanyDetails,
    showStockOrder,
    showBackOrder,
    getOrderTypeValueByOrder,
    loadOrderConfirmation,
    downloadDocument,
  };
}
