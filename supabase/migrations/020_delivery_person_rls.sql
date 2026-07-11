-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 020: RLS scoping for delivery_person on orders/order_items/addresses
--
-- 019 added the 'delivery_person' role, and the app-level allow-lists in
-- my-deliveries/{page,actions}.tsx now admit it. But three RLS policies from
-- 001_initial_schema.sql check `current_user_role() = 'staff'` (or an IN list
-- that includes 'staff') explicitly rather than deriving access from
-- deliveries.driver_id — so a delivery_person driver would pass every
-- app-level check yet still get an empty joined `order`/`order_items`/
-- `address` on the my-deliveries detail page, because the underlying SELECT
-- is silently filtered out by RLS.
--
-- Fix: add delivery_person-scoped policies keyed off driver_id = auth.uid()
-- via the deliveries table — mirroring the existing "Staff view assigned
-- orders" policy's scoping exactly, so delivery_person only ever sees rows
-- tied to a delivery actually assigned to them (never the unscoped "all
-- staff see all order_items/addresses" grants that 'staff' already has,
-- which would over-grant relative to the "limited" access decision).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Delivery persons view assigned orders"
  ON orders FOR SELECT
  USING (
    current_user_role() = 'delivery_person' AND
    id IN (SELECT order_id FROM deliveries WHERE driver_id = auth.uid())
  );

CREATE POLICY "Delivery persons view assigned order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT order_id FROM deliveries WHERE driver_id = auth.uid()
    )
  );

CREATE POLICY "Delivery persons view assigned addresses"
  ON customer_addresses FOR SELECT
  USING (
    id IN (
      SELECT o.address_id FROM orders o
      JOIN deliveries d ON d.order_id = o.id
      WHERE d.driver_id = auth.uid()
    )
  );

-- The my-deliveries detail query joins order -> customer:profiles(full_name, phone, email).
-- "Staff can read active customers" (005_pos_helpers.sql) grants staff an UNSCOPED read of
-- all profiles for POS search — deliberately not mirrored here (over-grants relative to the
-- "limited" access decision). Instead, scope delivery_person to only the customer profile
-- behind a delivery actually assigned to them.
CREATE POLICY "Delivery persons view assigned customer profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT o.customer_id FROM orders o
      JOIN deliveries d ON d.order_id = o.id
      WHERE d.driver_id = auth.uid()
    )
  );
