-- An unknown create start is unsafe to replay automatically. Treat any legacy
-- row without a timestamp as older than Stripe's bounded idempotency window.
UPDATE checkout_refunds
   SET create_started_at = 'epoch'::timestamptz
 WHERE create_started_at IS NULL;

ALTER TABLE checkout_refunds
  ALTER COLUMN create_started_at SET NOT NULL,
  ADD CONSTRAINT checkout_refunds_stripe_refund_id_valid
    CHECK (stripe_refund_id IS NULL OR stripe_refund_id ~ '^re_.+$'),
  ADD CONSTRAINT checkout_refunds_terminal_requires_stripe_refund_id
    CHECK (status = 'PENDING' OR stripe_refund_id IS NOT NULL);
