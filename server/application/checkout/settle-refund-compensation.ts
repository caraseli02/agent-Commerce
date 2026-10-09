import { orders } from '~/server/domain/orders';
import { payments, getRefundPreparationForUpdate } from '~/server/domain/payments';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';

type CompensationClaim = PersistedCheckoutState & {
  owner_id: string;
  request_id: string;
  cart_id: string;
  cart_revision: number;
  payment_id: string | null;
  order_id: string | null;
  reservation_id: string | null;
};

// Lock the same claim/order/payment/refund identities used by recovery. Financial
// transitions commit separately, and this consequence is safe to retry afterward.
export const settleRefundCompensation = async (input: {
  paymentId: string;
  orderId: string;
  refundId: string;
}): Promise<{ kind: 'settled' | 'retry' }> =>
  withCheckoutTransaction(async () => {
    const db = await getCheckoutDatabase();
    const [stored] = await db.query<CompensationClaim>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [input.paymentId]);
    const claim = parseCheckoutClaim(stored);
    if (
      !stored ||
      !claim ||
      claim.order_id !== input.orderId ||
      claim.payment_id !== input.paymentId ||
      !claim.reservation_id ||
      claim.paid_recovery_decision !== 'REFUND' ||
      !['compensation_pending', 'compensation_recovery_required', 'finalized'].includes(claim.workflow_status)
    )
      return { kind: 'retry' };
    const order = await orders.getCheckoutStatePreparation(input.orderId);
    const payment = await payments.getPaymentPreparationForUpdate(input.paymentId);
    const refund = await getRefundPreparationForUpdate(input.paymentId);
    if (
      !order ||
      order.paidByPaymentId !== input.paymentId ||
      order.ownerId !== stored.owner_id ||
      order.requestId !== stored.request_id ||
      order.cartId !== stored.cart_id ||
      order.cartRevision !== Number(stored.cart_revision) ||
      payment?.status !== 'PAID' ||
      payment.orderId !== input.orderId ||
      payment.amountMinor !== order.grandTotalMinor ||
      payment.currency !== order.currency ||
      refund?.refundId !== input.refundId ||
      refund.status !== 'SUCCEEDED' ||
      refund.orderId !== input.orderId ||
      (!order.paidHeld && !order.paidCanceled)
    )
      return { kind: 'retry' };
    if (claim.workflow_status === 'finalized') return { kind: order.paidCanceled ? 'settled' : 'retry' };
    if (!(await orders.settlePaidCompensation(input))) return { kind: 'retry' };
    await db.execute("UPDATE checkout_claims SET workflow_status='finalized',updated_at=$1 WHERE payment_id=$2", [
      new Date().toISOString(),
      input.paymentId,
    ]);
    return { kind: 'settled' };
  });
