import { finalizePaidCheckout } from './finalize-paid-checkout';
import { recoverLatePaidCheckout } from './recover-late-paid-checkout';
import { settleRefundCompensation } from './settle-refund-compensation';
import { requireRefundCompensationRecovery } from './require-refund-compensation-recovery';
import { withRefundCompensation } from './with-refund-compensation';
import { stripeRefunds } from './stripe-payment';
import { readRefundContinuation } from '~/server/domain/payments';
import type { RefundResult } from '~/server/domain/payments/stripe-refunds';
import type { RefundStatus } from '~/server/domain/payments/contracts';
import { assertOutsideCheckoutTransaction } from '~/server/infrastructure/checkout-database';

type RefundContinuation = {
  requestFullRefund(input: { paymentId: string; reason: 'requested_by_customer' }): Promise<RefundResult>;
  readRefundContinuation(input: {
    paymentId: string;
    orderId: string;
    refundId: string;
  }): Promise<{ kind: 'known'; status: RefundStatus } | { kind: 'unknown' }>;
};

// A paid event retries application consequences even when its financial event
// has already committed. A local Refund row alone cannot authorize a 2xx.
export const createContinuePaidCheckout =
  (refunds: RefundContinuation) =>
  async (input: { paymentId: string; orderId: string }): Promise<{ kind: 'finalized' | 'retry' }> => {
    assertOutsideCheckoutTransaction('Paid checkout continuation');
    try {
      if ((await finalizePaidCheckout(input)).kind === 'finalized') return { kind: 'finalized' };
      const recovery = await recoverLatePaidCheckout(input);
      if (recovery.kind !== 'decided') return { kind: 'retry' };
      if (recovery.decision !== 'REFUND') return finalizePaidCheckout(input);

      // The frozen buyer policy selected REFUND. No replay can choose allocation.
      const refund = await refunds.requestFullRefund({ paymentId: input.paymentId, reason: 'requested_by_customer' });
      if (refund.kind === 'recovery-required') return { kind: 'retry' };
      const durable = await refunds.readRefundContinuation({ ...input, refundId: refund.refundId });
      if (durable.kind !== 'known') return { kind: 'retry' };
      if (durable.status === 'SUCCEEDED') {
        const settled = await settleRefundCompensation({ ...input, refundId: refund.refundId });
        return settled.kind === 'settled' ? { kind: 'finalized' } : { kind: 'retry' };
      }
      if (durable.status === 'FAILED') {
        const held = await requireRefundCompensationRecovery(input);
        return held.kind === 'recovery-required' ? { kind: 'finalized' } : { kind: 'retry' };
      }
      // Once the exact provider Refund identity is durable, its separate signed
      // events/reconciliation can finish independently from this paid event.
      return (await withRefundCompensation(input, async () => true)) === true ? { kind: 'finalized' } : { kind: 'retry' };
    } catch {
      return { kind: 'retry' };
    }
  };

export const continuePaidCheckout = createContinuePaidCheckout({ ...stripeRefunds, readRefundContinuation });
