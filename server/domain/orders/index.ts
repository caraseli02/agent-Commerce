import type { UserInterface } from '~/types/auth/user-interface';
import { PaymentStatusEnum } from '~/types/order-summary/item';
import { buildRuntimeOrder } from '~/server/utils/mockRuntimeOrders';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

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
  smallOrderCostMinor: number;
  orderType?: number;
  notes?: Array<{ sender?: string; message?: string }>;
};

export type CreatePendingOrderResult = { kind: 'created'; orderId: string } | { kind: 'existing'; orderId: string } | { kind: 'conflict' };

export type ConfirmOrderPaymentResult = { kind: 'confirmed' } | { kind: 'already-confirmed' } | { kind: 'not-found' };

type OrderRecord = ReturnType<typeof buildRuntimeOrder> extends { order: infer T } ? T : never;
export type PersistedOrderResponse = { order: OrderRecord; children: unknown[] };

type OrderRow = {
  id: string;
  customer_id: string;
  checkout_request_id: string;
  source_cart_id: string;
  source_cart_revision: number;
  fingerprint: string;
  payload_json: string;
  paid_by_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

const fingerprintOrder = (input: CreatePendingOrderInput) =>
  JSON.stringify({
    cartId: input.cartId,
    cartRevision: input.cartRevision,
    userId: input.user._id,
    items: input.items,
    shippingDetails: input.shippingDetails,
    paymentDetails: input.paymentDetails,
    shippingCostMinor: input.shippingCostMinor,
    smallOrderCostMinor: input.smallOrderCostMinor,
    orderType: input.orderType,
    notes: input.notes,
  });

const parseOrder = (row: OrderRow) => JSON.parse(row.payload_json) as PersistedOrderResponse;

const createPending = async (input: CreatePendingOrderInput): Promise<CreatePendingOrderResult> => {
  const fingerprint = fingerprintOrder(input);
  const customerId = String(input.user._id || input.user.firebaseId || '');
  const database = await getCheckoutDatabase();
  const existingRows = await database.query<OrderRow>(`SELECT * FROM checkout_orders WHERE customer_id = ? AND checkout_request_id = ?`, [
    customerId,
    input.checkoutRequestId,
  ]);
  const existing = existingRows[0];

  if (existing) {
    return existing.fingerprint === fingerprint ? { kind: 'existing', orderId: existing.id } : { kind: 'conflict' };
  }

  const semanticRows = await database.query<OrderRow>(
    `SELECT * FROM checkout_orders
      WHERE customer_id = ? AND source_cart_id = ? AND source_cart_revision = ?`,
    [customerId, input.cartId, Number(input.cartRevision)],
  );
  if (semanticRows.length) return { kind: 'conflict' };

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
  const created = buildRuntimeOrder(
    {
      cartId: input.cartId,
      products,
      shippingDetails: input.shippingDetails,
      paymentDetails: input.paymentDetails,
      shippingCost: input.shippingCostMinor / 100,
      smallOrderCost: input.smallOrderCostMinor / 100,
      currency: 'ron',
      type: input.orderType,
      note: firstNote ? { sender: firstNote.sender, message: firstNote.message } : undefined,
    } as Parameters<typeof buildRuntimeOrder>[0],
    input.user,
  );

  created.order.paymentDetails.status = PaymentStatusEnum.Pending;
  const payload: PersistedOrderResponse = { order: created.order, children: [] };
  const timestamp = created.order.createdAt;
  await database.execute(
    `INSERT INTO checkout_orders (
       id, customer_id, checkout_request_id, source_cart_id, source_cart_revision,
       fingerprint, payload_json, paid_by_payment_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      created.orderId,
      customerId,
      input.checkoutRequestId,
      input.cartId,
      Number(input.cartRevision),
      fingerprint,
      JSON.stringify(payload),
      timestamp,
      timestamp,
    ],
  );

  return { kind: 'created', orderId: created.orderId };
};

const confirmPayment = async (input: { orderId: string; paymentId: string }): Promise<ConfirmOrderPaymentResult> => {
  const database = await getCheckoutDatabase();
  const lock = database.dialect === 'postgres' ? ' FOR UPDATE' : '';
  const rows = await database.query<OrderRow>(`SELECT * FROM checkout_orders WHERE id = ?${lock}`, [input.orderId]);
  const row = rows[0];
  if (!row) return { kind: 'not-found' };
  if (row.paid_by_payment_id) return { kind: 'already-confirmed' };

  const payload = parseOrder(row);
  payload.order.paymentDetails.status = PaymentStatusEnum.Paid;
  payload.order.updatedAt = new Date().toISOString();
  await database.execute(
    `UPDATE checkout_orders
        SET payload_json = ?, paid_by_payment_id = ?, updated_at = ?
      WHERE id = ?`,
    [JSON.stringify(payload), input.paymentId, payload.order.updatedAt, input.orderId],
  );
  return { kind: 'confirmed' };
};

const findById = async (id?: string | null) => {
  if (!id) return null;
  const searchId = String(id).toLowerCase();
  const database = await getCheckoutDatabase();
  const rows = await database.query<OrderRow>(`SELECT * FROM checkout_orders ORDER BY created_at DESC`);
  const row = rows.find((candidate) => {
    const payload = parseOrder(candidate);
    const orderId = String(payload.order._id || '').toLowerCase();
    const shortId = String(payload.order.shortId || '').toLowerCase();
    return orderId === searchId || shortId === searchId || shortId.replace('#', '') === searchId;
  });
  return row ? parseOrder(row) : null;
};

const list = async (customerId?: string) => {
  const database = await getCheckoutDatabase();
  const rows = customerId
    ? await database.query<OrderRow>(`SELECT * FROM checkout_orders WHERE customer_id = ? ORDER BY created_at DESC`, [customerId])
    : await database.query<OrderRow>(`SELECT * FROM checkout_orders ORDER BY created_at DESC`);
  return rows.map((row) => parseOrder(row).order);
};

export const orders = { createPending, confirmPayment, findById, list };
