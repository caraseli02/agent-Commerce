import type { UserInterface } from '~/types/auth/user-interface';
import { PaymentStatusEnum } from '~/types/order-summary/item';
import { createRuntimeOrder, findRuntimeOrder } from '~/server/utils/mockRuntimeOrders';

export type PendingOrderItem = Readonly<{
  productId: string;
  sku: string;
  name: string;
  immediateQuantity: number;
  backorderQuantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}>;

export type CreatePendingOrderInput = {
  checkoutRequestId: string;
  cartId: string;
  cartRevision: string;
  user: UserInterface;
  items: readonly PendingOrderItem[];
  shippingDetails?: Record<string, unknown>;
  paymentDetails?: Record<string, unknown>;
  shippingCostMinor: number;
  orderType?: number;
  notes?: Array<{ sender?: string; message?: string }>;
};

export type CreatePendingOrderResult = { kind: 'created'; orderId: string } | { kind: 'existing'; orderId: string } | { kind: 'conflict' };

export type ConfirmOrderPaymentResult = { kind: 'confirmed' } | { kind: 'already-confirmed' } | { kind: 'not-found' };

type ExistingCheckout = {
  fingerprint: string;
  orderId: string;
};

const byCheckoutRequest = new Map<string, ExistingCheckout>();
const settledByOrder = new Map<string, string>();

const fingerprintOrder = (input: CreatePendingOrderInput) =>
  JSON.stringify({
    cartId: input.cartId,
    cartRevision: input.cartRevision,
    userId: input.user._id,
    items: input.items,
    shippingDetails: input.shippingDetails,
    paymentDetails: input.paymentDetails,
    shippingCostMinor: input.shippingCostMinor,
    orderType: input.orderType,
    notes: input.notes,
  });

const createPending = async (input: CreatePendingOrderInput): Promise<CreatePendingOrderResult> => {
  const fingerprint = fingerprintOrder(input);
  const existing = byCheckoutRequest.get(input.checkoutRequestId);

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      return { kind: 'conflict' };
    }

    return { kind: 'existing', orderId: existing.orderId };
  }

  const products = input.items.map((item) => ({
    id: item.productId,
    code: item.sku,
    name: item.name,
    stock: item.immediateQuantity,
    backorder_stock: item.backorderQuantity,
    initialUnitPrice: item.unitPriceMinor / 100,
    unitPriceAfterDiscounts: item.unitPriceMinor / 100,
    subtotal: item.lineTotalMinor / 100,
    total: item.lineTotalMinor / 100,
  }));

  const firstNote = input.notes?.find((note) => typeof note.message === 'string' && note.message.trim());

  const payload = {
    cartId: input.cartId,
    products,
    shippingDetails: input.shippingDetails,
    paymentDetails: input.paymentDetails,
    shippingCost: input.shippingCostMinor / 100,
    currency: 'ron',
    type: input.orderType,
    note: firstNote
      ? {
          sender: firstNote.sender,
          message: firstNote.message,
        }
      : undefined,
  } as Parameters<typeof createRuntimeOrder>[0];

  const created = createRuntimeOrder(payload, input.user);

  // Compatibility adapter: runtime orders still embed payment state. New Orders
  // are pending until the Payments module establishes success.
  created.order.paymentDetails.status = PaymentStatusEnum.Pending;

  byCheckoutRequest.set(input.checkoutRequestId, {
    fingerprint,
    orderId: created.orderId,
  });

  return { kind: 'created', orderId: created.orderId };
};

const confirmPayment = async (input: { orderId: string; paymentId: string }): Promise<ConfirmOrderPaymentResult> => {
  const existingPayment = settledByOrder.get(input.orderId);

  if (existingPayment) {
    return { kind: 'already-confirmed' };
  }

  const record = findRuntimeOrder(input.orderId);

  if (!record) {
    return { kind: 'not-found' };
  }

  record.order.paymentDetails.status = PaymentStatusEnum.Paid;
  record.order.updatedAt = new Date().toISOString();
  settledByOrder.set(input.orderId, input.paymentId);

  return { kind: 'confirmed' };
};

export const orders = {
  createPending,
  confirmPayment,
};
