import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { inventory } from '~~/server/domain/inventory';
import { orders } from '~~/server/domain/orders';
import { payments } from '~~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

type ClaimRow = PersistedCheckoutState & {
  owner_id: string;
  request_id: string;
  order_id: string | null;
  reservation_id: string | null;
  payment_id: string | null;
};

export const terminalizeCanceledCheckout = async (input: {
  paymentId: string;
  orderId: string;
}): Promise<{ kind: 'terminalized' | 'retry' }> => {
  assertOutsideCheckoutTransaction('Canceled checkout terminalization');

  return withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<ClaimRow>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [
      input.paymentId,
    ]);
    const claim = parseCheckoutClaim(persistedClaim);
    if (!claim || claim.payment_id !== input.paymentId || claim.order_id !== input.orderId || !claim.reservation_id)
      return { kind: 'retry' };

    const payment = await payments.getPaymentPreparation(input.paymentId);
    if (payment?.status !== 'CANCELED' || payment.orderId !== input.orderId) return { kind: 'retry' };

    const order = await orders.getPaymentPreparation(input.orderId);
    if (!order || order.paidByPaymentId) return { kind: 'retry' };
    if (!['payment_pending', 'recovery_required', 'canceled'].includes(claim.workflow_status)) return { kind: 'retry' };

    const release = await inventory.release(claim.reservation_id);
    if (!['released', 'already-released', 'expired'].includes(release.kind)) return { kind: 'retry' };

    if (claim.workflow_status !== 'canceled') {
      const updated = await database.execute(
        `UPDATE checkout_claims SET workflow_status='canceled', updated_at=$1
          WHERE owner_id=$2 AND request_id=$3 AND payment_id=$4 AND order_id=$5
            AND workflow_status IN ('payment_pending','recovery_required')`,
        [new Date().toISOString(), claim.owner_id, claim.request_id, input.paymentId, input.orderId],
      );
      if (updated !== 1) throw new Error('The canceled checkout claim changed during terminalization.');
    }

    return { kind: 'terminalized' };
  });
};
