import { randomUUID } from 'node:crypto';
import { mockProducts } from '~/server/utils/mockProducts';

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
  | { kind: 'committed' }
  | { kind: 'already-committed' }
  | { kind: 'expired' }
  | { kind: 'released' }
  | { kind: 'not-found' };

export type ReleaseReservationResult =
  | { kind: 'released' }
  | { kind: 'already-released' }
  | { kind: 'committed' }
  | { kind: 'expired' }
  | { kind: 'not-found' };

type InventoryRow = {
  onHand: number;
  reserved: number;
};

type MutableReservation = {
  id: string;
  reservationKey: string;
  fingerprint: string;
  items: ReservationItem[];
  expiresAt: Date;
  status: 'active' | 'committed' | 'released' | 'expired';
};

const rows = new Map<string, InventoryRow>();
const reservationsByKey = new Map<string, MutableReservation>();
const reservationsById = new Map<string, MutableReservation>();

const getRow = (productId: string) => {
  const existing = rows.get(productId);

  if (existing) {
    return existing;
  }

  const product = mockProducts.find((candidate) => candidate._id === productId || candidate.code === productId);
  const created = {
    onHand: Math.max(0, Number(product?.stock || 0)),
    reserved: 0,
  };

  rows.set(productId, created);
  return created;
};

const fingerprintItems = (items: readonly ReservationItem[]) =>
  JSON.stringify(
    [...items]
      .sort((a, b) => a.productId.localeCompare(b.productId))
      .map((item) => [item.productId, item.immediateQuantity, item.backorderQuantity]),
  );

const toPublicReservation = (reservation: MutableReservation): InventoryReservation => ({
  id: reservation.id,
  reservationKey: reservation.reservationKey,
  items: reservation.items.map((item) => ({ ...item })),
  expiresAt: new Date(reservation.expiresAt),
  status: reservation.status,
});

const expireIfNeeded = (reservation: MutableReservation) => {
  if (reservation.status !== 'active' || reservation.expiresAt.getTime() > Date.now()) {
    return;
  }

  for (const item of reservation.items) {
    const row = getRow(item.productId);
    row.reserved = Math.max(0, row.reserved - item.immediateQuantity);
  }

  reservation.status = 'expired';
};

const reserve = async (input: {
  reservationKey: string;
  items: readonly ReservationItem[];
  expiresAt: Date;
}): Promise<ReserveInventoryResult> => {
  const fingerprint = fingerprintItems(input.items);
  const existing = reservationsByKey.get(input.reservationKey);

  if (existing) {
    expireIfNeeded(existing);

    if (existing.fingerprint !== fingerprint) {
      return { kind: 'conflict' };
    }

    return { kind: 'existing', reservation: toPublicReservation(existing) };
  }

  for (const item of input.items) {
    const row = getRow(item.productId);
    const available = Math.max(0, row.onHand - row.reserved);

    if (item.immediateQuantity > available) {
      return {
        kind: 'unavailable',
        productId: item.productId,
        requested: item.immediateQuantity,
        available,
      };
    }
  }

  const reservation: MutableReservation = {
    id: `res-${randomUUID()}`,
    reservationKey: input.reservationKey,
    fingerprint,
    items: input.items.map((item) => ({ ...item })),
    expiresAt: new Date(input.expiresAt),
    status: 'active',
  };

  for (const item of reservation.items) {
    getRow(item.productId).reserved += item.immediateQuantity;
  }

  reservationsByKey.set(input.reservationKey, reservation);
  reservationsById.set(reservation.id, reservation);

  return { kind: 'created', reservation: toPublicReservation(reservation) };
};

const commit = async (reservationId: string): Promise<CommitReservationResult> => {
  const reservation = reservationsById.get(reservationId);

  if (!reservation) {
    return { kind: 'not-found' };
  }

  expireIfNeeded(reservation);

  if (reservation.status === 'committed') {
    return { kind: 'already-committed' };
  }

  if (reservation.status === 'expired') {
    return { kind: 'expired' };
  }

  if (reservation.status === 'released') {
    return { kind: 'released' };
  }

  for (const item of reservation.items) {
    const row = getRow(item.productId);
    row.reserved = Math.max(0, row.reserved - item.immediateQuantity);
    row.onHand = Math.max(0, row.onHand - item.immediateQuantity);
  }

  reservation.status = 'committed';

  return { kind: 'committed' };
};

const release = async (reservationId: string): Promise<ReleaseReservationResult> => {
  const reservation = reservationsById.get(reservationId);

  if (!reservation) {
    return { kind: 'not-found' };
  }

  expireIfNeeded(reservation);

  if (reservation.status === 'released') {
    return { kind: 'already-released' };
  }

  if (reservation.status === 'committed') {
    return { kind: 'committed' };
  }

  if (reservation.status === 'expired') {
    return { kind: 'expired' };
  }

  for (const item of reservation.items) {
    const row = getRow(item.productId);
    row.reserved = Math.max(0, row.reserved - item.immediateQuantity);
  }

  reservation.status = 'released';

  return { kind: 'released' };
};

export const inventory = {
  reserve,
  commit,
  release,
};
