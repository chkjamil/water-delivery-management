-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 024: Notify admins when a delivery stop is skipped
--
-- Mirrors notify_low_stock()'s "fan out to all admins" pattern
-- (014_notifications.sql) and reuses the existing 'order_status_changed'
-- notification type rather than adding a new enum value, for the same
-- reason 015_notify_order_placed.sql gives: ALTER TYPE ... ADD VALUE can't
-- be used in the same script that also uses the new value, and reusing
-- needs zero frontend change (Header's icon map already covers this type).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_stop_skipped()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'skipped' AND OLD.status IS DISTINCT FROM 'skipped' THEN
    INSERT INTO notifications (recipient_id, type, title, message)
    SELECT id, 'order_status_changed', 'Delivery stop skipped',
           COALESCE(NEW.skipped_reason, 'A scheduled delivery stop was skipped.')
    FROM profiles WHERE role IN ('super_admin', 'admin') AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_stop_skipped_notify
  AFTER UPDATE OF status ON delivery_stops
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION notify_stop_skipped();
