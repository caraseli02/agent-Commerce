ALTER TABLE checkout_payments
  ADD COLUMN stripe_payment_intent_id TEXT,
  ADD COLUMN stripe_payment_intent_create_started_at TIMESTAMPTZ,
  ADD COLUMN cancellation_requested_at TIMESTAMPTZ,
  ALTER COLUMN use_existing_payment_method SET DEFAULT FALSE,
  DROP CONSTRAINT checkout_payments_status_valid,
  ADD CONSTRAINT checkout_payments_status_valid
    CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED')),
  ADD CONSTRAINT checkout_payments_stripe_payment_intent_id_unique
    UNIQUE (stripe_payment_intent_id);
