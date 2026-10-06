CREATE TABLE checkout_refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE REFERENCES checkout_payments(id),
  stripe_payment_intent_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency = 'RON'),
  reason TEXT NOT NULL CHECK (reason IN ('requested_by_customer', 'duplicate', 'fraudulent')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
  stripe_refund_id TEXT UNIQUE,
  create_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
