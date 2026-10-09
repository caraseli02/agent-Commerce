CREATE TABLE checkout_stripe_refund_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('refund.created', 'refund.updated', 'refund.failed')),
  stripe_refund_id TEXT NOT NULL CHECK (stripe_refund_id ~ '^re_.+$'),
  refund_id TEXT NOT NULL REFERENCES checkout_refunds(id),
  observed_at TIMESTAMPTZ NOT NULL
);
