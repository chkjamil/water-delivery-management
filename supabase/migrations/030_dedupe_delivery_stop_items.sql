-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 030: Fix duplicate delivery_stop_items (React "duplicate key" error)
--
-- ensureStopsGenerated() (app/(dashboard)/my-stops/actions.ts) backfills
-- standing items for a pending stop with a classic check-then-act race: it
-- SELECTs whether the stop already has items, then plain-INSERTs the full
-- standing-item set if not. Two calls close together (e.g. two devices/tabs
-- opening /my-stops around the same moment) can both see "no items yet" and
-- both insert — producing two rows for the same (stop_id, product_id), which
-- then collide as a duplicate React key when the driver's item list renders.
--
-- Fix is two-part: dedupe existing bad rows (keeping the earliest per
-- stop_id+product_id — these are exact duplicates from the race, safe to
-- drop rather than merge), then add a UNIQUE constraint so it's impossible
-- going forward. The app-side insert is switched to an upsert with
-- ignoreDuplicates so a losing concurrent call fails silently instead of
-- erroring, matching the same pattern already used for delivery_stops itself.
-- ─────────────────────────────────────────────────────────────────────────────

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stop_id, product_id ORDER BY created_at, id) AS rn
  FROM delivery_stop_items
)
DELETE FROM delivery_stop_items WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE delivery_stop_items
  ADD CONSTRAINT delivery_stop_items_stop_product_unique UNIQUE (stop_id, product_id);
