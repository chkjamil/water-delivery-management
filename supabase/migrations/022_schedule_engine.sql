-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 022: Weekly/monthly zone -> driver schedule engine
--
-- A "plan" is scoped to one calendar month and holds a day-of-week -> zone ->
-- driver template (schedule_plan_days) that's implicitly understood to repeat
-- every week of that month. schedule_overrides lets an admin change a single
-- date's zone->driver assignment (or mark it skipped) without touching the
-- recurring template. resolve_zone_driver() is the single source of truth for
-- "who's covering zone Z on date D" — used both by the Stage 3 delivery-stop
-- materializer and the Stage 5 upcoming-deliveries preview, so they can never
-- drift from each other or from what the admin sees in the schedule UI.
--
-- Immutability: a plan's day-of-week template locks once its month has fully
-- passed (plan_month < current month) — editing "Monday" mid-month is still
-- allowed even though some Mondays already happened, since delivery_stops
-- (Stage 3) are persisted snapshots that are never retroactively recomputed
-- from the template. Overrides lock per individual past date. Enforced here
-- via RLS UPDATE policies and, additionally, as a friendly precheck in
-- app/(dashboard)/schedule/actions.ts.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE schedule_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_month  DATE NOT NULL,          -- always the 1st of the month, e.g. 2026-08-01
  name        TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_month),
  CHECK (plan_month = date_trunc('month', plan_month)::date)
);

CREATE TRIGGER schedule_plans_updated_at
  BEFORE UPDATE ON schedule_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE schedule_plan_days (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES schedule_plans(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  zone_id     UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  driver_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, day_of_week, zone_id)
);

CREATE TABLE schedule_overrides (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  override_date DATE NOT NULL,
  zone_id       UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_skipped    BOOLEAN NOT NULL DEFAULT FALSE,
  note          TEXT,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (override_date, zone_id)
);

-- Resolves the effective driver for a zone on a date: an override wins if
-- present (NULL if skipped), otherwise falls back to that month's plan
-- template for the date's day-of-week. Returns NULL if nothing covers it.
CREATE OR REPLACE FUNCTION resolve_zone_driver(p_date DATE, p_zone_id UUID)
RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_skipped BOOLEAN;
  v_driver  UUID;
  v_has_override BOOLEAN;
BEGIN
  SELECT TRUE, is_skipped, driver_id INTO v_has_override, v_skipped, v_driver
    FROM schedule_overrides WHERE override_date = p_date AND zone_id = p_zone_id;

  IF v_has_override THEN
    IF v_skipped THEN RETURN NULL; END IF;
    RETURN v_driver;
  END IF;

  SELECT spd.driver_id INTO v_driver
    FROM schedule_plans sp
    JOIN schedule_plan_days spd ON spd.plan_id = sp.id
   WHERE sp.plan_month = date_trunc('month', p_date)::date
     AND spd.day_of_week = EXTRACT(DOW FROM p_date)::smallint
     AND spd.zone_id = p_zone_id;

  RETURN v_driver;
END;
$$;

ALTER TABLE schedule_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin only — schedule building is back-office, not staff/delivery_person work.
CREATE POLICY "Admins manage schedule plans" ON schedule_plans
  FOR ALL USING (current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Admins view schedule plan days" ON schedule_plan_days
  FOR SELECT USING (current_user_role() IN ('super_admin','admin'));
CREATE POLICY "Admins insert schedule plan days" ON schedule_plan_days
  FOR INSERT WITH CHECK (current_user_role() IN ('super_admin','admin'));
CREATE POLICY "Admins update current/future schedule plan days" ON schedule_plan_days
  FOR UPDATE USING (
    current_user_role() IN ('super_admin','admin')
    AND (SELECT plan_month FROM schedule_plans WHERE id = plan_id) >= date_trunc('month', now())::date
  );
CREATE POLICY "Admins delete current/future schedule plan days" ON schedule_plan_days
  FOR DELETE USING (
    current_user_role() IN ('super_admin','admin')
    AND (SELECT plan_month FROM schedule_plans WHERE id = plan_id) >= date_trunc('month', now())::date
  );

CREATE POLICY "Admins view schedule overrides" ON schedule_overrides
  FOR SELECT USING (current_user_role() IN ('super_admin','admin'));
CREATE POLICY "Admins insert future schedule overrides" ON schedule_overrides
  FOR INSERT WITH CHECK (current_user_role() IN ('super_admin','admin') AND override_date >= CURRENT_DATE);
CREATE POLICY "Admins update future schedule overrides" ON schedule_overrides
  FOR UPDATE USING (current_user_role() IN ('super_admin','admin') AND override_date >= CURRENT_DATE);
CREATE POLICY "Admins delete future schedule overrides" ON schedule_overrides
  FOR DELETE USING (current_user_role() IN ('super_admin','admin') AND override_date >= CURRENT_DATE);

-- Drivers (staff or delivery_person) need to know their own assignments too,
-- for the Stage 5 upcoming-deliveries preview — read-only, scoped to rows
-- where they're the assigned driver.
CREATE POLICY "Drivers view their plan days" ON schedule_plan_days
  FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Drivers view their overrides" ON schedule_overrides
  FOR SELECT USING (driver_id = auth.uid());
