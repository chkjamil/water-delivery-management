-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 019: Add 'delivery_person' to the user_role enum
--
-- New dedicated role for field drivers, additive alongside 'staff' (both
-- remain assignable as drivers on deliveries/schedules — see deliveries
-- page.tsx driver dropdown and the schedule engine in later migrations).
-- delivery_person gets narrow permissions (own deliveries/stops, cash
-- collection) — not POS/inventory/reports/settings/full customer records.
--
-- This file must contain ONLY the ALTER TYPE statement. Postgres forbids
-- using a freshly-added enum value in the same transaction/script that adds
-- it (same lesson already documented in 015_notify_order_placed.sql) — any
-- later migration or app code that references 'delivery_person' must run as
-- a separate script/"Run" action after this one has been applied.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'delivery_person';
