export const checkoutWorkflowStatuses = [
  'prepared',
  'payment_pending',
  'finalized',
  'recovery_required',
  'canceled',
  'compensation_pending',
  'compensation_recovery_required',
] as const;
export type CheckoutWorkflowStatus = (typeof checkoutWorkflowStatuses)[number];
export const paidRecoveryDecisions = ['ALLOCATE', 'BACKORDER', 'REFUND'] as const;
export type PaidRecoveryDecision = (typeof paidRecoveryDecisions)[number];

export const parseCheckoutWorkflowStatus = (value: unknown): CheckoutWorkflowStatus | null =>
  typeof value === 'string' && checkoutWorkflowStatuses.some((status) => status === value) ? (value as CheckoutWorkflowStatus) : null;
// NULL means no decision yet. Undefined means invalid/missing storage and must never authorize work.
export const parsePaidRecoveryDecision = (value: unknown): PaidRecoveryDecision | null | undefined =>
  value === null
    ? null
    : typeof value === 'string' && paidRecoveryDecisions.some((decision) => decision === value)
      ? (value as PaidRecoveryDecision)
      : undefined;

export type PersistedCheckoutState = { workflow_status: unknown; paid_recovery_decision: unknown };
export type CheckoutState = { workflow_status: CheckoutWorkflowStatus; paid_recovery_decision: PaidRecoveryDecision | null };
export const parseCheckoutState = (row: PersistedCheckoutState): CheckoutState | null => {
  const workflow_status = parseCheckoutWorkflowStatus(row.workflow_status);
  const paid_recovery_decision = parsePaidRecoveryDecision(row.paid_recovery_decision);
  return workflow_status && paid_recovery_decision !== undefined ? { workflow_status, paid_recovery_decision } : null;
};

export const parseCheckoutClaim = <T extends PersistedCheckoutState>(
  row: T | null | undefined,
): (Omit<T, keyof PersistedCheckoutState> & CheckoutState) | null => {
  if (!row) return null;
  const state = parseCheckoutState(row);
  return state ? { ...row, ...state } : null;
};
