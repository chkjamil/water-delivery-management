-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Order & product extensions
--   1. Add delivery_address TEXT to orders (denormalized snapshot for history)
--   2. Add product_type + split pricing to products (needed for catalog grouping)
--   3. Ensure order_items subtotal insert works (already generated column in 001,
--      so this migration just documents the constraint for clarity)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Orders: delivery address snapshot ──────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- ── 2. Products: type + split pricing ────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type  TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS bottle_price  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS water_price   NUMERIC(10,2);

-- If bottle_price/water_price were previously added with NOT NULL, relax them —
-- refill products legitimately have no bottle component.
ALTER TABLE products
  ALTER COLUMN bottle_price DROP NOT NULL,
  ALTER COLUMN water_price  DROP NOT NULL;

-- Validate product_type values
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_product_type_check;
ALTER TABLE products
  ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'refill', 'bundle', 'bottle_only'));

-- Update existing seeded products to standard type
UPDATE products SET product_type = 'standard' WHERE product_type IS NULL;

-- ── 3. Seed example bundle & refill products ──────────────────────────────────
-- Only insert if these SKUs don't already exist
INSERT INTO products (name, sku, price, unit, size_label, product_type, bottle_price, water_price)
  SELECT '5 Gallon Bundle (Bottle + Water)', 'BND-5GAL', 350.00, 'bundle', '5 Gallon', 'bundle', 200.00, 150.00
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'BND-5GAL');

INSERT INTO products (name, sku, price, unit, size_label, product_type, bottle_price, water_price)
  SELECT '5 Gallon Refill (Own Bottle)',     'REF-5GAL', 150.00, 'bottle', '5 Gallon', 'refill', 0.00, 150.00
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'REF-5GAL');

INSERT INTO products (name, sku, price, unit, size_label, product_type)
  SELECT '5 Gallon Bottle Only',             'BTL-5GAL', 200.00, 'bottle', '5 Gallon', 'bottle_only'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'BTL-5GAL');

-- ── 4. Ensure inventory rows exist for any new products ───────────────────────
INSERT INTO inventory (product_id)
  SELECT id FROM products
  WHERE id NOT IN (SELECT product_id FROM inventory);
