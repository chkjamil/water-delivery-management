-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: POS helpers
--   - Adds balance & payment_method columns to orders if not already there
--   - RPC to safely increment a customer's outstanding balance
-- ─────────────────────────────────────────────────────────────────────────────

-- customers already has credit_balance from migration 001 — no extra column needed

-- Ensure orders table has POS-specific columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type      TEXT NOT NULL DEFAULT 'walk_in',
  ADD COLUMN IF NOT EXISTS payment_method  TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status  TEXT NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Safely increments a customer's outstanding balance (for credit orders)
CREATE OR REPLACE FUNCTION increment_customer_balance(
  p_customer_id UUID,
  p_amount      NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE customers
  SET    credit_balance = COALESCE(credit_balance, 0) + p_amount
  WHERE  id = p_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_customer_balance(UUID, NUMERIC) TO authenticated;

-- RLS: staff can read all profiles (needed for POS customer search)
-- is_active and full_name live on profiles, not customers
DROP POLICY IF EXISTS "Staff can read active customers" ON profiles;
CREATE POLICY "Staff can read active customers"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('super_admin', 'admin', 'staff')
  );
