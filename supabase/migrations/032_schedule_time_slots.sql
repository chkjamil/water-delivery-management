-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 032: Attach a delivery time slot to each zone/day schedule assignment
--
-- schedule_plan_days and schedule_overrides already enforce one row per
-- (plan, day_of_week, zone) / (date, zone) via their UNIQUE constraints — that
-- row IS the one-assignment-per-zone-per-day slot, so "one time slot per day
-- per zone" needs no new constraint, just a column on the row that's already
-- unique per zone/day.
--
-- resolve_zone_driver()'s override-then-template logic is consolidated into a
-- new resolve_zone_assignment() that resolves both driver_id and time_slot_id
-- from a single lookup, rather than duplicating that logic in two functions.
-- resolve_zone_driver() becomes a thin wrapper so existing callers
-- (lib/delivery-projection.ts, schedule/actions.ts) keep working unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE schedule_plan_days ADD COLUMN time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL;
ALTER TABLE schedule_overrides ADD COLUMN time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL;
ALTER TABLE delivery_stops     ADD COLUMN time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION resolve_zone_assignment(p_date DATE, p_zone_id UUID)
RETURNS TABLE(driver_id UUID, time_slot_id UUID) LANGUAGE plpgsql STABLE AS $$
DECLARE v_skipped BOOLEAN; v_has_override BOOLEAN;
BEGIN
  SELECT TRUE, o.is_skipped, o.driver_id, o.time_slot_id
    INTO v_has_override, v_skipped, driver_id, time_slot_id
    FROM schedule_overrides o WHERE o.override_date = p_date AND o.zone_id = p_zone_id;

  IF v_has_override THEN
    IF v_skipped THEN driver_id := NULL; time_slot_id := NULL; END IF;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT spd.driver_id, spd.time_slot_id INTO driver_id, time_slot_id
    FROM schedule_plans sp JOIN schedule_plan_days spd ON spd.plan_id = sp.id
   WHERE sp.plan_month = date_trunc('month', p_date)::date
     AND spd.day_of_week = EXTRACT(DOW FROM p_date)::smallint
     AND spd.zone_id = p_zone_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_zone_driver(p_date DATE, p_zone_id UUID)
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT driver_id FROM resolve_zone_assignment(p_date, p_zone_id);
$$;
