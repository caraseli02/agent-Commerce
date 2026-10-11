import type { UserInterface } from '~~/types/auth/user-interface';
import { OrderStatus, PaymentStatusEnum } from '~~/types/order-summary/item';
import { buildRuntimeOrder } from '~~/server/utils/mockRuntimeOrders';
import { getDemoOrders } from '~~/server/utils/mockDashboardDemo';
import { getCheckoutDatabase } from '~~/server/infrastructure/checkout-database';
import type { ReservationItem } from '~~/server/domain/inventory';

export type PendingOrderItem = Readonly<{
  productId: string;
  sku: string;
  name: string;
  immediateQuantity: number;
  backorderQuantity: number;
  listUnitPriceMinor: number;
  discountPercent: number;
  discountTotalMinor: number;
  vatTotalMinor: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}>;

export type PendingOrderMoney = Readonly<{
  currency: 'RON';
  merchandiseTotalMinor: number;
  discountTotalMinor: number;
  shippingTotalMinor: number;
  smallOrderChargeMinor: number;
  vatRate: number;
  vatTotalMinor: number;
  grandTotalMinor: number;
}>;

export type CreatePendingOrderInput = {
  checkoutRequestId: string;
  cartId: string;
  cartRevision: string;
  user: UserInterface;
  items: readonly PendingOrderItem[];
  shippingDetails?: Record<string, unknown>;
  paymentDetails?: Record<string, unknown>;
  money: PendingOrderMoney;
  orderType?: number;
  notes?: Array<{ sender?: string; message?: string }>;
};

export type CreatePendingOrderResult = { kind: 'created'; orderId: string } | { kind: 'existing'; orderId: string } | { kind: 'conflict' };

export type ConfirmOrderPaymentResult = { kind: 'confirmed' } | { kind: 'already-confirmed' } | { kind: 'not-found' };

type OrderRecord = ReturnType<typeof buildRuntimeOrder> extends { order: infer T } ? T : never;
export type PersistedOrderResponse = {
  order: OrderRecord;
  children: unknown[];
  fulfillment?: { reservationId: string; items: readonly ReservationItem[] };
};

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
  grand_total_minor: number;
  currency: 'RON';
};

const fingerprintOrder = (input: CreatePendingOrderInput) =>
  JSON.stringify({
    cartId: input.cartId,
    cartRevision: input.cartRevision,
    userId: input.user._id,
    items: input.items,
    shippingDetails: input.shippingDetails,
    paymentDetails: input.paymentDetails,
    money: input.money,
    orderType: input.orderType,
    notes: input.notes,
  });

const parseOrder = (row: OrderRow) => JSON.parse(row.payload_json) as PersistedOrderResponse;

const ensureDemoOrdersPersisted = async () => {
  if (process.env.NUXT_PUBLIC_MOCK_MODE !== 'true') return;

  const database = await getCheckoutDatabase();
  const demoOrders = getDemoOrders();
  const [seedCount] = await database.query<{ total: number }>(
    "SELECT COUNT(*) AS total FROM checkout_orders WHERE checkout_request_id LIKE 'demo-seed:%'",
  );
  if (Number(seedCount?.total || 0) >= demoOrders.length) return;

  for (const order of demoOrders) {
    const seedKey = `demo-seed:${order._id}`;
    const persistedDemoOrder = {
      ...order,
      discount: {
        value: 0,
        startDate: order.createdAt,
        endDate: order.updatedAt,
      },
    } as unknown as OrderRecord;
    await database.execute(
      `INSERT INTO checkout_orders (
         id, customer_id, checkout_request_id, source_cart_id, source_cart_revision,
         fingerprint, payload_json, paid_by_payment_id, created_at, updated_at, grand_total_minor, currency
       ) VALUES ($1, $2, $3, $4, 0, $5, $6, NULL, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        order._id,
        order.userId || order.user._id,
        seedKey,
        seedKey,
        seedKey,
        JSON.stringify({ order: persistedDemoOrder, children: [] } satisfies PersistedOrderResponse),
        order.createdAt,
        order.updatedAt,
        Math.round(Number(order.money?.total ?? order.total ?? 0) * 100),
        String(order.money?.currency ?? 'RON').toUpperCase(),
      ],
    );
  }
};

const createPending = async (input: CreatePendingOrderInput): Promise<CreatePendingOrderResult> => {
  const fingerprint = fingerprintOrder(input);
  const customerId = String(input.user._id || input.user.firebaseId || '');
  const database = await getCheckoutDatabase();
  const existingRows = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE customer_id = $1 AND checkout_request_id = $2', [
    customerId,
    input.checkoutRequestId,
  ]);
  const existing = existingRows[0];

  if (existing) {
    return existing.fingerprint === fingerprint ? { kind: 'existing', orderId: existing.id } : { kind: 'conflict' };
  }

  const semanticRows = await database.query<OrderRow>(
    `SELECT * FROM checkout_orders
      WHERE customer_id = $1 AND source_cart_id = $2 AND source_cart_revision = $3`,
    [customerId, input.cartId, Number(input.cartRevision)],
  );
  if (semanticRows.length) return { kind: 'conflict' };

  const products = input.items.map((item) => ({
    id: item.productId,
    code: item.sku,
    name: item.name,
    stock: item.immediateQuantity,
    backorder_stock: item.backorderQuantity,
    initialUnitPrice: item.listUnitPriceMinor / 100,
    unitPriceAfterDiscounts: item.unitPriceMinor / 100,
    discount: {
      value: item.discountPercent,
      total: item.discountTotalMinor / 100,
      startDate: '',
      endDate: '',
    },
    subtotal: item.lineTotalMinor / 100,
    vatTotal: item.vatTotalMinor / 100,
    total: item.lineTotalMinor / 100,
  }));
  const firstNote = input.notes?.find((note) => typeof note.message === 'string' && note.message.trim());
  const created = buildRuntimeOrder(
    {
      cartId: input.cartId,
      products,
      shippingDetails: input.shippingDetails,
      paymentDetails: input.paymentDetails,
      money: {
        currency: input.money.currency,
        subtotal: input.money.merchandiseTotalMinor / 100,
        discountAmount: input.money.discountTotalMinor / 100,
        shippingCost: input.money.shippingTotalMinor / 100,
        smallOrderCharge: input.money.smallOrderChargeMinor / 100,
        vatRate: input.money.vatRate,
        vatAmount: input.money.vatTotalMinor / 100,
        total: input.money.grandTotalMinor / 100,
      },
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
       fingerprint, payload_json, paid_by_payment_id, created_at, updated_at,
       grand_total_minor, currency
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11)`,
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
      input.money.grandTotalMinor,
      input.money.currency,
    ],
  );

  return { kind: 'created', orderId: created.orderId };
};

const confirmPayment = async (input: { orderId: string; paymentId: string }): Promise<ConfirmOrderPaymentResult> => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id = $1 FOR UPDATE', [input.orderId]);
  const row = rows[0];
  if (!row) return { kind: 'not-found' };
  if (row.paid_by_payment_id) return { kind: 'already-confirmed' };

  const payload = parseOrder(row);
  payload.order.paymentDetails.status = PaymentStatusEnum.Paid;
  payload.order.updatedAt = new Date().toISOString();
  await database.execute(
    `UPDATE checkout_orders
        SET payload_json = $1, paid_by_payment_id = $2, updated_at = $3
      WHERE id = $4`,
    [JSON.stringify(payload), input.paymentId, payload.order.updatedAt, input.orderId],
  );
  return { kind: 'confirmed' };
};

// Payment history and commercial fulfillment are separate: a held paid Order
// keeps its paid marker while the application recovers compensation.
const holdPaidForCompensation = async (input: { orderId: string; paymentId: string }): Promise<{ kind: 'held' | 'conflict' }> => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id=$1 FOR UPDATE', [input.orderId]);
  if (!row || row.paid_by_payment_id) return { kind: 'conflict' };
  const payload = parseOrder(row);
  if (payload.order.status !== OrderStatus.Pending) return { kind: 'conflict' };
  payload.order.status = OrderStatus.OnHold;
  payload.order.paymentDetails.status = PaymentStatusEnum.Paid;
  payload.order.updatedAt = new Date().toISOString();
  await database.execute('UPDATE checkout_orders SET payload_json=$1, paid_by_payment_id=$2, updated_at=$3 WHERE id=$4', [
    JSON.stringify(payload),
    input.paymentId,
    payload.order.updatedAt,
    input.orderId,
  ]);
  return { kind: 'held' };
};

// Validate compensation history while holding the same Order lock used by
// Order mutations; application workflows must not interpret Orders payload SQL.
const isPaidCompensationHeld = async (input: { orderId: string; paymentId: string }): Promise<boolean> => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id=$1 FOR UPDATE', [input.orderId]);
  if (!row || row.paid_by_payment_id !== input.paymentId) return false;
  const payload = parseOrder(row);
  return payload.order.status === OrderStatus.OnHold && payload.order.paymentDetails.status === PaymentStatusEnum.Paid;
};

// Refund success cancels a paid held Order; it never reopens fulfillment or the hold.
const settlePaidCompensation = async (input: { orderId: string; paymentId: string }): Promise<boolean> => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id=$1 FOR UPDATE', [input.orderId]);
  if (!row || row.paid_by_payment_id !== input.paymentId) return false;
  const payload = parseOrder(row);
  if (
    payload.order.paymentDetails.status !== PaymentStatusEnum.Paid ||
    ![OrderStatus.OnHold, OrderStatus.Canceled].includes(payload.order.status)
  )
    return false;
  payload.order.status = OrderStatus.Canceled;
  payload.order.updatedAt = new Date().toISOString();
  await database.execute('UPDATE checkout_orders SET payload_json=$1, updated_at=$2 WHERE id=$3', [
    JSON.stringify(payload),
    payload.order.updatedAt,
    input.orderId,
  ]);
  return true;
};

export type OrderPaymentPreparation = Readonly<{
  orderId: string;
  grandTotalMinor: number;
  currency: 'RON';
  paidByPaymentId: string | null;
}>;

const getPaymentPreparation = async (orderId: string): Promise<OrderPaymentPreparation | null> => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id = $1', [orderId]);
  const row = rows[0];
  return row
    ? { orderId: row.id, grandTotalMinor: Number(row.grand_total_minor), currency: row.currency, paidByPaymentId: row.paid_by_payment_id }
    : null;
};

const getPaidRecoveryPreparation = async (orderId: string) => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id=$1 FOR UPDATE', [orderId]);
  if (!row || row.paid_by_payment_id) return null;
  try {
    const payload = parseOrder(row);
    if (payload.order.status !== OrderStatus.Pending || payload.order.paymentDetails.status !== PaymentStatusEnum.Pending) return null;
    const products: unknown = payload.order.products;
    if (!Array.isArray(products) || products.length === 0) return null;
    const items: ReservationItem[] = [];
    for (const value of products as unknown[]) {
      if (!value || typeof value !== 'object') return null;
      const product = value as Record<string, unknown>;
      if (
        !product ||
        typeof product.id !== 'string' ||
        !product.id ||
        typeof product.stock !== 'number' ||
        !Number.isSafeInteger(product.stock) ||
        product.stock < 0 ||
        typeof product.backorder_stock !== 'number' ||
        !Number.isSafeInteger(product.backorder_stock) ||
        product.backorder_stock < 0 ||
        product.stock + product.backorder_stock <= 0 ||
        !Number.isSafeInteger(product.stock + product.backorder_stock) ||
        items.some((item) => item.productId === product.id)
      )
        return null;
      items.push({ productId: product.id, immediateQuantity: product.stock, backorderQuantity: product.backorder_stock });
    }
    return { items, backorderShippingTypeId: payload.order.shippingDetails?.backorderShippingTypeId };
  } catch {
    return null;
  }
};

const confirmPaidRecovery = async (input: {
  orderId: string;
  paymentId: string;
  reservationId: string;
  items: readonly ReservationItem[];
}) => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id=$1 FOR UPDATE', [input.orderId]);
  if (!row || row.paid_by_payment_id) throw new Error('The recovery Order changed before paid confirmation.');
  const payload = parseOrder(row);
  if (payload.order.status !== OrderStatus.Pending || payload.order.paymentDetails.status !== PaymentStatusEnum.Pending)
    throw new Error('The recovery Order is no longer pending.');
  payload.order.paymentDetails.status = PaymentStatusEnum.Paid;
  payload.order.updatedAt = new Date().toISOString();
  // Keep accepted products, buyer choice and money immutable; record the new
  // fulfillment buckets separately from the frozen commercial snapshot.
  payload.fulfillment = { reservationId: input.reservationId, items: input.items };
  const updated = await database.execute('UPDATE checkout_orders SET payload_json=$1, paid_by_payment_id=$2, updated_at=$3 WHERE id=$4', [
    JSON.stringify(payload),
    input.paymentId,
    payload.order.updatedAt,
    input.orderId,
  ]);
  if (updated !== 1) throw new Error('The recovery Order disappeared during paid confirmation.');
};

// Read-only domain preparation: callers validate checkout identity without
// reading customer data or interpreting the Orders payload themselves.
const getCheckoutStatePreparation = async (orderId: string) => {
  const database = await getCheckoutDatabase();
  const [row] = await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE id=$1', [orderId]);
  if (!row) return null;
  let payload: PersistedOrderResponse;
  try {
    payload = parseOrder(row);
  } catch {
    return null;
  }
  const status = payload?.order?.status;
  const paymentStatus = payload?.order?.paymentDetails?.status;
  return {
    ownerId: row.customer_id,
    requestId: row.checkout_request_id,
    cartId: row.source_cart_id,
    cartRevision: Number(row.source_cart_revision),
    grandTotalMinor: Number(row.grand_total_minor),
    currency: row.currency,
    paidByPaymentId: row.paid_by_payment_id,
    unpaidPending: status === OrderStatus.Pending && paymentStatus === PaymentStatusEnum.Pending,
    paidHeld: status === OrderStatus.OnHold && paymentStatus === PaymentStatusEnum.Paid,
    paidCanceled: status === OrderStatus.Canceled && paymentStatus === PaymentStatusEnum.Paid,
    paidFulfillable:
      [
        OrderStatus.Pending,
        OrderStatus.Processing,
        OrderStatus.Packaging,
        OrderStatus.Dispatched,
        OrderStatus.Delivered,
        OrderStatus.Completed,
      ].includes(status) && paymentStatus === PaymentStatusEnum.Paid,
  };
};

const findById = async (id?: string | null, customerId?: string) => {
  if (!id) return null;
  const searchId = String(id).toLowerCase();
  const database = await getCheckoutDatabase();
  let rows = customerId
    ? await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId])
    : await database.query<OrderRow>(`SELECT * FROM checkout_orders ORDER BY created_at DESC`);
  const row = rows.find((candidate) => {
    const payload = parseOrder(candidate);
    const orderId = String(payload.order._id || '').toLowerCase();
    const shortId = String(payload.order.shortId || '').toLowerCase();
    return orderId === searchId || shortId === searchId || shortId.replace('#', '') === searchId;
  });
  if (row) return parseOrder(row);

  await ensureDemoOrdersPersisted();
  rows = customerId
    ? await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId])
    : await database.query<OrderRow>(`SELECT * FROM checkout_orders ORDER BY created_at DESC`);
  const seededRow = rows.find((candidate) => {
    const payload = parseOrder(candidate);
    const orderId = String(payload.order._id || '').toLowerCase();
    const shortId = String(payload.order.shortId || '').toLowerCase();
    return orderId === searchId || shortId === searchId || shortId.replace('#', '') === searchId;
  });
  return seededRow ? parseOrder(seededRow) : null;
};

const list = async (customerId?: string) => {
  await ensureDemoOrdersPersisted();
  const database = await getCheckoutDatabase();
  const rows = customerId
    ? await database.query<OrderRow>('SELECT * FROM checkout_orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId])
    : await database.query<OrderRow>(`SELECT * FROM checkout_orders ORDER BY created_at DESC`);
  return rows.map((row) => parseOrder(row).order);
};

export const orders = {
  createPending,
  confirmPayment,
  holdPaidForCompensation,
  isPaidCompensationHeld,
  settlePaidCompensation,
  getPaymentPreparation,
  getPaidRecoveryPreparation,
  confirmPaidRecovery,
  getCheckoutStatePreparation,
  findById,
  list,
};
