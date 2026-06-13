-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Payment method toggles in app_settings
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO app_settings (key, value) VALUES
  ('payment_cash_enabled',   'true'),
  ('payment_online_enabled', 'true'),
  ('payment_credit_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Delivery fee setting (0 = free)
INSERT INTO app_settings (key, value) VALUES
  ('delivery_fee', '0')
ON CONFLICT (key) DO NOTHING;
