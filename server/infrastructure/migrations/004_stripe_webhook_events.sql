CREATE TABLE checkout_stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL,
  payment_id TEXT NOT NULL REFERENCES checkout_payments(id),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT checkout_stripe_webhook_event_id_present CHECK (event_id <> ''),
  CONSTRAINT checkout_stripe_webhook_event_type_present CHECK (event_type <> ''),
  CONSTRAINT checkout_stripe_webhook_intent_id_present CHECK (stripe_payment_intent_id <> '')
);

CREATE INDEX checkout_stripe_webhook_events_payment_idx ON checkout_stripe_webhook_events(payment_id);
