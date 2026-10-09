import { randomUUID } from 'node:crypto';
import { mockProducts } from '~/server/utils/mockProducts';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

export type ReservationItem = Readonly<{
  productId: string;
  immediateQuantity: number;
  backorderQuantity: number;
}>;

export type InventoryReservation = Readonly<{
  id: string;
  reservationKey: string;
  items: readonly ReservationItem[];
  expiresAt: Date;
  status: 'active' | 'committed' | 'released' | 'expired';
}>;

export type ReserveInventoryResult =
  | { kind: 'created'; reservation: InventoryReservation }
  | { kind: 'existing'; reservation: InventoryReservation }
  | { kind: 'conflict' }
  | { kind: 'unavailable'; productId: string; requested: number; available: number };

export type CommitReservationResult =
  { kind: 'committed' } | { kind: 'already-committed' } | { kind: 'expired' } | { kind: 'released' } | { kind: 'not-found' };

export type ReleaseReservationResult =
  { kind: 'released' } | { kind: 'already-released' } | { kind: 'committed' } | { kind: 'expired' } | { kind: 'not-found' };

export type ReestablishReservationResult =
  | { kind: 'ready'; reservation: InventoryReservation }
  | { kind: 'unavailable'; productId: string; requested: number; available: number }
  | { kind: 'recovery-required' };

type ReservationRow = {
  id: string;
  reservation_key: string;
  fingerprint: string;
  items_json: string;
  expires_at: string;
  status: InventoryReservation['status'];
};

type InventoryRow = {
  product_id: string;
  on_hand: number;
  reserved: number;
};

const fingerprintItems = (items: readonly ReservationItem[]) =>
  JSON.stringify(
    [...items]
      .sort((a, b) => a.productId.localeCompare(b.productId))
      .map((item) => [item.productId, item.immediateQuantity, item.backorderQuantity]),
  );

const toPublicReservation = (row: ReservationRow): InventoryReservation => ({
  id: row.id,
  reservationKey: row.reservation_key,
  items: JSON.parse(row.items_json) as ReservationItem[],
  expiresAt: new Date(row.expires_at),
  status: row.status,
});

const readReservation = async (column: 'id' | 'reservation_key', value: string) => {
  const database = await getCheckoutDatabase();
  const rows = await database.query<ReservationRow>(
    `SELECT id, reservation_key, fingerprint, items_json, expires_at, status
       FROM checkout_reservations WHERE ${column} = $1 FOR UPDATE`,
    [value],
  );
  return rows[0] || null;
};

const changeReservedQuantity = async (items: readonly ReservationItem[], direction: 1 | -1) => {
  const database = await getCheckoutDatabase();
  for (const item of items) {
    await database.execute(
      `UPDATE checkout_inventory
          SET reserved = reserved + $1
        WHERE product_id = $2`,
      [direction * item.immediateQuantity, item.productId],
    );
  }
};

const expireIfNeeded = async (row: ReservationRow) => {
  if (row.status !== 'active' || new Date(row.expires_at).getTime() > Date.now()) return row;

  const items = JSON.parse(row.items_json) as ReservationItem[];
  await changeReservedQuantity(items, -1);
  const database = await getCheckoutDatabase();
  await database.execute("UPDATE checkout_reservations SET status = 'expired' WHERE id = $1", [row.id]);
  row.status = 'expired';
  return row;
};

const ensureInventoryRow = async (productId: string) => {
  const product = mockProducts.find((candidate) => candidate._id === productId || candidate.code === productId);
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_inventory (product_id, on_hand, reserved)
     VALUES ($1, $2, 0)
     ON CONFLICT (product_id) DO NOTHING`,
    [productId, Math.max(0, Number(product?.stock || 0))],
  );

  const rows = await database.query<InventoryRow>(
    'SELECT product_id, on_hand, reserved FROM checkout_inventory WHERE product_id = $1 FOR UPDATE',
    [productId],
  );
  return rows[0];
};

const reserve = async (input: {
  reservationKey: string;
  items: readonly ReservationItem[];
  expiresAt: Date;
}): Promise<ReserveInventoryResult> => {
  const fingerprint = fingerprintItems(input.items);
  const existing = await readReservation('reservation_key', input.reservationKey);

  if (existing) {
    await expireIfNeeded(existing);
    if (existing.fingerprint !== fingerprint) return { kind: 'conflict' };
    return { kind: 'existing', reservation: toPublicReservation(existing) };
  }

  for (const item of input.items) {
    const row = await ensureInventoryRow(item.productId);
    const available = Math.max(0, Number(row?.on_hand || 0) - Number(row?.reserved || 0));
    if (item.immediateQuantity > available) {
      return {
        kind: 'unavailable',
        productId: item.productId,
        requested: item.immediateQuantity,
        available,
      };
    }
  }

  const reservation: InventoryReservation = {
    id: `res-${randomUUID()}`,
    reservationKey: input.reservationKey,
    items: input.items.map((item) => ({ ...item })),
    expiresAt: new Date(input.expiresAt),
    status: 'active',
  };
  const database = await getCheckoutDatabase();
  await database.execute(
    `INSERT INTO checkout_reservations (id, reservation_key, fingerprint, items_json, expires_at, status)
     VALUES ($1, $2, $3, $4, $5, 'active')`,
    [reservation.id, reservation.reservationKey, fingerprint, JSON.stringify(reservation.items), reservation.expiresAt.toISOString()],
  );
  await changeReservedQuantity(reservation.items, 1);

  return { kind: 'created', reservation };
};

const reestablishReservation = async (reservationId: string, expiresAt: Date): Promise<ReestablishReservationResult> => {
  const previous = await readReservation('id', reservationId);
  if (!previous) return { kind: 'recovery-required' };
  await expireIfNeeded(previous);
  if (previous.status === 'active') return { kind: 'ready', reservation: toPublicReservation(previous) };
  if (previous.status !== 'expired') return { kind: 'recovery-required' };

  const next = await reserve({
    reservationKey: `${previous.reservation_key}:after:${previous.id}`,
    items: JSON.parse(previous.items_json) as ReservationItem[],
    expiresAt,
  });
  if (next.kind === 'unavailable') return next;
  if (next.kind === 'conflict' || next.reservation.status !== 'active') return { kind: 'recovery-required' };
  return { kind: 'ready', reservation: next.reservation };
};

const isReservationActive = async (reservationId: string): Promise<boolean> => {
  const row = await readReservation('id', reservationId);
  if (!row) return false;
  await expireIfNeeded(row);
  return row.status === 'active';
};

const commit = async (reservationId: string): Promise<CommitReservationResult> => {
  const row = await readReservation('id', reservationId);
  if (!row) return { kind: 'not-found' };
  await expireIfNeeded(row);
  if (row.status === 'committed') return { kind: 'already-committed' };
  if (row.status === 'expired') return { kind: 'expired' };
  if (row.status === 'released') return { kind: 'released' };

  const items = JSON.parse(row.items_json) as ReservationItem[];
  const database = await getCheckoutDatabase();
  for (const item of items) {
    await database.execute(
      `UPDATE checkout_inventory
          SET reserved = reserved - $1, on_hand = on_hand - $2
        WHERE product_id = $3`,
      [item.immediateQuantity, item.immediateQuantity, item.productId],
    );
  }
  await database.execute("UPDATE checkout_reservations SET status = 'committed' WHERE id = $1", [reservationId]);
  return { kind: 'committed' };
};

const release = async (reservationId: string): Promise<ReleaseReservationResult> => {
  const row = await readReservation('id', reservationId);
  if (!row) return { kind: 'not-found' };
  await expireIfNeeded(row);
  if (row.status === 'released') return { kind: 'already-released' };
  if (row.status === 'committed') return { kind: 'committed' };
  if (row.status === 'expired') return { kind: 'expired' };

  const items = JSON.parse(row.items_json) as ReservationItem[];
  await changeReservedQuantity(items, -1);
  const database = await getCheckoutDatabase();
  await database.execute("UPDATE checkout_reservations SET status = 'released' WHERE id = $1", [reservationId]);
  return { kind: 'released' };
};

export type RecoverPaidInventoryResult =
  { kind: 'allocated' | 'backordered'; reservation: InventoryReservation } | { kind: 'unavailable' } | { kind: 'retry' };

// Inventory owns the demo backorder policy. An absent/unknown frozen buyer
// choice never grants permission to turn immediate quantities into backorders.
const recoverPaidReservation = async (input: {
  reservationId: string;
  items: readonly ReservationItem[];
  backorderShippingTypeId?: string;
}): Promise<RecoverPaidInventoryResult> => {
  const previous = await readReservation('id', input.reservationId);
  if (!previous) return { kind: 'retry' };
  let previousItems: ReservationItem[];
  try {
    previousItems = JSON.parse(previous.items_json);
    if (!Array.isArray(previousItems) || fingerprintItems(previousItems) !== fingerprintItems(input.items)) return { kind: 'retry' };
  } catch {
    return { kind: 'retry' };
  }
  await expireIfNeeded(previous);
  if (previous.status !== 'expired' && previous.status !== 'released') return { kind: 'retry' };

  const plan: ReservationItem[] = [];
  for (const item of [...input.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
    const row = await ensureInventoryRow(item.productId);
    const quantity = item.immediateQuantity + item.backorderQuantity;
    const immediateQuantity = Math.min(quantity, Math.max(0, Number(row?.on_hand || 0) - Number(row?.reserved || 0)));
    plan.push({ productId: item.productId, immediateQuantity, backorderQuantity: quantity - immediateQuantity });
  }
  const backordered = plan.some((item) => item.backorderQuantity > 0);
  if (
    backordered &&
    (input.backorderShippingTypeId !== 'back-001' ||
      plan.some(
        (item) =>
          item.backorderQuantity > 0 &&
          !mockProducts.some((product) => product.active && (product._id === item.productId || product.code === item.productId)),
      ))
  )
    return { kind: 'unavailable' };

  const reserved = await reserve({
    reservationKey: `${previous.reservation_key}:late-paid:${previous.id}`,
    items: plan,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  if (reserved.kind !== 'created' && reserved.kind !== 'existing') throw new Error('The locked paid Inventory plan could not be reserved.');
  const committed = await commit(reserved.reservation.id);
  if (committed.kind !== 'committed' && committed.kind !== 'already-committed')
    throw new Error('The paid Inventory plan could not be committed.');
  return { kind: backordered ? 'backordered' : 'allocated', reservation: { ...reserved.reservation, status: 'committed' } };
};

export const inventory = { reserve, reestablishReservation, isReservationActive, commit, release, recoverPaidReservation };
