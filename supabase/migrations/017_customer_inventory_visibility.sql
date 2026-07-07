-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 017: Let customers see inventory (fixes false "Out of stock")
--
-- app/(dashboard)/order/page.tsx queries products with an embedded
-- inventory:inventory(quantity_in_stock, low_stock_threshold) join, using the
-- customer's own authenticated client (not admin/service-role). But
-- inventory only had SELECT policies for staff/admin/super_admin — there was
-- no policy letting 'customer' read it at all. PostgREST silently returns
-- the embed as null/empty when the current role can't see the related rows
-- (rather than erroring), so every customer saw quantity_in_stock as
-- undefined -> defaulted to 0 -> every in-stock product displayed as
-- "Out of stock" on the customer order page, regardless of real stock.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Customers can view inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (current_user_role() = 'customer');
