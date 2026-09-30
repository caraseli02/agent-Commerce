ALTER TABLE checkout_claims
  ADD COLUMN paid_recovery_decision TEXT,
  ADD CONSTRAINT checkout_claims_paid_recovery_decision_valid
    CHECK (paid_recovery_decision IN ('ALLOCATE', 'BACKORDER', 'REFUND')),
  DROP CONSTRAINT checkout_claims_workflow_status_valid,
  ADD CONSTRAINT checkout_claims_workflow_status_valid
    CHECK (workflow_status IN ('prepared', 'payment_pending', 'finalized', 'recovery_required', 'canceled', 'compensation_pending', 'compensation_recovery_required'));
