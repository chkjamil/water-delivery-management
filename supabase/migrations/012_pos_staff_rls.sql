-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Fix RLS gaps blocking staff POS checkout
--
-- The app already lets staff read /orders (requireOrdersAccess in
-- app/(dashboard)/orders/actions.ts allows "staff" for reads), but the RLS
-- policy on orders only let staff SELECT orders tied to a delivery they're
-- driving. Supabase's `.insert(...).select()` re-reads the inserted row
-- using the same RLS role, so when a staff member created a POS order the
-- INSERT itself passed but the follow-up SELECT had no matching policy —
-- surfacing as "new row violates row-level security policy for table orders".
--
-- order_items had the same problem in reverse: staff could SELECT items
-- (via "Admins view all order items") but had no INSERT policy at all, so
-- POS checkout would have failed on the order_items insert next.
-- ─────────────────────────────────────────────────────────────────────────────

-- Staff can view all orders (matches the app-level permission already granted
-- in requireOrdersAccess), not just orders linked to a delivery they drive.
DROP POLICY IF EXISTS "Staff view assigned orders" ON orders;
CREATE POLICY "Staff view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (current_user_role() = 'staff');

-- Staff can insert order line items for orders they create at POS.
DROP POLICY IF EXISTS "Staff can create order items" ON order_items;
CREATE POLICY "Staff can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'staff'));
