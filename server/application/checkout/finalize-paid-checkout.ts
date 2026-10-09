import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { cart } from '~~/server/domain/cart';
import { inventory } from '~~/server/domain/inventory';
import { orders } from '~~/server/domain/orders';
import { payments } from '~~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~~/server/infrastructure/checkout-database';

type ClaimRow = PersistedCheckoutState & {
  owner_id: string;
  request_id: string;
  cart_id: string;
  cart_revision: number;
  order_id: string | null;
  reservation_id: string | null;
  payment_id: string | null;
};

type Finalization = { kind: 'retry' } | { kind: 'finalized'; cartId: string; ownerId: string; cartRevision: number };

export const finalizePaidCheckout = async (input: { paymentId: string; orderId: string }): Promise<{ kind: 'finalized' | 'retry' }> => {
  assertOutsideCheckoutTransaction('Paid checkout finalization');

  const result = await withCheckoutTransaction(async (): Promise<Finalization> => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<ClaimRow>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [
      input.paymentId,
    ]);
    const claim = parseCheckoutClaim(persistedClaim);
    if (!claim || claim.payment_id !== input.paymentId || claim.order_id !== input.orderId || !claim.reservation_id)
      return { kind: 'retry' };

    // The durable decision forbids fulfillment even if a workflow status is stale.
    if (claim.paid_recovery_decision === 'REFUND') return { kind: 'retry' };

    const payment = await payments.getPaymentPreparation(input.paymentId);
    if (payment?.status !== 'PAID' || payment.orderId !== input.orderId) return { kind: 'retry' };

    const order = await orders.getPaymentPreparation(input.orderId);
    if (!order || (order.paidByPaymentId && order.paidByPaymentId !== input.paymentId)) return { kind: 'retry' };

    if (claim.workflow_status !== 'finalized') {
      // Later compensation states must never enter the fulfillment path.
      if (claim.workflow_status !== 'payment_pending' && claim.workflow_status !== 'recovery_required') return { kind: 'retry' };

      const committed = await inventory.commit(claim.reservation_id);
      if (committed.kind !== 'committed' && committed.kind !== 'already-committed') return { kind: 'retry' };

      const confirmed = await orders.confirmPayment({ orderId: input.orderId, paymentId: input.paymentId });
      if (confirmed.kind === 'not-found') throw new Error('The paid Order disappeared during checkout finalization.');

      const updated = await database.execute(
        `UPDATE checkout_claims SET workflow_status='finalized', updated_at=$1
          WHERE owner_id=$2 AND request_id=$3 AND payment_id=$4 AND order_id=$5
            AND workflow_status IN ('payment_pending','recovery_required')`,
        [new Date().toISOString(), claim.owner_id, claim.request_id, input.paymentId, input.orderId],
      );
      if (updated !== 1) throw new Error('The paid checkout claim changed during finalization.');
    } else if (order.paidByPaymentId !== input.paymentId) {
      return { kind: 'retry' };
    }

    return { kind: 'finalized', cartId: claim.cart_id, ownerId: claim.owner_id, cartRevision: claim.cart_revision };
  });

  if (result.kind === 'retry') return result;

  try {
    await withCheckoutTransaction(async () =>
      cart.completeCheckout({
        cartId: result.cartId,
        ownerId: result.ownerId,
        expectedRevision: String(result.cartRevision),
      }),
    );
  } catch {
    // Cart cleanup is best effort after critical finalization has committed.
  }
  return { kind: 'finalized' };
};
