ALTER TABLE checkout_orders
  ADD COLUMN grand_total_minor INTEGER,
  ADD COLUMN currency TEXT;

UPDATE checkout_orders
   SET grand_total_minor = ROUND(COALESCE(
         payload_json::jsonb #>> '{order,money,total}',
         payload_json::jsonb #>> '{order,total}'
       )::numeric * 100),
       currency = UPPER(COALESCE(
         payload_json::jsonb #>> '{order,money,currency}',
         payload_json::jsonb #>> '{order,currency}'
       ));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM checkout_orders WHERE grand_total_minor IS NULL OR grand_total_minor < 0 OR currency IS NULL) THEN
    RAISE EXCEPTION 'checkout order money backfill requires a complete non-negative amount and currency';
  END IF;
END $$;

ALTER TABLE checkout_orders
  ALTER COLUMN grand_total_minor SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  ADD CONSTRAINT checkout_orders_grand_total_nonnegative CHECK (grand_total_minor >= 0),
  ADD CONSTRAINT checkout_orders_currency_present CHECK (currency <> ''),
  ADD CONSTRAINT checkout_orders_checkout_correlation_unique UNIQUE (customer_id, source_cart_id, source_cart_revision, id);

ALTER TABLE checkout_payments
  ADD COLUMN status TEXT,
  ADD COLUMN amount_minor INTEGER,
  ADD COLUMN currency TEXT,
  ADD COLUMN payment_type INTEGER,
  ADD COLUMN use_existing_payment_method BOOLEAN,
  ADD COLUMN provider_reference TEXT,
  ADD COLUMN updated_at TEXT;

UPDATE checkout_payments AS payment
   SET status = 'PAID',
       amount_minor = orders.grand_total_minor,
       currency = orders.currency,
       payment_type = CASE
         WHEN payment.payload_json::jsonb ? 'paymentType' THEN (payment.payload_json::jsonb ->> 'paymentType')::integer
         WHEN orders.payload_json::jsonb #> '{order,paymentDetails,type}' IS NOT NULL
           THEN (orders.payload_json::jsonb #>> '{order,paymentDetails,type}')::integer
         ELSE NULL
       END,
       use_existing_payment_method = COALESCE((payment.payload_json::jsonb ->> 'useExistingPaymentMethod')::boolean, FALSE),
       provider_reference = NULL,
       updated_at = payment.created_at
  FROM checkout_orders AS orders
 WHERE orders.id = payment.order_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM checkout_payments WHERE amount_minor IS NULL OR amount_minor < 0 OR currency IS NULL) THEN
    RAISE EXCEPTION 'checkout payment money backfill requires a complete non-negative order amount and currency';
  END IF;
END $$;

ALTER TABLE checkout_payments
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN amount_minor SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN use_existing_payment_method SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ADD CONSTRAINT checkout_payments_status_valid CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
  ADD CONSTRAINT checkout_payments_amount_nonnegative CHECK (amount_minor >= 0),
  ADD CONSTRAINT checkout_payments_order_fk FOREIGN KEY (order_id) REFERENCES checkout_orders(id),
  ADD CONSTRAINT checkout_payments_id_order_unique UNIQUE (id, order_id);

ALTER TABLE checkout_reservations
  ADD CONSTRAINT checkout_reservations_status_valid CHECK (status IN ('active', 'committed', 'released', 'expired'));

ALTER TABLE checkout_orders
  ADD CONSTRAINT checkout_orders_paid_by_same_order_fk
  FOREIGN KEY (paid_by_payment_id, id) REFERENCES checkout_payments(id, order_id)
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE checkout_claims
  ADD COLUMN order_id TEXT,
  ADD COLUMN reservation_id TEXT,
  ADD COLUMN payment_id TEXT,
  ADD COLUMN workflow_status TEXT;

UPDATE checkout_claims AS claim
   SET order_id = orders.id
  FROM checkout_orders AS orders
 WHERE orders.customer_id = claim.owner_id
   AND orders.checkout_request_id = claim.request_id;

UPDATE checkout_claims AS claim
   SET reservation_id = reservation.id
  FROM checkout_reservations AS reservation
 WHERE reservation.reservation_key = claim.owner_id || ':' || claim.request_id;

UPDATE checkout_claims AS claim
   SET payment_id = payment.id
  FROM checkout_payments AS payment
 WHERE payment.order_id = claim.order_id;

UPDATE checkout_claims
   SET workflow_status = CASE WHEN result_json IS NOT NULL THEN 'finalized' ELSE 'recovery_required' END
 WHERE order_id IS NOT NULL AND reservation_id IS NOT NULL AND payment_id IS NOT NULL;

UPDATE checkout_claims SET workflow_status = 'recovery_required' WHERE workflow_status IS NULL;

UPDATE checkout_claims
   SET workflow_status = 'recovery_required'
 WHERE order_id IS NULL OR reservation_id IS NULL OR payment_id IS NULL;

ALTER TABLE checkout_claims
  ALTER COLUMN workflow_status SET NOT NULL,
  ADD CONSTRAINT checkout_claims_workflow_status_valid
    CHECK (workflow_status IN ('prepared', 'payment_pending', 'finalized', 'recovery_required')),
  ADD CONSTRAINT checkout_claims_complete_tuple
    CHECK (workflow_status = 'recovery_required' OR (order_id IS NOT NULL AND reservation_id IS NOT NULL AND payment_id IS NOT NULL)),
  ADD CONSTRAINT checkout_claims_order_fk
    FOREIGN KEY (owner_id, cart_id, cart_revision, order_id)
    REFERENCES checkout_orders(customer_id, source_cart_id, source_cart_revision, id),
  ADD CONSTRAINT checkout_claims_reservation_fk FOREIGN KEY (reservation_id) REFERENCES checkout_reservations(id),
  ADD CONSTRAINT checkout_claims_payment_fk
    FOREIGN KEY (payment_id, order_id) REFERENCES checkout_payments(id, order_id),
  ADD CONSTRAINT checkout_claims_order_unique UNIQUE (order_id),
  ADD CONSTRAINT checkout_claims_reservation_unique UNIQUE (reservation_id),
  ADD CONSTRAINT checkout_claims_payment_unique UNIQUE (payment_id);

CREATE TABLE checkout_claim_aliases (
  owner_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  claim_request_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, request_id),
  FOREIGN KEY (owner_id, claim_request_id) REFERENCES checkout_claims(owner_id, request_id)
);

INSERT INTO checkout_claim_aliases (owner_id, request_id, fingerprint, claim_request_id, created_at)
SELECT owner_id, request_id, fingerprint, request_id, created_at FROM checkout_claims;
