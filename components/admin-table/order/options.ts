import { OrderStatus, OrderType, type OrderTypeInfo } from '~/types/order-summary/item';

export const orderType = [
  { value: OrderType.Stock, label: 'Stock Order', badge: { bg: 'bg-green-600', text: 'S' } },
  { value: OrderType.Back, label: 'Back Order', badge: { bg: 'bg-purple-500', text: 'B' } },
  { value: OrderType.Mixed, label: 'Mixed Order', badge: { bg: 'bg-blue-500', text: 'M' } },
];

export function getOrderTypeInfo(Order: number): OrderTypeInfo | null {
  return orderType.find((item) => item.value === Order) as unknown as OrderTypeInfo | null;
}

export const statusColors = {
  [OrderStatus.AbandonedCheckout]: 'bg-gray-800',
  // [OrderStatus.AwaitingPayment]: 'bg-orange-500',
  // [OrderStatus.PartiallyRefunded]: 'bg-purple-500',
  [OrderStatus.Completed]: 'bg-green-600',
  // [OrderStatus.PartiallyShipped]: 'bg-blue-500',
  [OrderStatus.Processing]: 'bg-purple-500',
  [OrderStatus.Packaging]: 'bg-blue-500',
  // [OrderStatus.AwaitingFulfillment]: 'bg-orange-500',
  // [OrderStatus.VerificationRequired]: 'bg-gray-500',
  [OrderStatus.Canceled]: 'bg-gray-500',
  // [OrderStatus.OnDispute]: 'bg-yellow-500',
  // [OrderStatus.Disputed]: 'bg-yellow-600',
  [OrderStatus.Refunded]: 'bg-red-500',
  // [OrderStatus.Returned]: 'bg-red-600',
  // [OrderStatus.Shipped]: 'bg-green-700',
  [OrderStatus.Delivered]: 'bg-green-800',
  // [OrderStatus.PaymentDeclined]: 'bg-red-700',
  [OrderStatus.Pending]: 'bg-yellow-400',
  [OrderStatus.Dispatched]: 'bg-blue-600',
  // [OrderStatus.AwaitingShipment]: 'bg-yellow-300',
  // [OrderStatus.AwaitingPickup]: 'bg-yellow-200',
  // [OrderStatus.PaymentReceived]: 'bg-teal-400',
};
