-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014: In-app notifications
--
-- Adds a per-recipient notifications table fed by 3 triggers, matching this
-- app's existing convention of Postgres triggers for side-effects-on-mutation
-- (deduct_inventory_on_confirm, recalculate_order_totals, track_bottle_ownership,
-- create_delivery_for_order, apply_stock_transaction — all in 001/003).
--
--   1. notify_order_status_change — orders AFTER UPDATE OF status
--      Covers BOTH "order status changed" and "delivery status changed",
--      since updateDeliveryStatus/goEnRoute/markDelivered/markFailed all sync
--      orders.status as part of their work already (same signal customer
--      emails are already gated on).
--   2. notify_delivery_assigned — deliveries AFTER UPDATE OF driver_id
--      Notifies the newly assigned driver.
--   3. notify_low_stock — inventory AFTER UPDATE OF quantity_in_stock
--      Only fires on the transition INTO low stock, fanned out to all
--      active admin/staff profiles. Placed on `inventory` (not the JS
--      actions) because the actual quantity mutation happens inside the
--      existing apply_stock_transaction trigger, and bottle returns via
--      my-deliveries/actions.ts insert into stock_transactions directly,
--      bypassing inventory/actions.ts entirely — a trigger here catches
--      every path uniformly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE notification_type AS ENUM (
  'order_status_changed',
  'delivery_assigned',
  'low_stock_alert'
);

CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                notification_type NOT NULL,
  title               TEXT NOT NULL,
  message             TEXT,
  related_order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
  related_delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  related_product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- No INSERT policy: all rows are written by SECURITY DEFINER trigger
-- functions below, which bypass RLS — matching current_user_role() /
-- increment_customer_balance conventions elsewhere in this schema.

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_id, is_read, created_at DESC);

-- ─── 1. Order / delivery status change → notify the customer ─────────────────

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Walk-in POS orders have no customer to notify
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('dispatched', 'en_route', 'delivered', 'failed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, type, title, message, related_order_id)
  VALUES (
    NEW.customer_id,
    'order_status_changed',
    'Order #' || NEW.order_number || ' ' || REPLACE(NEW.status, '_', ' '),
    NULL,
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_notify
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION notify_order_status_change();

-- ─── 2. Delivery assigned → notify the driver ─────────────────────────────────

CREATE OR REPLACE FUNCTION notify_delivery_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, title, message, related_delivery_id, related_order_id)
    VALUES (
      NEW.driver_id,
      'delivery_assigned',
      'New delivery assigned',
      NULL,
      NEW.id,
      NEW.order_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_delivery_assigned_notify
  AFTER UPDATE OF driver_id ON deliveries
  FOR EACH ROW
  WHEN (NEW.driver_id IS DISTINCT FROM OLD.driver_id)
  EXECUTE FUNCTION notify_delivery_assigned();

-- ─── 3. Low stock → notify admins/staff (fan-out) ─────────────────────────────

CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_product_name TEXT;
BEGIN
  -- Only fire on the crossing INTO low stock — avoids repeat spam while
  -- stock stays low across multiple subsequent mutations.
  IF NEW.quantity_in_stock <= NEW.low_stock_threshold
     AND (OLD.quantity_in_stock > OLD.low_stock_threshold) THEN

    SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;

    INSERT INTO notifications (recipient_id, type, title, message, related_product_id)
    SELECT
      id,
      'low_stock_alert',
      'Low stock: ' || COALESCE(v_product_name, 'Product'),
      'Only ' || NEW.quantity_in_stock || ' left (threshold ' || NEW.low_stock_threshold || ')',
      NEW.product_id
    FROM profiles
    WHERE role IN ('super_admin', 'admin', 'staff') AND is_active = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_inventory_low_stock_notify
  AFTER UPDATE OF quantity_in_stock ON inventory
  FOR EACH ROW
  WHEN (NEW.quantity_in_stock IS DISTINCT FROM OLD.quantity_in_stock)
  EXECUTE FUNCTION notify_low_stock();
