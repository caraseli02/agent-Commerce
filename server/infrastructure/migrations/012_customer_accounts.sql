-- Durable customer identity (#635). Self-registered accounts are always customers;
-- seeded demo users stay in server/utils/mockUsers.ts and never live here.
CREATE TABLE customer_accounts (
  id TEXT PRIMARY KEY CHECK (id ~ '^cus_[0-9a-f]{32}$'),
  email TEXT NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  password_hash TEXT NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
  first_name TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 80),
  last_name TEXT NOT NULL CHECK (length(last_name) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The uniqueness constraint, not an application pre-check, decides concurrent duplicate signups.
CREATE UNIQUE INDEX customer_accounts_email_key ON customer_accounts (email);

-- Fixed-window attempt counters shared by every server instance.
CREATE TABLE auth_rate_limits (
  bucket TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  PRIMARY KEY (bucket, window_start)
);
