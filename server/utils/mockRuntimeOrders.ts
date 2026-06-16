import { PaymentStatusEnum, PaymentTypeEnum, OrderStatus } from '~/types/order-summary/item';
import type { OrderType } from '~/types/order-summary/item';
import type { UserInterface } from '~/types/auth/user-interface';
import type { ShippingOrderPricingOption } from '~/types/order-summary/shipping-services';

type OrderProductLike = {
  subtotal?: number;
  total?: number;
  unitPriceAfterDiscounts?: number;
  stock?: number;
};

type ShippingAddressLike = {
  name1?: string;
  name2?: string;
  country?: string;
  region?: string;
  city?: string;
  postcode?: string;
  default?: boolean;
};

type ShippingDetailsInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  country?: string;
  address?: ShippingAddressLike;
  billingAddress?: ShippingAddressLike;
  deliveryTypeId?: string;
  backorderShippingTypeId?: string;
  stockorderShippingType?: ShippingOrderPricingOption;
};

type PaymentCardWrapper = {
  card?: {
    brand?: string;
    last4?: string;
    exp_year?: number;
    exp_month?: number;
  };
};

type PaymentCardDetails = {
  brand?: string;
  last4?: string;
  exp_year?: number;
  exp_month?: number;
};

type PaymentDetailsInput = {
  type?: PaymentTypeEnum;
  card?: PaymentCardWrapper | PaymentCardDetails;
};

type CreateOrderNoteInput = {
  message?: string;
  sender?: string;
};

type CreateOrderPayload = {
  products?: OrderProductLike[];
  note?: CreateOrderNoteInput;
  cartId?: string;
  shippingDetails?: ShippingDetailsInput;
  paymentDetails?: PaymentDetailsInput;
  total?: number;
  subtotal?: number;
  currency?: string;
  type?: OrderType;
  shippingCost?: number;
};

type RuntimeOrderNote = {
  _id: string;
  sender: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

type RuntimeOrderDiscount = {
  value: number;
  startDate: string;
  endDate: string;
};

type RuntimeOrderPaymentDetails = {
  type: PaymentTypeEnum;
  status: PaymentStatusEnum;
  card: PaymentCardDetails | undefined;
  invoiceId: string;
  invoiceShortId: string;
};

type RuntimeOrderShippingDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  address: ShippingAddressLike & { default: boolean };
  billingAddress: ShippingAddressLike & { default: boolean };
  deliveryTypeId: string;
  backorderShippingTypeId?: string;
  stockorderShippingType: ShippingOrderPricingOption;
  statusTracking: {
    awb: string;
    uniqueId: string;
    estimatedPickUpDate: string;
  };
};

type RuntimeOrder = {
  _id: string;
  shortId: string;
  user: UserInterface;
  userId?: string;
  userName: string;
  userEmail?: string;
  cartId?: string;
  products: OrderProductLike[];
  shippingDetails: RuntimeOrderShippingDetails;
  paymentDetails: RuntimeOrderPaymentDetails;
  total: number;
  subtotal: number;
  margin: number;
  currency: string;
  status: OrderStatus;
  type: OrderType;
  shippingCost: number;
  smallOrderCost: number;
  discount: RuntimeOrderDiscount;
  notes: RuntimeOrderNote[];
  createdAt: string;
  updatedAt: string;
};

type RuntimeOrderResponse = {
  order: RuntimeOrder;
  children: unknown[];
};

const runtimeOrders = new Map<string, RuntimeOrderResponse>();

const generateOrderId = () => `ord-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const generateShortId = () => `#ORD-${Math.floor(100000 + Math.random() * 899999)}`;

const calculateOrderTotals = (products: OrderProductLike[] = []) => {
  if (!products.length) {
    return { subtotal: 0, total: 0 };
  }

  const subtotal = products.reduce((sum, item) => {
    const itemSubtotal = Number(item.subtotal || Number(item.unitPriceAfterDiscounts || 0) * Number(item.stock || 0));
    return sum + itemSubtotal;
  }, 0);

  const total = products.reduce((sum, item) => {
    const itemTotal = Number(item.total || Number(item.unitPriceAfterDiscounts || 0) * Number(item.stock || 0));
    return sum + itemTotal;
  }, 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

const normalizeShippingDetails = (shippingDetails: ShippingDetailsInput = {}): RuntimeOrderShippingDetails => {
  const address = shippingDetails.address || {
    name1: 'N/A',
    name2: '',
    country: 'US',
    region: 'California',
    city: 'San Francisco',
    postcode: '94105',
    default: true,
  };
  const billingAddress = shippingDetails.billingAddress || address;

  return {
    firstName: shippingDetails.firstName || 'Demo',
    lastName: shippingDetails.lastName || 'User',
    phone: shippingDetails.phone || '+14085550000',
    city: shippingDetails.city || address.city || 'San Francisco',
    country: shippingDetails.country || address.country || 'US',
    address: {
      ...address,
      default: address.default ?? true,
    },
    billingAddress: {
      ...billingAddress,
      default: billingAddress.default ?? true,
    },
    deliveryTypeId: shippingDetails.deliveryTypeId || 'stock-001',
    backorderShippingTypeId: shippingDetails.backorderShippingTypeId,
    stockorderShippingType: shippingDetails.stockorderShippingType || {
      service: {
        id: 1,
        courierName: 'Demo Express',
        name: 'Standard Delivery',
      },
      price: {
        total: 19.9,
        noVat: 16.72,
      },
    },
    statusTracking: {
      awb: `AWB-${Math.floor(100000 + Math.random() * 899999)}`,
      uniqueId: `trk-${Math.floor(100000 + Math.random() * 899999)}`,
      estimatedPickUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
};

const isPaymentCardWrapper = (card: PaymentCardWrapper | PaymentCardDetails | undefined): card is PaymentCardWrapper => {
  return Boolean(card && 'card' in card && card.card);
};

const normalizePaymentDetails = (paymentDetails: PaymentDetailsInput = {}): RuntimeOrderPaymentDetails => {
  const rawCard = paymentDetails.card;
  const normalizedCard = isPaymentCardWrapper(rawCard)
    ? {
        brand: rawCard.card?.brand,
        last4: rawCard.card?.last4,
        exp_year: rawCard.card?.exp_year,
        exp_month: rawCard.card?.exp_month,
      }
    : rawCard;

  return {
    type: paymentDetails.type ?? PaymentTypeEnum.Card,
    status: PaymentStatusEnum.Paid,
    card: normalizedCard,
    invoiceId: `inv-${Math.floor(100000 + Math.random() * 899999)}`,
    invoiceShortId: `INV-${Math.floor(1000 + Math.random() * 8999)}`,
  };
};

export const createRuntimeOrder = (payload: CreateOrderPayload, user: UserInterface) => {
  const orderId = generateOrderId();
  const shortId = generateShortId();
  const products = payload.products || [];
  const totals = calculateOrderTotals(products);
  const noteMessage = payload.note?.message;

  const order: RuntimeOrder = {
    _id: orderId,
    shortId,
    user,
    userId: user._id,
    userName: `${user.contactDetails?.firstName || ''} ${user.contactDetails?.lastName || ''}`.trim(),
    userEmail: user.contactDetails?.email,
    cartId: payload.cartId,
    products,
    shippingDetails: normalizeShippingDetails(payload.shippingDetails),
    paymentDetails: normalizePaymentDetails(payload.paymentDetails),
    total: Number(payload.total ?? totals.total),
    subtotal: Number(payload.subtotal ?? totals.subtotal),
    margin: 0,
    currency: payload.currency || 'ron',
    status: OrderStatus.Pending,
    type: payload.type ?? 0,
    shippingCost: Number(payload.shippingCost ?? 19.9),
    smallOrderCost: 0,
    discount: {
      value: 0,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    },
    notes: noteMessage
      ? [
          {
            _id: `note-${Date.now()}`,
            sender: payload.note?.sender || user.firebaseId || user._id || 'system',
            message: noteMessage,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
      : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  runtimeOrders.set(orderId, {
    order,
    children: [],
  });

  return {
    orderId,
    order,
  };
};

export const findRuntimeOrder = (id?: string | null) => {
  if (!id) {
    return null;
  }

  const searchId = String(id).toLowerCase();
  for (const value of runtimeOrders.values()) {
    const orderId = String(value.order._id || '').toLowerCase();
    const shortId = String(value.order.shortId || '').toLowerCase();
    const normalizedShortId = shortId.replace('#', '');

    if (orderId === searchId || shortId === searchId || normalizedShortId === searchId) {
      return value;
    }
  }

  return null;
};

export const cancelRuntimeOrder = (id?: string | null) => {
  const record = findRuntimeOrder(id);
  if (!record) {
    return false;
  }

  record.order.status = OrderStatus.Canceled;
  record.order.paymentDetails.status = PaymentStatusEnum.Canceled;
  record.order.updatedAt = new Date().toISOString();
  return true;
};

export const listRuntimeOrders = () => {
  return Array.from(runtimeOrders.values());
};
