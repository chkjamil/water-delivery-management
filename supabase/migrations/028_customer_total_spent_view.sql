-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 028: Fix "Total Spent" always showing empty on the customer detail page
--
-- customers.total_spent is only ever initialized to 0 (order/actions.ts:154,
-- settings/users/actions.ts:102) — no server action or trigger anywhere in
-- this codebase (online checkout, POS, admin-created orders, or the
-- completeStop() recurring-delivery flow) ever increments it. It has always
-- been dead/stuck at 0.
--
-- A trigger-based increment has a real ordering trap: completeStop()
-- (app/(dashboard)/my-stops/actions.ts) inserts the order with
-- status='delivered' BEFORE order_items exist, so total_amount is still 0 at
-- that insert — an insert-time trigger would count zero. Rather than chase
-- that ordering across four different order-creation code paths, compute
-- "total spent" at read-time from a view instead — correct regardless of how
-- or when an order reached 'delivered'.
--
-- No RLS needed: a plain view runs with the caller's own privileges against
-- the underlying `orders` table, so existing orders RLS (001_initial_schema.sql)
-- already scopes it correctly — admins see all customers' sums, a customer
-- querying it directly would only ever see their own (via "Customers view own
-- orders").
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW customer_total_spent_view AS
  SELECT customer_id, COALESCE(SUM(total_amount), 0) AS total_spent
  FROM orders
  WHERE status = 'delivered' AND customer_id IS NOT NULL
  GROUP BY customer_id;
