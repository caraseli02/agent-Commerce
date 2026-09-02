CREATE TABLE checkout_claims (
  owner_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  cart_id TEXT NOT NULL,
  cart_revision INTEGER NOT NULL,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, request_id),
  UNIQUE (owner_id, cart_id, cart_revision)
);

CREATE TABLE checkout_carts (
  owner_id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE checkout_inventory (
  product_id TEXT PRIMARY KEY,
  on_hand INTEGER NOT NULL,
  reserved INTEGER NOT NULL
);

CREATE TABLE checkout_reservations (
  id TEXT PRIMARY KEY,
  reservation_key TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  items_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE checkout_orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  checkout_request_id TEXT NOT NULL,
  source_cart_id TEXT NOT NULL,
  source_cart_revision INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  paid_by_payment_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, checkout_request_id),
  UNIQUE (customer_id, source_cart_id, source_cart_revision)
);

CREATE TABLE checkout_payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
