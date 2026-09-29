import { inventory } from '~/server/domain/inventory';
import { orders } from '~/server/domain/orders';
import { payments, type InitiatePaymentResult } from '~/server/domain/payments';
import { assertOutsideCheckoutTransaction, getCheckoutDatabase, withCheckoutTransaction } from '~/server/infrastructure/checkout-database';
import { reestablishCheckoutReservation } from './reestablish-reservation';
import { stripePayments } from './stripe-payment';

type PaymentInitiator = {
  initiatePayment(input: { paymentId: string }): Promise<InitiatePaymentResult>;
};

export type ResumeOrderPaymentResult =
  | Extract<InitiatePaymentResult, { kind: 'requires-action' }>
  | { kind: 'processing' }
  | { kind: 'not-found' | 'not-payable' | 'recovery-required' }
  | { kind: 'unavailable'; productId: string; requested: number; available: number };

type ClaimRow = { reservation_id: string | null; payment_id: string | null; workflow_status: string };

const checkPayableCheckout = async (input: {
  ownerId: string;
  orderId: string;
  reservationId: string;
  paymentId?: string;
}): Promise<
  { kind: 'ready'; paymentId: string; paymentStatus: 'PENDING' | 'PROCESSING' } | { kind: 'not-payable' | 'recovery-required' }
> =>
  withCheckoutTransaction(async () => {
    const database = await getCheckoutDatabase();
    const [claim] = await database.query<ClaimRow>(
      'SELECT reservation_id,payment_id,workflow_status FROM checkout_claims WHERE owner_id=$1 AND order_id=$2 FOR UPDATE',
      [input.ownerId, input.orderId],
    );
    if (
      !claim ||
      claim.reservation_id !== input.reservationId ||
      !claim.payment_id ||
      (input.paymentId && claim.payment_id !== input.paymentId)
    )
      return { kind: 'recovery-required' };
    if (claim.workflow_status !== 'payment_pending' && claim.workflow_status !== 'recovery_required') return { kind: 'not-payable' };

    const payment = await payments.getPaymentPreparationForUpdate(claim.payment_id);
    const order = await orders.getPaymentPreparation(input.orderId);
    if (
      !payment ||
      !order ||
      payment.orderId !== input.orderId ||
      payment.amountMinor !== order.grandTotalMinor ||
      payment.currency !== order.currency
    )
      return { kind: 'recovery-required' };
    if (order.paidByPaymentId || payment.status === 'PAID' || payment.status === 'CANCELED' || payment.status === 'FAILED')
      return { kind: 'not-payable' };
    if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') return { kind: 'recovery-required' };
    if (!(await inventory.isReservationActive(input.reservationId))) return { kind: 'recovery-required' };
    return { kind: 'ready', paymentId: payment.paymentId, paymentStatus: payment.status };
  });

export const createResumeOrderPayment =
  (paymentInitiator: PaymentInitiator) =>
  async (input: { ownerId: string; orderId: string }): Promise<ResumeOrderPaymentResult> => {
    assertOutsideCheckoutTransaction('Order payment resume');

    const reservation = await reestablishCheckoutReservation(input);
    if (reservation.kind !== 'ready') return reservation;

    const prepared = await checkPayableCheckout({ ...input, reservationId: reservation.reservationId });
    if (prepared.kind !== 'ready') return prepared;

    const continuation = await paymentInitiator.initiatePayment({ paymentId: prepared.paymentId });
    if (continuation.kind === 'requires-action') {
      const current = await checkPayableCheckout({ ...input, reservationId: reservation.reservationId, paymentId: prepared.paymentId });
      if (current.kind !== 'ready') return current;
      return current.paymentStatus === 'PENDING' ? continuation : { kind: 'recovery-required' };
    }
    if (continuation.kind === 'processing') {
      const current = await checkPayableCheckout({ ...input, reservationId: reservation.reservationId, paymentId: prepared.paymentId });
      return current.kind === 'ready' ? { kind: 'processing' } : current;
    }
    return { kind: 'recovery-required' };
  };

export const resumeOrderPayment = createResumeOrderPayment(stripePayments);
