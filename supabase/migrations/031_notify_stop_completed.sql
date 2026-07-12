-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 031: Notify admins when a delivery stop is completed
--
-- completeStop() (app/(dashboard)/my-stops/actions.ts) inserts the order
-- with status already 'delivered' rather than going through an UPDATE, so
-- the existing notify_order_status_change() trigger (014_notifications.sql,
-- AFTER UPDATE OF status ON orders) never fires for it — and that trigger
-- only notifies the customer anyway, never admins. Admins previously had no
-- internal notification at all when a recurring stop was completed (only on
-- skip, via notify_stop_skipped(), 024_notify_stop_skipped.sql). This closes
-- that gap, mirroring the skip trigger's fan-out pattern exactly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_stop_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO notifications (recipient_id, type, title, message, related_order_id)
    SELECT id, 'order_status_changed', 'Delivery stop completed',
           'A scheduled delivery was completed.', NEW.order_id
    FROM profiles WHERE role IN ('super_admin', 'admin') AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_stop_completed_notify
  AFTER UPDATE OF status ON delivery_stops
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION notify_stop_completed();
