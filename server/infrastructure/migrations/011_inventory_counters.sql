-- INTEGER + NOT NULL already ensure finite, whole persisted counters. Inspect legacy data
-- before validating independent nonnegative counters; never repair balances in migration.
DO $$
DECLARE invalid_keys TEXT;
BEGIN
  SELECT string_agg(product_id, ', ' ORDER BY product_id) INTO invalid_keys
    FROM checkout_inventory WHERE on_hand < 0 OR reserved < 0;
  IF invalid_keys IS NOT NULL THEN
    RAISE EXCEPTION 'Inventory reconciliation required for negative balances on: %. No balances changed; obtain separately approved repair before retrying migrations.', invalid_keys;
  END IF;
END $$;
ALTER TABLE checkout_inventory ADD CONSTRAINT inventory_on_hand_nonnegative CHECK (on_hand >= 0);
ALTER TABLE checkout_inventory ADD CONSTRAINT inventory_reserved_nonnegative CHECK (reserved >= 0);
-- Deliberately no reserved <= on_hand constraint: expired active holds await lazy cleanup.
