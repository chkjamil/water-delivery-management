-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 018: Add 'online' to the payment_method enum
--
-- payment_method (001_initial_schema.sql) was created as
-- ENUM ('cash','card','easypaisa','jazzcash','bank','credit') — 'online' was
-- never a member. Both the customer checkout flow (order/actions.ts,
-- CheckoutDrawer.tsx) and POS (PaymentModal.tsx) offer "online" as a payment
-- option and insert it straight into orders.payment_method, so selecting it
-- has always failed with "invalid input value for enum payment_method".
--
-- 'credit' is re-asserted defensively (IF NOT EXISTS = safe no-op if it's
-- already there) in case of drift between this migration history and the
-- live database, matching a pattern seen elsewhere this session.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'online';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'credit';
