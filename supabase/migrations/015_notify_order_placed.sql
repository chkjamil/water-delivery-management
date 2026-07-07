-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 015: In-app notification for order placement (online orders)
--
-- sendOrderConfirmation() already emails the customer the moment an online
-- order is placed (app/(dashboard)/order/actions.ts:211), but the bell
-- notification system (014_notifications.sql) only fires on status CHANGES
-- (AFTER UPDATE), not on the initial INSERT — so today there's an email but
-- no matching in-app notification for order placement. This closes that gap.
--
-- Reuses the existing 'order_status_changed' enum value rather than adding a
-- new one, since ALTER TYPE ... ADD VALUE can't be used in the same
-- transaction/script that also uses the new value — reusing avoids that
-- pitfall entirely and needs zero frontend changes (Header's icon mapping
-- already covers this type).
--
-- Scoped to order_type = 'online' only, matching sendOrderConfirmation's
-- scope exactly — POS orders (walk-in or with a selected customer) never
-- get a confirmation email today, so they don't get this notification
-- either, for consistency.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_order_placed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.customer_id IS NULL OR NEW.order_type <> 'online' THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, type, title, message, related_order_id)
  VALUES (
    NEW.customer_id,
    'order_status_changed',
    'Order #' || NEW.order_number || ' placed',
    'We''ve received your order and will confirm it shortly.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_placed_notify
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_placed();
