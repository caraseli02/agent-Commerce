import type { CustomerCreditInterface, DiscountInterface } from '~/types/auth/account-settings';
import type { ShippingAddressInterface, UserInterface } from '~/types/auth/user-interface';
import type {
  BackorderShippingTypesInterface,
  SmallOrderChargeInterface,
  StockorderShippingTypesInterface,
} from '~/types/general-settings/general-settings';
import type { CartProductsInterface } from '~/types/cart';
import type { ShippingOrderPricingOption } from '~/types/order-summary/shipping-services';

export interface OrderSummaryItem {
  title: string;
  discount?: number;
  cover: unknown;
  vat: number;
  quantity: number;
  price: number;
}

export enum Currency {
  RON = 'LEI',
  USD = '$',
  EUR = '€',
}

export interface OrderSummaryItem {
  title: string;
  discount?: number;
  cover: unknown;
  vat: number;
  quantity: number;
  price: number;
}

export interface OrderNotesInterface {
  _id?: string;
  sender: string;
  message: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderMoneySnapshotInterface {
  currency: 'RON';
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  smallOrderCharge: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export interface OrderInterface {
  _id: string;
  shortId: string;
  user: UserInterface;
  userId?: string;
  userEmail?: string;
  userName: string;
  businessId?: string;
  products?: (CartProductsInterface & {
    discount?: DiscountInterface;
  })[];
  shippingDetails: OrderShippingDetailsInterface;
  paymentDetails?: PaymentDetails;
  total: number;
  subtotal: number;
  margin: number;
  currency: string;
  status: OrderStatus;
  type: OrderType;
  shippingCost?: number;
  smallOrderCost?: number;
  discount?: DiscountInterface;
  money?: OrderMoneySnapshotInterface;
  notes: OrderNotesInterface[];
  createdAt?: string;
  updatedAt?: string;
  backorderOption: BackorderShippingTypesInterface;
  stockorderOption: StockorderShippingTypesInterface;
  deliveryMethod: ShippingOrderPricingOption;

  /**
   * If the order has a parent, it means that the order is
   * attached to the parent order (which is a Mixed Order).
   * A Mixed Order is a composition between a Stock Order and a Back Order.
   * The order cannot have a parent if the type is Mixed.
   */
  parent?: string;
}

export type OrderTableColumns = Pick<
  OrderInterface,
  '_id' | 'shortId' | 'type' | 'user' | 'createdAt' | 'status' | 'total' | 'paymentDetails'
>;

export interface OrderRequestInterface {
  _id: string;
  shortId: string;
  user: UserInterface;
  userId?: string;
  userName: string;
  userEmail: string;
  businessId?: string;
  cartId?: string;
  reviewedCartRevision?: string;
  reviewedQuoteFingerprint?: string;
  products: CartProductsInterface[];
  shippingDetails: OrderShippingDetailsInterface;
  stripeCardId?: unknown;
  paymentDetails: PaymentDetails;
  smallOrderChargeId?: string;
  shippingCost?: number;
  smallOrderCost?: number;
  currency: string;
  type: OrderType;
  discount?: DiscountInterface;
  isDraft: boolean;
  notes?: OrderNotesInterface[];
  stock: string;
  total?: number;
  subtotal: number;
  updatedAt?: string;
}

export interface OrderRequestInterfaceResponse {
  status: string;
  data: {
    order: OrderInterface;
    children: OrderRequestInterface[];
  };
}

export interface CardInfo {
  provider: string;
  last4: string;
}

export interface CreditInfo {
  limit: number;
  tillDue: string;
  term: string;
  spent: number;
  available: number;
  dueDate: string;
}

export interface BankInfo {
  text: string;
}

export interface PaymentInfo {
  type: PaymentTypeEnum;
  info: CardInfo | CustomerCreditInterface | BankInfo;
}

export enum DeliveryMethodEnum {
  Free = 0,
  Standard = 1,
  Express = 2,
}

export enum BackorderOptionEnum {
  None = 0,
  Partial = 1,
  Full = 2,
}

export interface OrderStatusTracking {
  dateTime: string;
  unixDateTime: number;
  statusTextParts: {
    ro: {
      name: string;
      reason: string;
    };
  };
  comment: {
    ro: string;
  };
  code: number;
}

export interface OrderShippingDetailsInterface {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  country: string;
  mobile?: number;
  email?: string;
  address: ShippingAddressInterface;
  billingAddress: ShippingAddressInterface;
  deliveryTypeId: string;
  backorderShippingTypeId?: string;
  stockorderShippingType?: ShippingOrderPricingOption;
  statusTracking?: {
    awb: string;
    uniqueId: string;
    estimatedPickUpDate?: string;
    history?: OrderStatusTracking[];
  };
  _id?: string;
}

export interface ShippingCourierCreateOrderResponse {
  service: ShippingOrderPricingOption;
  estimatedPickUpDate: string;
  awb: string;
  uniqueId: string;
}

export interface PaymentDetails {
  type: PaymentTypeEnum;
  status?: PaymentStatusEnum;
  paymentIntentId?: string;
  card?: StripeCardInterface | null;
  invoiceId?: string;
  invoiceShortId?: string;
  bankTransfer?: MarkAsPaidInterface;
}

export interface MarkAsPaidInterface {
  amountPaid: number;
  currency: string;
  reference?: string;
  comments?: string;
  date: Date;
}

export type MarkAsPaidRequestInterface = MarkAsPaidInterface;

export interface StripeCardInterface {
  billing_details: ShippingAddressInterface;
  card: StripeCardInfoInterface;
  id: string;
  customer?: string;
  type: string;
  default?: boolean;
}

export interface StripeCardInfoInterface {
  display_brand?: string;
  brand?: string;
  checks?: object;
  country?: string;
  exp_month: number;
  exp_year: number;
  fingerprint?: string;
  funding?: string;
  generated_from?: string | null;
  last4: string;
  type: string;
  is_expired: boolean;
}

export interface GuestCheckoutContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface CheckoutOrderDraft {
  total: number;
  subtotal: number;
  shippingCost?: number;
  products: CartProductsInterface[];
  discount: { value: number; total: number };
  shippingDetails: {
    address: ShippingAddressInterface | null;
    billingAddress: ShippingAddressInterface | null;
  };
  guestContact?: GuestCheckoutContact | null;
  paymentDetails: PaymentDetails;
  type: OrderType;
  backorderOption: BackorderShippingTypesInterface | null;
  stockorderOption?: StockorderShippingTypesInterface | null;
  deliveryMethod: ShippingOrderPricingOption | null;
  smallOrder: SmallOrderChargeInterface | null;
}

export enum PaymentStatusEnum {
  Pending = 0,
  Paid = 1,
  Canceled = 2,
  Declined = 3,
  Failed = 4,
  Refunding = 5,
  Refunded = 6,
}

export const paymentStatusLabels = {
  [PaymentStatusEnum.Pending]: 'Pending',
  [PaymentStatusEnum.Paid]: 'Paid',
  [PaymentStatusEnum.Canceled]: 'Canceled',
  [PaymentStatusEnum.Declined]: 'Declined',
  [PaymentStatusEnum.Failed]: 'Failed',
  [PaymentStatusEnum.Refunding]: 'Refunding',
  [PaymentStatusEnum.Refunded]: 'Refunded',
} satisfies Record<PaymentStatusEnum, string>;

export const getPaymentStatusById = (enumValue: number): string | null =>
  Object.hasOwn(paymentStatusLabels, enumValue) ? paymentStatusLabels[enumValue as PaymentStatusEnum] : null;

export interface PaymentStatusOption {
  label: string | null;
  value: unknown;
  color: string;
}

export enum PaymentTypeEnum {
  Card = 0,
  Credit = 1,
  Cash = 2,
  Bank = 3,
}

export interface PaymentSummaryInterface {
  subtotal?: number;
  discountPercentage?: number;
  discountAmount?: number;
  handlingCharge?: number;
  shippingCost?: number;
  taxPercentage?: number;
  taxAmount?: number;
  backorderItemsTotal?: number;
  stockItemsTotal?: number;
  orderTotal?: number;
  payableNow?: number;
  shippingText?: string;
  orderType?: OrderType;
  smallOrderCharge?: number;
}

export const getPaymentTypeById = (enumValue: number): string | null => {
  const entry = Object.entries(PaymentTypeEnum).find(([, value]) => value === enumValue);
  return entry?.[0] ?? null;
};

export interface PaymentTypeOption {
  label: string | null;
  value: unknown;
  color?: string;
}

export interface PriceHistory {
  active: boolean;
  createdAt: string;
  price: number;
  updatedAt: string;
}

export interface OrderConfirmationAddress {
  name1: string;
  name2: string;
  postcode: string;
  country: string;
  city: string;
}

export enum OrderStatus {
  Completed = 'Completed',
  Canceled = 'Canceled',
  Refunded = 'Refunded',
  Delivered = 'Delivered',
  AbandonedCheckout = 'Abandoned Checkout',
  Pending = 'Pending',
  OnHold = 'On Hold',
  Processing = 'Processing',
  Dispatched = 'Dispatched',
  Packaging = 'Packaging',

  // OnDispute = 'OnDispute',
  // Disputed = 'Disputed',
  // PartiallyRefunded = 'Partially Refunded',
  // Returned = 'Returned',
  // PartiallyShipped = 'Partially Shipped',
  // Shipped = 'Shipped',
  // VerificationRequired = 'Verification Required',
  // AwaitingPayment = 'Awaiting Payment',
  // AwaitingFulfillment = 'Awaiting Fulfillment',
  // AwaitingShipment = 'Awaiting Shipment',
  // AwaitingPickup = 'Awaiting Pickup',
  // PaymentReceived = 'Payment Received',
  // PaymentDeclined = 'Payment Declined',
  // PaymentFailed = 'Payment Failed',
}

export enum OrderType {
  Stock = 0,
  Back = 1,
  Mixed = 2,
}

// The 'as T' is a type assertion to help TypeScript
export const getOrderById = <T extends { [index: string]: number }>(enumValue: number): string | null => {
  const keys = Object.keys(OrderType as unknown as T).filter((x) => (OrderType as unknown as T)[x] === enumValue);
  return keys[0] ?? null;
};

export interface OrderTypeInfo {
  value: OrderType;
  label: string;
  badge: { bg: string; text: string };
}
