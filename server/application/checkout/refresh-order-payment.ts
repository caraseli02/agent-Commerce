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
    if (!prepared.refreshable) return prepared.state;

    // Provider I/O follows the committed snapshot, never a retryable transaction.
    let payment: ReconcilePaymentResult;
    try {
      payment = await reconciler.reconcilePayment({ paymentId: prepared.paymentId });
    } catch {
      // Do not log provider payloads, credentials, owner data or raw exceptions.
      console.error('[checkout.refresh] reconciliation failed');
      payment = { kind: 'recovery-required' };
    }

    // A concurrent webhook can establish terminal truth even when this request's
    // provider observation is unknown. Validate fresh identity before consequences.
    const observed = await readOrderPaymentSnapshot(input);
    if (!observed.refreshable) return observed.state;
    let consequenceIncomplete = false;
    try {
      if (observed.state.kind === 'completed' || observed.state.kind === 'paid-finalizing') {
        // Completed replays retry revision-aware cleanup after a post-commit crash.
        consequenceIncomplete = (await finalizePaidCheckout({ paymentId: observed.paymentId, orderId: input.orderId })).kind === 'retry';
      } else if (observed.state.kind === 'canceled') {
        consequenceIncomplete =
          (await terminalizeCanceledCheckout({ paymentId: observed.paymentId, orderId: input.orderId })).kind === 'retry';
      }
    } catch {
      console.error('[checkout.refresh] application consequence failed');
      consequenceIncomplete = true;
    }

    const current = await readOrderPaymentState(input);
    if (current.kind === 'not-found' || current.kind === 'compensation' || current.kind === 'completed') return current;
    if (consequenceIncomplete) return { kind: 'recovery-required' };
    if (observed.state.kind === 'canceled' && current.kind === 'canceled') return current;
    if (payment.kind === 'recovery-required' || payment.kind === 'terminal-failure') return { kind: 'recovery-required' };
    return current;
  };

export const refreshOrderPayment = createRefreshOrderPayment(stripePayments);
