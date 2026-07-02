-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: Allow walk-in (no account) POS orders
--   orders.customer_id was NOT NULL, so POS checkouts without a selected
--   customer failed the insert. Walk-in sales have no profile to attach.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE orders
  ALTER COLUMN customer_id DROP NOT NULL;
