import { withRefundCompensation } from './with-refund-compensation';
import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

// Application consequence of a failed/unsafe continuation report. Provider
// interpretation and the future caller belong to #558; this never creates a Refund.
export const requireRefundCompensationRecovery = async (input: {
  paymentId: string;
  orderId: string;
}): Promise<{ kind: 'recovery-required' | 'conflict' }> =>
  (await withRefundCompensation(input, async () => {
    const database = await getCheckoutDatabase();
    const [claim] = await database.query<{ workflow_status: unknown }>('SELECT workflow_status FROM checkout_claims WHERE payment_id=$1', [
      input.paymentId,
    ]);
    if (claim?.workflow_status === 'compensation_recovery_required') return { kind: 'recovery-required' as const };

    const updated = await database.execute(
      `UPDATE checkout_claims SET workflow_status='compensation_recovery_required', updated_at=$1
        WHERE payment_id=$2 AND order_id=$3 AND paid_recovery_decision='REFUND'
          AND workflow_status='compensation_pending'`,
      [new Date().toISOString(), input.paymentId, input.orderId],
    );
    if (updated !== 1) throw new Error('The refund compensation claim changed during recovery transition.');
    return { kind: 'recovery-required' as const };
  })) ?? { kind: 'conflict' };
