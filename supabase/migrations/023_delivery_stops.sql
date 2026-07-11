-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 023: Daily delivery stops + customer credit ledger
--
-- A delivery_stop is a materialized "customer X is due for delivery on date D"
-- row, generated lazily (no cron infra exists in this repo) the first time
-- /my-stops is opened on a given day, from customer_delivery_preferences +
-- resolve_zone_driver() (022_schedule_engine.sql). It has NO order until a
-- driver marks it 'completed' — at which point an order_type='admin' order
-- (the previously-unused reserved value) is created, which piggybacks on the
-- existing create_delivery_for_order() trigger to get a matching deliveries
-- row for free. Marking 'skipped' creates nothing.
--
-- customer_credit_transactions is a ledger on top of customers.credit_balance,
-- which previously had no way to *decrease* anywhere in this codebase (only
-- ever incremented, via increment_customer_balance in 005_pos_helpers.sql,
-- for POS 'credit' orders). This feature also routes both monthly customers'
-- accruals AND unpaid-cash accruals through that same RPC for a unified
-- "who owes money" view — so a way to record it being paid down, with a
-- trail, is now required. The per-order payment_status/amount_paid fields
-- remain the permanent record of whether any single order was paid,
-- independent of this aggregate.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE delivery_stop_status AS ENUM ('pending', 'completed', 'skipped');

CREATE TABLE delivery_stops (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stop_date                DATE NOT NULL,
  address_id               UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  zone_id                  UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
  driver_id                UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status                   delivery_stop_status NOT NULL DEFAULT 'pending',
  payment_method_snapshot  customer_payment_preference NOT NULL,
  order_id                 UUID REFERENCES orders(id) ON DELETE SET NULL,
  delivery_id              UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  cash_collected           BOOLEAN,
  skipped_reason           TEXT,
  notes                    TEXT,
  completed_at             TIMESTAMPTZ,
  completed_by             UUID REFERENCES profiles(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, stop_date)
);

CREATE TRIGGER delivery_stops_updated_at
  BEFORE UPDATE ON delivery_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE delivery_stop_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_id      UUID NOT NULL REFERENCES delivery_stops(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  planned_qty  INTEGER NOT NULL DEFAULT 0,
  actual_qty   INTEGER,          -- NULL until confirmed; deviation = actual_qty <> planned_qty
  unit_price   NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE delivery_stops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stop_items ENABLE ROW LEVEL SECURITY;

-- Mirrors "Drivers see/update their deliveries" (001_initial_schema.sql) exactly:
-- driver_id = auth.uid() generically covers both staff and delivery_person.
CREATE POLICY "Drivers see their stops" ON delivery_stops
  FOR SELECT USING (driver_id = auth.uid() OR current_user_role() IN ('super_admin','admin','staff'));
CREATE POLICY "Drivers update their stops" ON delivery_stops
  FOR UPDATE USING (driver_id = auth.uid() OR current_user_role() IN ('super_admin','admin'));
CREATE POLICY "Customers view own stops" ON delivery_stops
  FOR SELECT USING (customer_id = auth.uid());
-- No general INSERT policy for authenticated users — generation runs through the
-- service-role admin client (lib/supabase/admin.ts), same as other cross-customer
-- writes in this app, so driver sessions never need a broad cross-customer grant.

CREATE POLICY "View stop items via parent stop" ON delivery_stop_items
  FOR SELECT USING (
    stop_id IN (SELECT id FROM delivery_stops WHERE driver_id = auth.uid() OR customer_id = auth.uid())
    OR current_user_role() IN ('super_admin','admin','staff')
  );
CREATE POLICY "Drivers update stop items" ON delivery_stop_items
  FOR UPDATE USING (
    stop_id IN (SELECT id FROM delivery_stops WHERE driver_id = auth.uid())
    OR current_user_role() IN ('super_admin','admin')
  );

-- ─── Credit ledger ──────────────────────────────────────────────────────────

CREATE TYPE credit_transaction_type AS ENUM ('accrual', 'payment');

CREATE TABLE customer_credit_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type              credit_transaction_type NOT NULL,
  amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  related_order_id  UUID REFERENCES orders(id) ON DELETE SET NULL,
  note              TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage credit transactions" ON customer_credit_transactions
  FOR ALL USING (current_user_role() IN ('super_admin','admin'));
CREATE POLICY "Customers view own credit transactions" ON customer_credit_transactions
  FOR SELECT USING (customer_id = auth.uid());
-- Service-role admin client also needs to INSERT 'accrual' rows at stop-completion
-- time from a delivery_person/staff session — handled via admin client bypassing
-- RLS entirely, same pattern as delivery_stops generation.

CREATE OR REPLACE FUNCTION record_credit_payment(
  p_customer_id UUID, p_amount NUMERIC, p_note TEXT, p_created_by UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE customers SET credit_balance = credit_balance - p_amount WHERE id = p_customer_id;
  INSERT INTO customer_credit_transactions (customer_id, type, amount, note, created_by)
  VALUES (p_customer_id, 'payment', p_amount, p_note, p_created_by);
END;
$$;

GRANT EXECUTE ON FUNCTION record_credit_payment(UUID, NUMERIC, TEXT, UUID) TO authenticated;
