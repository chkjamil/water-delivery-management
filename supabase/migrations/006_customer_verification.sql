-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Customer phone/email verification tracking
-- ─────────────────────────────────────────────────────────────────────────────

-- Track phone verification separately (email is tracked by Supabase Auth)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Update handle_new_user trigger to also:
--   1. Save phone from user metadata
--   2. Auto-create a customers row when role = customer
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-create customers row for customer-role users
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'customer' THEN
    INSERT INTO customers (id) VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- RLS: customers can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- RLS: admins can read/write all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- RLS: users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS: customers can read their own customers row
DROP POLICY IF EXISTS "Customers can read own row" ON customers;
CREATE POLICY "Customers can read own row"
  ON customers FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR current_user_role() IN ('super_admin', 'admin', 'staff'));

-- RLS: admins can manage all customer rows
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));
