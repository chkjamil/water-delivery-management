-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Sync email_confirmed_at → profiles.email_verified
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- For admin-created users (email_confirm: true), mark email_verified immediately
-- by updating handle_new_user to check confirmed_at
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    NEW.email_confirmed_at IS NOT NULL  -- true for admin-created users
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

-- Trigger: when a user confirms their email (email_confirmed_at goes from NULL → timestamp)
-- sync it to profiles.email_verified = true
CREATE OR REPLACE FUNCTION sync_email_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET email_verified = TRUE
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_verified();
