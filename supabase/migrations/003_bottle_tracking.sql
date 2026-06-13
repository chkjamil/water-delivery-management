-- ============================================================
-- AquaFlow — Bottle Tracking & Product Types
-- Run AFTER 002_app_settings.sql
-- ============================================================

-- ─── 1. Product Type Enum ─────────────────────────────────────────────────────

CREATE TYPE product_type AS ENUM (
  'standard',     -- sealed small bottles (500ml, 1.5L) — no tracking needed
  'refill',       -- water only, customer brings their own bottle
  'bundle',       -- bottle + water together (new bottle purchase)
  'bottle_only'   -- empty bottle, no water (replacement / first purchase)
);

-- ─── 2. Extend products table ─────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN product_type  product_type   NOT NULL DEFAULT 'standard',
  ADD COLUMN bottle_price  NUMERIC(10,2)  NOT NULL DEFAULT 0,
  ADD COLUMN water_price   NUMERIC(10,2)  NOT NULL DEFAULT 0;

-- For bundles: price = bottle_price + water_price
-- For refill:  price = water_price only
-- For bottle_only: price = bottle_price only
-- For standard: price is the full unit price (bottle_price/water_price not used)

-- Back-fill existing 5 Gallon product as bundle (most common)
UPDATE products SET
  product_type = 'bundle',
  bottle_price = 250,
  water_price  = 100,
  price        = 350
WHERE sku = 'WTR-5GAL';

-- Add refill variant for 5 Gallon
INSERT INTO products (name, sku, price, unit, size_label, product_type, bottle_price, water_price)
VALUES ('5 Gallon Water Refill', 'WTR-5GAL-REFILL', 100, 'refill', '5 Gallon Refill', 'refill', 0, 100)
ON CONFLICT (sku) DO NOTHING;

-- Add bottle-only variant for 5 Gallon
INSERT INTO products (name, sku, price, unit, size_label, product_type, bottle_price, water_price)
VALUES ('5 Gallon Empty Bottle', 'WTR-5GAL-BTL', 250, 'bottle', '5 Gallon Bottle', 'bottle_only', 250, 0)
ON CONFLICT (sku) DO NOTHING;

-- 1.5L and 500ml stay as standard
UPDATE products SET product_type = 'standard' WHERE sku IN ('WTR-1500ML', 'WTR-500ML', 'WTR-CRATE');

-- ─── 3. Customer Bottle Ledger ────────────────────────────────────────────────

CREATE TABLE customer_bottles (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id     UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_owned INTEGER      NOT NULL DEFAULT 0 CHECK (quantity_owned >= 0),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, product_id)
);

ALTER TABLE customer_bottles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bottle ledger"
  ON customer_bottles FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin', 'staff'));

CREATE POLICY "Customers view own bottles"
  ON customer_bottles FOR SELECT
  USING (customer_id = auth.uid());

-- ─── 4. Auto-update ledger when bundle/bottle_only is sold ───────────────────

CREATE OR REPLACE FUNCTION track_bottle_ownership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_customer_id  UUID;
  v_product_type product_type;
BEGIN
  -- Get the order's customer
  SELECT customer_id INTO v_customer_id
    FROM orders WHERE id = NEW.order_id;

  -- Get the product type
  SELECT p.product_type INTO v_product_type
    FROM products p WHERE p.id = NEW.product_id;

  -- Only track bundle and bottle_only purchases
  IF v_product_type IN ('bundle', 'bottle_only') THEN
    INSERT INTO customer_bottles (customer_id, product_id, quantity_owned)
    VALUES (v_customer_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (customer_id, product_id) DO UPDATE
      SET quantity_owned = customer_bottles.quantity_owned + NEW.quantity,
          updated_at     = NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_item_bottle_track
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION track_bottle_ownership();

-- ─── 5. Helper view: customer bottle summary ─────────────────────────────────

CREATE OR REPLACE VIEW customer_bottle_summary AS
SELECT
  cb.customer_id,
  p.full_name    AS customer_name,
  pr.name        AS product_name,
  pr.size_label,
  cb.quantity_owned,
  cb.updated_at
FROM customer_bottles cb
JOIN profiles p  ON p.id  = cb.customer_id
JOIN products pr ON pr.id = cb.product_id
WHERE cb.quantity_owned > 0;

-- ─── 6. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_customer_bottles_customer ON customer_bottles (customer_id);
CREATE INDEX idx_products_type             ON products (product_type);
