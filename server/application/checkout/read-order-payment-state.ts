import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { orders } from '~/server/domain/orders';
import { payments } from '~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

export type OrderPaymentState =
  | { kind: 'pending' | 'processing' | 'paid-finalizing' | 'completed' | 'canceled' | 'recovery-required' | 'not-found' }
  | { kind: 'compensation'; recoveryRequired: boolean };

type ClaimRow = PersistedCheckoutState & {
  request_id: string;
  cart_id: string;
  cart_revision: number;
  payment_id: string | null;
  reservation_id: string | null;
};

type OrderPaymentSnapshot = { state: OrderPaymentState; paymentId: string | null };
const snapshot = (state: OrderPaymentState, paymentId: string | null = null): OrderPaymentSnapshot => ({ state, paymentId });

// The internal snapshot binds an owner-validated Payment to its classified state.
// Only the application refresh composition uses its identity; HTTP never exposes it.
// A local snapshot is informational; it never authorizes payment confirmation.
// Start our own serializable snapshot rather than inheriting a caller's writes.
export const readOrderPaymentSnapshot = async (input: { ownerId: string; orderId: string }): Promise<OrderPaymentSnapshot> => {
  assertOutsideCheckoutTransaction('Order payment state read');
  return withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<ClaimRow>(
      `SELECT request_id,cart_id,cart_revision,payment_id,reservation_id,workflow_status,paid_recovery_decision
         FROM checkout_claims WHERE owner_id=$1 AND order_id=$2`,
      [input.ownerId, input.orderId],
    );
    const claim = parseCheckoutClaim(persistedClaim);
    if (!persistedClaim) return snapshot({ kind: 'not-found' });
    if (!claim) return snapshot({ kind: 'recovery-required' });
    const order = await orders.getCheckoutStatePreparation(input.orderId);
    if (order && order.ownerId !== input.ownerId) return snapshot({ kind: 'not-found' });
    if (!order || !claim.payment_id || !claim.reservation_id) return snapshot({ kind: 'recovery-required' });
    const payment = await payments.getPaymentPreparation(claim.payment_id);
    if (
      !payment ||
      payment.orderId !== input.orderId ||
      order.requestId !== claim.request_id ||
      order.cartId !== claim.cart_id ||
      order.cartRevision !== Number(claim.cart_revision) ||
      payment.amountMinor !== order.grandTotalMinor ||
      payment.currency !== order.currency ||
      order.currency !== 'RON' ||
      (order.paidByPaymentId !== null && order.paidByPaymentId !== claim.payment_id)
    )
      return snapshot({ kind: 'recovery-required' });

    // Even finalized compensation is not ordinary completion or refund truth.
    if (claim.paid_recovery_decision === 'REFUND') {
      if (
        payment.status !== 'PAID' ||
        !(order.paidHeld || (claim.workflow_status === 'finalized' && order.paidCanceled)) ||
        order.paidByPaymentId !== claim.payment_id ||
        !['compensation_pending', 'compensation_recovery_required', 'finalized'].includes(claim.workflow_status)
      )
        return snapshot({ kind: 'recovery-required' });
      return snapshot(
        { kind: 'compensation', recoveryRequired: claim.workflow_status === 'compensation_recovery_required' },
        claim.payment_id,
      );
    }
    if (claim.paid_recovery_decision !== null && !['ALLOCATE', 'BACKORDER'].includes(claim.paid_recovery_decision))
      return snapshot({ kind: 'recovery-required' });
    if (payment.status === 'PAID') {
      if (claim.workflow_status === 'finalized' && order.paidByPaymentId === claim.payment_id && order.paidFulfillable)
        return snapshot({ kind: 'completed' }, claim.payment_id);
      if (['payment_pending', 'recovery_required'].includes(claim.workflow_status) && !order.paidByPaymentId && order.unpaidPending)
        return snapshot({ kind: 'paid-finalizing' }, claim.payment_id);
      return snapshot({ kind: 'recovery-required' });
    }
    if (order.paidByPaymentId || !order.unpaidPending || claim.paid_recovery_decision !== null)
      return snapshot({ kind: 'recovery-required' });
    if (payment.status === 'CANCELED' && ['payment_pending', 'recovery_required', 'canceled'].includes(claim.workflow_status))
      return snapshot({ kind: 'canceled' }, claim.payment_id);
    if (claim.workflow_status === 'payment_pending') {
      if (payment.status === 'PENDING') return snapshot({ kind: 'pending' }, claim.payment_id);
      if (payment.status === 'PROCESSING') return snapshot({ kind: 'processing' }, claim.payment_id);
    }
    // An otherwise consistent unpaid claim can still need provider reconciliation.
    // This identity grants refresh authority only, never confirmation authority.
    if (claim.workflow_status === 'recovery_required' && (payment.status === 'PENDING' || payment.status === 'PROCESSING'))
      return snapshot({ kind: 'recovery-required' }, claim.payment_id);
    return snapshot({ kind: 'recovery-required' });
  });
};

export const readOrderPaymentState = async (input: { ownerId: string; orderId: string }): Promise<OrderPaymentState> =>
  (await readOrderPaymentSnapshot(input)).state;
