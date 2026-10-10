import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { orders } from '~~/server/domain/orders';
import { payments } from '~~/server/domain/payments';
import { getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

type CompensationClaim = PersistedCheckoutState & {
  order_id: string | null;
  reservation_id: string | null;
  payment_id: string | null;
};

// Explicitly commit the REFUND branch selected by an application caller. The
// allocation/backorder/refund selection policy and provider continuation are #558.
export const commitRefundCompensation = async (input: {
  paymentId: string;
  orderId: string;
}): Promise<{ kind: 'established' | 'conflict' }> =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<CompensationClaim>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [
      input.paymentId,
    ]);
    const claim = parseCheckoutClaim(persistedClaim);
    if (!claim || claim.order_id !== input.orderId || claim.payment_id !== input.paymentId || !claim.reservation_id)
      return { kind: 'conflict' };
    const payment = await payments.getPaymentPreparation(input.paymentId);
    if (payment?.status !== 'PAID' || payment.orderId !== input.orderId) return { kind: 'conflict' };

    if (claim.paid_recovery_decision === 'REFUND') {
      // A replay must not erase failure recovery or completed refund settlement.
      return {
        kind: ['compensation_pending', 'compensation_recovery_required', 'finalized'].includes(claim.workflow_status)
          ? 'established'
          : 'conflict',
      };
    }
    if (claim.paid_recovery_decision !== null || !['payment_pending', 'recovery_required'].includes(claim.workflow_status))
      return { kind: 'conflict' };

    const held = await orders.holdPaidForCompensation(input);
    if (held.kind !== 'held') return { kind: 'conflict' };
    const updated = await database.execute(
      `UPDATE checkout_claims SET paid_recovery_decision='REFUND', workflow_status='compensation_pending', updated_at=$1
        WHERE payment_id=$2 AND order_id=$3 AND paid_recovery_decision IS NULL
          AND workflow_status IN ('payment_pending','recovery_required')`,
      [new Date().toISOString(), input.paymentId, input.orderId],
    );
    if (updated !== 1) throw new Error('The paid checkout claim changed during compensation commit.');
    return { kind: 'established' };
  });
