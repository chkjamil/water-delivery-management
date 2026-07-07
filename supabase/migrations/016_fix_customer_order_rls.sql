-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 016: Fix RLS violations blocking customer online order placement
--
-- placeCustomerOrder() (app/(dashboard)/order/actions.ts) runs entirely under
-- the customer's own authenticated role (not admin/service-role). That
-- exposed three separate RLS gaps in the same INSERT chain — orders →
-- order_items → their respective triggers — each only surfacing once the
-- previous one was fixed, same pattern as the POS walk-in fixes (011-013):
--
--   1. create_delivery_for_order() (001_initial_schema.sql) inserts into
--      deliveries for order_type IN ('online','admin'), but wasn't
--      SECURITY DEFINER — so it ran as the customer, and deliveries has no
--      INSERT policy for the 'customer' role at all. This is the exact
--      error just reported: "new row violates row-level security policy
--      for table deliveries".
--   2. order_items has no INSERT policy for 'customer' either — the very
--      next statement in placeCustomerOrder() after the orders insert
--      succeeds would have failed the same way.
--   3. track_bottle_ownership() (003_bottle_tracking.sql) inserts into
--      customer_bottles when a bundle/bottle_only product is ordered, also
--      not SECURITY DEFINER — a customer buying a bundle product online
--      would have hit this next.
--
-- Fixes: mark both trigger functions SECURITY DEFINER (matching
-- current_user_role() / increment_customer_balance() / the notification
-- trigger functions elsewhere in this schema), and add an INSERT policy
-- letting a customer add items only to their own orders.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Delivery auto-creation must always succeed regardless of who placed
--    the order.
CREATE OR REPLACE FUNCTION create_delivery_for_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.order_type IN ('online', 'admin') THEN
    INSERT INTO deliveries (order_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Customers can insert order_items only for orders they own.
DROP POLICY IF EXISTS "Customers can add items to own orders" ON order_items;
CREATE POLICY "Customers can add items to own orders"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

-- 3. Bottle-ownership tracking must always succeed regardless of who placed
--    the order (the NULL-customer_id guard from 013 already handles
--    walk-in POS orders; this adds the missing SECURITY DEFINER so online
--    customer orders work too).
CREATE OR REPLACE FUNCTION track_bottle_ownership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_customer_id  UUID;
  v_product_type product_type;
BEGIN
  SELECT customer_id INTO v_customer_id
    FROM orders WHERE id = NEW.order_id;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.product_type INTO v_product_type
    FROM products p WHERE p.id = NEW.product_id;

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
