-- ============================================================
-- AquaFlow — App Settings Table
-- Run AFTER 001_initial_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage settings"
  ON app_settings FOR ALL
  USING (current_user_role() = 'super_admin');

CREATE POLICY "Authenticated users can read settings"
  ON app_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed default values
INSERT INTO app_settings (key, value) VALUES
  ('business_name',  'AquaFlow Water Co.'),
  ('tagline',        'Pure water, delivered fast'),
  ('currency',       'PKR'),
  ('tax_rate',       '0'),
  ('invoice_prefix', 'INV'),
  ('order_prefix',   'ORD'),
  ('city',           'Islamabad'),
  ('footer_note',    'Thank you for your business!')
ON CONFLICT (key) DO NOTHING;
