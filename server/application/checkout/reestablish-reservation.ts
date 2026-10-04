import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { inventory } from '~/server/domain/inventory';
import { orders } from '~/server/domain/orders';
import { payments } from '~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type ClaimRow = PersistedCheckoutState & {
  request_id: string;
  reservation_id: string | null;
  payment_id: string | null;
};

export type ReestablishCheckoutReservationResult =
  | { kind: 'ready'; reservationId: string }
  | { kind: 'not-found' | 'not-payable' | 'recovery-required' }
  | { kind: 'unavailable'; productId: string; requested: number; available: number };

export const reestablishCheckoutReservation = async (input: {
  ownerId: string;
  orderId: string;
}): Promise<ReestablishCheckoutReservationResult> => {
  assertOutsideCheckoutTransaction('Checkout reservation re-establishment');

  return withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<ClaimRow>(
      'SELECT request_id, reservation_id, payment_id, workflow_status,paid_recovery_decision FROM checkout_claims WHERE owner_id=$1 AND order_id=$2 FOR UPDATE',
      [input.ownerId, input.orderId],
    );
    const claim = parseCheckoutClaim(persistedClaim);
    if (!persistedClaim) return { kind: 'not-found' };
    if (!claim) return { kind: 'recovery-required' };
    if (!claim.reservation_id || !claim.payment_id) return { kind: 'recovery-required' };
    if (claim.workflow_status !== 'payment_pending' && claim.workflow_status !== 'recovery_required') return { kind: 'not-payable' };

    const order = await orders.getPaymentPreparation(input.orderId);
    const payment = await payments.getPaymentPreparationForUpdate(claim.payment_id);
    if (
      !order ||
      !payment ||
      !payment.status ||
      payment.orderId !== input.orderId ||
      payment.amountMinor !== order.grandTotalMinor ||
      payment.currency !== order.currency
    )
      return { kind: 'recovery-required' };
    if (order.paidByPaymentId || (payment.status !== 'PENDING' && payment.status !== 'PROCESSING')) return { kind: 'not-payable' };

    const result = await inventory.reestablishReservation(claim.reservation_id, new Date(Date.now() + 15 * 60 * 1000));
    if (result.kind !== 'ready') return result;
    if (result.reservation.id !== claim.reservation_id) {
      const updated = await database.execute(
        `UPDATE checkout_claims SET reservation_id=$1, updated_at=$2
          WHERE owner_id=$3 AND request_id=$4 AND order_id=$5 AND reservation_id=$6
            AND workflow_status IN ('payment_pending','recovery_required')`,
        [result.reservation.id, new Date().toISOString(), input.ownerId, claim.request_id, input.orderId, claim.reservation_id],
      );
      if (updated !== 1) throw new Error('The checkout claim changed during reservation re-establishment.');
    }
    return { kind: 'ready', reservationId: result.reservation.id };
  });
};
