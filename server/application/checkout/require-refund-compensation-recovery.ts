import { withRefundCompensation } from './with-refund-compensation';
import { orders } from '~/server/domain/orders';
import { getRefundPreparationForUpdate, payments } from '~/server/domain/payments';
import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

// Application consequence of a failed/unsafe continuation report. Provider
// interpretation and the future caller belong to #558; this never creates a Refund.
export const requireRefundCompensationRecovery = async (input: {
  paymentId: string;
  orderId: string;
}): Promise<{ kind: 'recovery-required' | 'conflict' }> =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [stored] = await database.query<
      PersistedCheckoutState & {
        order_id: string | null;
        payment_id: string | null;
        owner_id: string;
        request_id: string;
        cart_id: string;
        cart_revision: number;
      }
    >('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [input.paymentId]);
    const claim = parseCheckoutClaim(stored);
    if (claim?.workflow_status === 'finalized' && claim.paid_recovery_decision === 'REFUND' && claim.order_id === input.orderId) {
      const order = await orders.getCheckoutStatePreparation(input.orderId);
      const payment = await payments.getPaymentPreparationForUpdate(input.paymentId);
      const refund = await getRefundPreparationForUpdate(input.paymentId);
      if (
        !stored ||
        !order ||
        stored.payment_id !== input.paymentId ||
        order.ownerId !== stored.owner_id ||
        order.requestId !== stored.request_id ||
        order.cartId !== stored.cart_id ||
        order.cartRevision !== Number(stored.cart_revision) ||
        payment?.status !== 'PAID' ||
        payment.orderId !== input.orderId ||
        payment.amountMinor !== order.grandTotalMinor ||
        payment.currency !== order.currency ||
        refund?.status !== 'FAILED' ||
        refund.orderId !== input.orderId ||
        !(await orders.settlePaidCompensation({ ...input, failed: true }))
      )
        return { kind: 'conflict' };
      await database.execute(
        "UPDATE checkout_claims SET workflow_status='compensation_recovery_required',updated_at=$1 WHERE payment_id=$2",
        [new Date().toISOString(), input.paymentId],
      );
      return { kind: 'recovery-required' };
    }
    return (
      (await withRefundCompensation(input, async () => {
        const database = await getCheckoutDatabase();
        const [claim] = await database.query<{ workflow_status: unknown }>(
          'SELECT workflow_status FROM checkout_claims WHERE payment_id=$1',
          [input.paymentId],
        );
        if (claim?.workflow_status === 'compensation_recovery_required') return { kind: 'recovery-required' as const };

        const updated = await database.execute(
          `UPDATE checkout_claims SET workflow_status='compensation_recovery_required', updated_at=$1
        WHERE payment_id=$2 AND order_id=$3 AND paid_recovery_decision='REFUND'
          AND workflow_status='compensation_pending'`,
          [new Date().toISOString(), input.paymentId, input.orderId],
        );
        if (updated !== 1) throw new Error('The refund compensation claim changed during recovery transition.');
        return { kind: 'recovery-required' as const };
      })) ?? { kind: 'conflict' }
    );
  });
