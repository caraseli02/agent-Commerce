import { parseCheckoutClaim, type PersistedCheckoutState, type PaidRecoveryDecision } from './contracts';
import { commitRefundCompensation } from './commit-refund-compensation';
import { inventory } from '~/server/domain/inventory';
import { orders } from '~/server/domain/orders';
import { payments } from '~/server/domain/payments';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type ClaimRow = PersistedCheckoutState & {
  owner_id: string;
  request_id: string;
  cart_id: string;
  cart_revision: number;
  payment_id: string | null;
  order_id: string | null;
  reservation_id: string | null;
};

export type LatePaidRecoveryResult = { kind: 'decided'; decision: PaidRecoveryDecision } | { kind: 'retry' };

// Local consequences only. The caller resumes provider compensation outside
// this transaction, and performs revision-aware Cart cleanup after fulfillment.
export const recoverLatePaidCheckout = async (input: { paymentId: string; orderId: string }): Promise<LatePaidRecoveryResult> =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persisted] = await database.query<ClaimRow>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [input.paymentId]);
    const claim = parseCheckoutClaim(persisted);
    if (!claim || claim.payment_id !== input.paymentId || claim.order_id !== input.orderId || !claim.reservation_id)
      return { kind: 'retry' };
    const payment = await payments.getPaymentPreparationForUpdate(input.paymentId);
    const order = await orders.getCheckoutStatePreparation(input.orderId);
    if (
      !payment ||
      payment.status !== 'PAID' ||
      payment.orderId !== input.orderId ||
      !order ||
      payment.amountMinor !== order.grandTotalMinor ||
      payment.currency !== order.currency ||
      order.ownerId !== claim.owner_id ||
      order.requestId !== claim.request_id ||
      order.cartId !== claim.cart_id ||
      order.cartRevision !== claim.cart_revision
    )
      return { kind: 'retry' };

    if (claim.paid_recovery_decision !== null) {
      const refund = claim.paid_recovery_decision === 'REFUND';
      const valid =
        order.paidByPaymentId === input.paymentId &&
        (refund
          ? (['compensation_pending', 'compensation_recovery_required'].includes(claim.workflow_status) && order.paidHeld) ||
            (claim.workflow_status === 'finalized' && order.paidCanceled)
          : claim.workflow_status === 'finalized' && order.paidFulfillable);
      return valid ? { kind: 'decided', decision: claim.paid_recovery_decision } : { kind: 'retry' };
    }
    if (!['payment_pending', 'recovery_required'].includes(claim.workflow_status) || !order.unpaidPending || order.paidByPaymentId)
      return { kind: 'retry' };
    const frozen = await orders.getPaidRecoveryPreparation(input.orderId);
    if (!frozen) return { kind: 'retry' };
    const recovered = await inventory.recoverPaidReservation({
      reservationId: claim.reservation_id,
      reservationKey: `${claim.owner_id}:${claim.request_id}`,
      ...frozen,
    });
    if (recovered.kind === 'retry') return { kind: 'retry' };
    if (recovered.kind === 'unavailable') {
      const refund = await commitRefundCompensation(input);
      if (refund.kind !== 'established') throw new Error('The locked paid checkout could not commit refund compensation.');
      return { kind: 'decided', decision: 'REFUND' };
    }
    const decision: PaidRecoveryDecision = recovered.kind === 'allocated' ? 'ALLOCATE' : 'BACKORDER';
    await orders.confirmPaidRecovery({ ...input, reservationId: recovered.reservation.id, items: recovered.reservation.items });
    const updated = await database.execute(
      `UPDATE checkout_claims SET paid_recovery_decision=$1, reservation_id=$2, workflow_status='finalized', updated_at=$3
        WHERE payment_id=$4 AND order_id=$5 AND paid_recovery_decision IS NULL
          AND workflow_status IN ('payment_pending','recovery_required')`,
      [decision, recovered.reservation.id, new Date().toISOString(), input.paymentId, input.orderId],
    );
    if (updated !== 1) throw new Error('The paid checkout claim changed during recovery.');
    return { kind: 'decided', decision };
  });
