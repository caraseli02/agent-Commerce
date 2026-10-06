import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { orders } from '~/server/domain/orders';
import { payments } from '~/server/domain/payments';
import { getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type CompensationClaim = PersistedCheckoutState & {
  owner_id: string;
  request_id: string;
  cart_id: string;
  cart_revision: number;
  order_id: string | null;
  payment_id: string | null;
  reservation_id: string | null;
};

// Checkout owns authorization; Payments prepares its financial fact while the
// irrevocable REFUND decision and held Order are locked. No provider I/O here.
export const withRefundCompensation = async <T>(
  input: { paymentId: string; orderId: string },
  prepare: () => Promise<T>,
): Promise<T | null> =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [stored] = await database.query<CompensationClaim>('SELECT * FROM checkout_claims WHERE payment_id=$1 FOR UPDATE', [
      input.paymentId,
    ]);
    const claim = parseCheckoutClaim(stored);
    if (
      !stored ||
      !claim ||
      claim.payment_id !== input.paymentId ||
      claim.order_id !== input.orderId ||
      !claim.reservation_id ||
      claim.paid_recovery_decision !== 'REFUND' ||
      !['compensation_pending', 'compensation_recovery_required'].includes(claim.workflow_status)
    )
      return null;
    const order = await orders.getCheckoutStatePreparation(input.orderId);
    const payment = await payments.getPaymentPreparation(input.paymentId);
    if (
      !order?.paidHeld ||
      order.paidByPaymentId !== input.paymentId ||
      order.ownerId !== stored.owner_id ||
      order.requestId !== stored.request_id ||
      order.cartId !== stored.cart_id ||
      order.cartRevision !== Number(stored.cart_revision) ||
      payment?.status !== 'PAID' ||
      payment.orderId !== input.orderId ||
      payment.amountMinor !== order.grandTotalMinor ||
      payment.currency !== order.currency ||
      !(await orders.isPaidCompensationHeld(input))
    )
      return null;
    return prepare();
  });
