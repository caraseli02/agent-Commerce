ALTER TABLE checkout_claims
  DROP CONSTRAINT checkout_claims_workflow_status_valid,
  ADD CONSTRAINT checkout_claims_workflow_status_valid
    CHECK (workflow_status IN ('prepared', 'payment_pending', 'finalized', 'recovery_required', 'canceled'));
