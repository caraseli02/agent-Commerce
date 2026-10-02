import { parseCheckoutClaim, type PersistedCheckoutState } from './contracts';
import { cart } from '~/server/domain/cart';
import { orders } from '~/server/domain/orders';
import { payments } from '~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type CanceledClaim = PersistedCheckoutState & {
  cart_id: string;
  cart_revision: number;
  order_id: string;
  payment_id: string | null;
};

export type RestartCanceledCheckoutResult =
  | { kind: 'review-required'; cartId: string; cartRevision: string }
  | { kind: 'not-found' }
  | { kind: 'not-canceled' }
  | { kind: 'cart-empty' }
  | { kind: 'recovery-required' };

export const restartCanceledCheckout = async (input: { ownerId: string; orderId: string }): Promise<RestartCanceledCheckoutResult> => {
  assertOutsideCheckoutTransaction('Canceled checkout restart');

  return withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [persistedClaim] = await database.query<CanceledClaim>(
      'SELECT cart_id, cart_revision, order_id, payment_id, workflow_status,paid_recovery_decision FROM checkout_claims WHERE owner_id=$1 AND order_id=$2 FOR UPDATE',
      [input.ownerId, input.orderId],
    );
    const claim = parseCheckoutClaim(persistedClaim);
    if (!persistedClaim) return { kind: 'not-found' };
    if (!claim) return { kind: 'not-canceled' };
    if (claim.workflow_status !== 'canceled' || !claim.payment_id) return { kind: 'not-canceled' };

    const payment = await payments.getPaymentPreparation(claim.payment_id);
    const order = await orders.getPaymentPreparation(claim.order_id);
    if (payment?.status !== 'CANCELED' || payment.orderId !== claim.order_id || !order || order.paidByPaymentId)
      return { kind: 'not-canceled' };

    const restarted = await cart.restartForReview({
      cartId: claim.cart_id,
      ownerId: input.ownerId,
      canceledRevision: String(claim.cart_revision),
    });
    if (restarted.kind === 'review-required')
      return { kind: 'review-required', cartId: claim.cart_id, cartRevision: restarted.cartRevision };
    if (restarted.kind === 'cart-empty') return { kind: 'cart-empty' };
    return { kind: 'recovery-required' };
  });
};
