import { finalizePaidCheckout } from './finalize-paid-checkout';
import { readOrderPaymentSnapshot, readOrderPaymentState, type OrderPaymentState } from './read-order-payment-state';
import { stripePayments } from './stripe-payment';
import { terminalizeCanceledCheckout } from './terminalize-canceled-checkout';
import type { ReconcilePaymentResult } from '~/server/domain/payments';
import { assertOutsideCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type PaymentReconciler = { reconcilePayment(input: { paymentId: string }): Promise<ReconcilePaymentResult> };

export const createRefreshOrderPayment =
  (reconciler: PaymentReconciler) =>
  async (input: { ownerId: string; orderId: string }): Promise<OrderPaymentState> => {
    assertOutsideCheckoutTransaction('Order payment refresh');
    const prepared = await readOrderPaymentSnapshot(input);
    if (!prepared.paymentId || prepared.state.kind === 'compensation') return prepared.state;

    // The snapshot transaction has committed. Never wrap provider I/O in a
    // serializable callback, poll, create an intent, or accept browser payment truth.
    const payment = await reconciler.reconcilePayment({ paymentId: prepared.paymentId });
    let consequenceIncomplete = false;
    try {
      if (payment.kind === 'paid') {
        consequenceIncomplete = (await finalizePaidCheckout({ paymentId: prepared.paymentId, orderId: input.orderId })).kind === 'retry';
      } else if (payment.kind === 'canceled') {
        consequenceIncomplete =
          (await terminalizeCanceledCheckout({ paymentId: prepared.paymentId, orderId: input.orderId })).kind === 'retry';
      }
    } catch {
      // A committed Payment survives unfinished/rolled-back application work.
      // A later owner refresh or webhook retries the same consequence.
      consequenceIncomplete = true;
    }

    const current = await readOrderPaymentState(input);
    if (current.kind === 'not-found' || current.kind === 'compensation') return current;
    if (payment.kind === 'recovery-required' || payment.kind === 'terminal-failure') return { kind: 'recovery-required' };
    if (consequenceIncomplete && current.kind !== 'completed' && current.kind !== 'paid-finalizing') return { kind: 'recovery-required' };
    return current;
  };

export const refreshOrderPayment = createRefreshOrderPayment(stripePayments);
