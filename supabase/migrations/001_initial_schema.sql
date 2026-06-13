-- ============================================================
-- AquaFlow — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'customer');
CREATE TYPE order_status AS ENUM ('pending','confirmed','dispatched','en_route','delivered','cancelled','failed');
CREATE TYPE order_type AS ENUM ('online','pos','admin');
CREATE TYPE payment_method AS ENUM ('cash','card','easypaisa','jazzcash','bank','credit');
CREATE TYPE payment_status AS ENUM ('unpaid','partial','paid','refunded');
CREATE TYPE delivery_status AS ENUM ('pending','assigned','loaded','en_route','delivered','failed','rescheduled');
CREATE TYPE stock_transaction_type AS ENUM ('stock_in','stock_out','adjustment','return');

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users — one profile per user

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── DELIVERY ZONES ───────────────────────────────────────────────────────────

CREATE TABLE delivery_zones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  delivery_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TIME SLOTS ───────────────────────────────────────────────────────────────

CREATE TABLE time_slots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label         TEXT NOT NULL,       -- "9am – 12pm"
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  max_orders    INTEGER NOT NULL DEFAULT 20,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed default time slots
INSERT INTO time_slots (label, start_time, end_time) VALUES
  ('Morning (9am – 12pm)',   '09:00', '12:00'),
  ('Afternoon (12pm – 3pm)', '12:00', '15:00'),
  ('Evening (3pm – 6pm)',    '15:00', '18:00');

-- ─── CUSTOMER ADDRESSES ───────────────────────────────────────────────────────

CREATE TABLE customer_addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'Home',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL DEFAULT 'Islamabad',
  zone_id       UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one default address per customer
CREATE UNIQUE INDEX one_default_address_per_customer
  ON customer_addresses (customer_id)
  WHERE is_default = TRUE;

-- ─── CUSTOMERS (extra fields beyond profile) ──────────────────────────────────

CREATE TABLE customers (
  id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  credit_balance  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_spent     NUMERIC(10,2) NOT NULL DEFAULT 0,
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create customer record when profile with role=customer is inserted
CREATE OR REPLACE FUNCTION handle_new_customer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    INSERT INTO customers (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_customer_profile_created
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_customer();

-- ─── PRODUCTS ─────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  sku           TEXT UNIQUE NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'bottle',
  size_label    TEXT NOT NULL,
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default products
INSERT INTO products (name, sku, price, unit, size_label) VALUES
  ('5 Gallon Water Bottle',  'WTR-5GAL',  100.00, 'bottle', '5 Gallon'),
  ('1.5L Water Bottle',      'WTR-1500ML', 30.00, 'bottle', '1.5L'),
  ('500ml Water Bottle',     'WTR-500ML',  20.00, 'bottle', '500ml'),
  ('Water Crate (24x500ml)', 'WTR-CRATE', 350.00, 'crate',  'Crate 24x500ml');

-- ─── INVENTORY ────────────────────────────────────────────────────────────────

CREATE TABLE inventory (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id              UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_in_stock       INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold     INTEGER NOT NULL DEFAULT 30,
  empty_bottles_returned  INTEGER NOT NULL DEFAULT 0,
  last_restocked_at       TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create inventory row when product is created
CREATE OR REPLACE FUNCTION handle_new_product()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO inventory (product_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_created
  AFTER INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION handle_new_product();

-- ─── STOCK TRANSACTIONS ───────────────────────────────────────────────────────

CREATE TABLE stock_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_type stock_transaction_type NOT NULL,
  quantity         INTEGER NOT NULL,
  note             TEXT,
  performed_by     UUID NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update inventory when stock transaction is created
CREATE OR REPLACE FUNCTION apply_stock_transaction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transaction_type IN ('stock_in', 'return') THEN
    UPDATE inventory
      SET quantity_in_stock = quantity_in_stock + NEW.quantity,
          last_restocked_at = CASE WHEN NEW.transaction_type = 'stock_in' THEN NOW() ELSE last_restocked_at END
      WHERE product_id = NEW.product_id;
  ELSIF NEW.transaction_type = 'stock_out' THEN
    UPDATE inventory
      SET quantity_in_stock = GREATEST(0, quantity_in_stock - NEW.quantity)
      WHERE product_id = NEW.product_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE inventory
      SET quantity_in_stock = NEW.quantity
      WHERE product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_stock_transaction
  AFTER INSERT ON stock_transactions
  FOR EACH ROW EXECUTE FUNCTION apply_stock_transaction();

-- ─── ORDERS ───────────────────────────────────────────────────────────────────

CREATE SEQUENCE order_number_seq START 1000;

CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number         TEXT UNIQUE NOT NULL DEFAULT ('ORD-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0')),
  customer_id          UUID NOT NULL REFERENCES profiles(id),
  address_id           UUID REFERENCES customer_addresses(id) ON DELETE SET NULL,
  order_type           order_type NOT NULL DEFAULT 'online',
  status               order_status NOT NULL DEFAULT 'pending',

  -- Delivery scheduling
  delivery_date        DATE,
  time_slot_id         UUID REFERENCES time_slots(id) ON DELETE SET NULL,
  special_instructions TEXT,

  -- Financials
  subtotal             NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method       payment_method,
  payment_status       payment_status NOT NULL DEFAULT 'unpaid',
  amount_paid          NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Meta
  created_by           UUID NOT NULL REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ORDER ITEMS ──────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  quantity        INTEGER NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal        NUMERIC(10,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount) STORED
);

-- Auto-recalculate order totals when items change
CREATE OR REPLACE FUNCTION recalculate_order_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_subtotal NUMERIC(10,2);
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
    FROM order_items WHERE order_id = v_order_id;
  UPDATE orders
    SET subtotal = v_subtotal,
        total_amount = v_subtotal + delivery_fee - discount_amount
    WHERE id = v_order_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_order_item_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_order_totals();

-- Auto-deduct inventory when order is confirmed
CREATE OR REPLACE FUNCTION deduct_inventory_on_confirm()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    INSERT INTO stock_transactions (product_id, transaction_type, quantity, note, performed_by)
      SELECT oi.product_id, 'stock_out', oi.quantity,
             'Auto-deducted for order ' || NEW.order_number,
             NEW.created_by
      FROM order_items oi WHERE oi.order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_confirmed
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_confirm();

-- ─── DELIVERIES ───────────────────────────────────────────────────────────────

CREATE TABLE deliveries (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                 UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id                UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status                   delivery_status NOT NULL DEFAULT 'pending',
  assigned_at              TIMESTAMPTZ,
  dispatched_at            TIMESTAMPTZ,
  delivered_at             TIMESTAMPTZ,
  failed_reason            TEXT,
  empty_bottles_collected  INTEGER NOT NULL DEFAULT 0,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create delivery record when order is created
CREATE OR REPLACE FUNCTION create_delivery_for_order()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_type IN ('online', 'admin') THEN
    INSERT INTO deliveries (order_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION create_delivery_for_order();

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots        ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- ── Profiles ──
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admin manages all profiles"
  ON profiles FOR ALL
  USING (current_user_role() = 'super_admin');

-- ── Products (public read) ──
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT USING (is_active = TRUE OR current_user_role() IN ('super_admin','admin','staff'));

CREATE POLICY "Admins manage products"
  ON products FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'));

-- ── Inventory ──
CREATE POLICY "Staff and above can view inventory"
  ON inventory FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "Admins manage inventory"
  ON inventory FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'));

-- ── Orders ──
CREATE POLICY "Customers view own orders"
  ON orders FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins view all orders"
  ON orders FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Staff view assigned orders"
  ON orders FOR SELECT
  USING (
    current_user_role() = 'staff' AND
    id IN (SELECT order_id FROM deliveries WHERE driver_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage all orders"
  ON orders FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'));

-- ── Order Items ──
CREATE POLICY "View order items of own orders"
  ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()));

CREATE POLICY "Admins view all order items"
  ON order_items FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "Admins manage order items"
  ON order_items FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'));

-- ── Deliveries ──
CREATE POLICY "Drivers see their deliveries"
  ON deliveries FOR SELECT
  USING (driver_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Drivers update their deliveries"
  ON deliveries FOR UPDATE
  USING (driver_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins manage deliveries"
  ON deliveries FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'));

-- ── Customer Addresses ──
CREATE POLICY "Customers manage own addresses"
  ON customer_addresses FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "Admins view all addresses"
  ON customer_addresses FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin', 'staff'));

-- ── Zones & Slots (public read) ──
CREATE POLICY "Anyone can view active zones"
  ON delivery_zones FOR SELECT USING (is_active = TRUE OR current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Admins manage zones"
  ON delivery_zones FOR ALL USING (current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Anyone can view active time slots"
  ON time_slots FOR SELECT USING (is_active = TRUE OR current_user_role() IN ('super_admin','admin'));

CREATE POLICY "Admins manage time slots"
  ON time_slots FOR ALL USING (current_user_role() IN ('super_admin','admin'));

-- ── Stock Transactions ──
CREATE POLICY "Admins view stock transactions"
  ON stock_transactions FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Admins create stock transactions"
  ON stock_transactions FOR INSERT
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'staff'));

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_orders_customer_id   ON orders (customer_id);
CREATE INDEX idx_orders_status        ON orders (status);
CREATE INDEX idx_orders_delivery_date ON orders (delivery_date);
CREATE INDEX idx_orders_created_at    ON orders (created_at DESC);
CREATE INDEX idx_deliveries_driver_id ON deliveries (driver_id);
CREATE INDEX idx_deliveries_status    ON deliveries (status);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_profiles_role        ON profiles (role);
CREATE INDEX idx_addresses_customer   ON customer_addresses (customer_id);

-- ─── VIEWS ────────────────────────────────────────────────────────────────────

-- Dashboard stats view for admins
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)              AS today_orders,
  COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS today_revenue,
  COUNT(*) FILTER (WHERE status = 'pending')                           AS pending_orders,
  COUNT(*) FILTER (WHERE status = 'delivered' AND DATE(updated_at) = CURRENT_DATE) AS delivered_today,
  COUNT(*) FILTER (WHERE payment_status = 'unpaid' AND status = 'delivered') AS outstanding_dues_count,
  COALESCE(SUM(total_amount - amount_paid) FILTER (WHERE payment_status IN ('unpaid','partial') AND status = 'delivered'), 0) AS outstanding_amount
FROM orders;

-- Low stock view
CREATE OR REPLACE VIEW low_stock_products AS
SELECT p.id, p.name, p.sku, p.size_label, i.quantity_in_stock, i.low_stock_threshold
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.quantity_in_stock <= i.low_stock_threshold
  AND p.is_active = TRUE;
