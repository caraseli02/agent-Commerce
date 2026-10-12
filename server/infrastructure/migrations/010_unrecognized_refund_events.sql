-- A null local Refund identifies a receipt reserved for manual handling.
-- Existing financial receipts and their foreign-key ownership stay intact.
ALTER TABLE checkout_stripe_refund_events ALTER COLUMN refund_id DROP NOT NULL;
ALTER TABLE checkout_stripe_refund_events ADD COLUMN stripe_payment_intent_id TEXT;

CREATE VIEW checkout_stripe_refund_manual_handling AS
SELECT event_id, event_type, stripe_refund_id, stripe_payment_intent_id, observed_at
FROM checkout_stripe_refund_events
WHERE refund_id IS NULL;
