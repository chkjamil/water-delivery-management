-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 021: Customer payment preference, delivery-day scheduling & standing items
--
-- Adds the data model admins use to configure a customer's recurring
-- delivery relationship: how they pay (cash vs. a running monthly account),
-- which day(s) they're due for delivery (weekly/biweekly/monthly, including
-- twice-a-week or twice-a-month), and their "usual order" (standing items)
-- used to pre-fill the delivery-person's stop when it's generated.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE customer_payment_preference AS ENUM ('cash', 'monthly');
ALTER TABLE customers
  ADD COLUMN payment_method_preference customer_payment_preference NOT NULL DEFAULT 'cash';

CREATE TYPE delivery_frequency AS ENUM ('weekly', 'biweekly', 'monthly');

-- days_of_week: 0=Sun..6=Sat, matching Postgres EXTRACT(DOW) and JS Date#getDay.
-- days_of_month: 1-31, clamped to the last day of shorter months at generation time.
CREATE TABLE customer_delivery_preferences (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id          UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  frequency            delivery_frequency NOT NULL DEFAULT 'weekly',
  days_of_week         SMALLINT[] NOT NULL DEFAULT '{}',
  days_of_month        SMALLINT[] NOT NULL DEFAULT '{}',
  biweekly_anchor_date DATE,
  address_id           UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  time_slot_id         UUID REFERENCES time_slots(id) ON DELETE SET NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- cardinality() (not array_length, which is NULL — and therefore passes RLS/CHECK
  -- silently — on an empty array) to actually enforce "at least 1 day, at most 2".
  CHECK (
    (frequency IN ('weekly','biweekly') AND cardinality(days_of_week)  BETWEEN 1 AND 2)
    OR (frequency = 'monthly'          AND cardinality(days_of_month) BETWEEN 1 AND 2)
  ),
  CHECK (frequency <> 'biweekly' OR biweekly_anchor_date IS NOT NULL)
);

CREATE TRIGGER customer_delivery_preferences_updated_at
  BEFORE UPDATE ON customer_delivery_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE customer_standing_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, product_id)
);

CREATE TRIGGER customer_standing_items_updated_at
  BEFORE UPDATE ON customer_standing_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE customer_delivery_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_standing_items       ENABLE ROW LEVEL SECURITY;

-- Mirrors customer_bottles RLS exactly (003_bottle_tracking.sql): admin/staff manage,
-- customer reads own. delivery_person is deliberately excluded from "manage" here —
-- they only need read access to their assigned stops' snapshot (Stage 3), not the
-- ability to edit a customer's standing configuration.
CREATE POLICY "Admins manage delivery preferences" ON customer_delivery_preferences
  FOR ALL USING (current_user_role() IN ('super_admin','admin','staff'));
CREATE POLICY "Customers view own delivery preferences" ON customer_delivery_preferences
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins manage standing items" ON customer_standing_items
  FOR ALL USING (current_user_role() IN ('super_admin','admin','staff'));
CREATE POLICY "Customers view own standing items" ON customer_standing_items
  FOR SELECT USING (customer_id = auth.uid());
