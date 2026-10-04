import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { orders } from '~/server/domain/orders';
import { payments } from '~/server/domain/payments';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type CompensationClaim = PersistedCheckoutState & {
  order_id: string | null;
  reservation_id: string | null;
  payment_id: string | null;
};

// Application consequence of a failed/unsafe continuation report. Provider
// interpretation and the future caller belong to #558; this never creates a Refund.
export const requireRefundCompensationRecovery = async (input: {
  paymentId: string;
  orderId: string;
}): Promise<{ kind: 'recovery-required' | 'conflict' }> =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<CompensationClaim>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [
      input.paymentId,
    ]);
    const claim = parseCheckoutClaim(persistedClaim);
    if (
      !claim ||
      claim.payment_id !== input.paymentId ||
      claim.order_id !== input.orderId ||
      !claim.reservation_id ||
      claim.paid_recovery_decision !== 'REFUND' ||
      !['compensation_pending', 'compensation_recovery_required'].includes(claim.workflow_status)
    )
      return { kind: 'conflict' };

    const payment = await payments.getPaymentPreparation(input.paymentId);
    if (payment?.status !== 'PAID' || payment.orderId !== input.orderId || !(await orders.isPaidCompensationHeld(input)))
      return { kind: 'conflict' };
    if (claim.workflow_status === 'compensation_recovery_required') return { kind: 'recovery-required' };

    const updated = await database.execute(
      `UPDATE checkout_claims SET workflow_status='compensation_recovery_required', updated_at=$1
        WHERE payment_id=$2 AND order_id=$3 AND paid_recovery_decision='REFUND'
          AND workflow_status='compensation_pending'`,
      [new Date().toISOString(), input.paymentId, input.orderId],
    );
    if (updated !== 1) throw new Error('The refund compensation claim changed during recovery transition.');
    return { kind: 'recovery-required' };
  });
