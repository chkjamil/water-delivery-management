-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013: Skip bottle-ledger tracking for walk-in (no account) orders
--
-- track_bottle_ownership() (003_bottle_tracking.sql) fires on every order_items
-- insert and writes a customer_bottles row for bundle/bottle_only products,
-- using the order's customer_id. customer_bottles.customer_id is NOT NULL, but
-- walk-in POS orders now allow a NULL orders.customer_id (011_pos_walkin_
-- customer.sql) — so selling a bundle/bottle_only product to a walk-in
-- customer violated that NOT NULL constraint.
--
-- Bottle ownership only makes sense against a real customer profile, so
-- walk-in sales simply skip the ledger entry instead of tracking against
-- nobody.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION track_bottle_ownership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_customer_id  UUID;
  v_product_type product_type;
BEGIN
  -- Get the order's customer
  SELECT customer_id INTO v_customer_id
    FROM orders WHERE id = NEW.order_id;

  -- Walk-in orders have no customer to track bottle ownership against
  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the product type
  SELECT p.product_type INTO v_product_type
    FROM products p WHERE p.id = NEW.product_id;

  -- Only track bundle and bottle_only purchases
  IF v_product_type IN ('bundle', 'bottle_only') THEN
    INSERT INTO customer_bottles (customer_id, product_id, quantity_owned)
    VALUES (v_customer_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (customer_id, product_id) DO UPDATE
      SET quantity_owned = customer_bottles.quantity_owned + NEW.quantity,
          updated_at     = NOW();
  END IF;

  RETURN NEW;
END;
$$;
