import { getCheckoutDatabase } from '~/server/infrastructure/checkout-database';

// Checkout owns the claim workflow state; Payments only reports unsafe provider outcomes.
export const markPaymentClaimRecoveryRequired = async (paymentId: string) => {
  const database = await getCheckoutDatabase();
  await database.execute(
    `UPDATE checkout_claims SET workflow_status='recovery_required', updated_at=$1
      WHERE payment_id=$2 AND workflow_status IN ('prepared','payment_pending')`,
    [new Date().toISOString(), paymentId],
  );
};
