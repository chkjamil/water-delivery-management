-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 027: Prevent deleting a customer's last address or a schedule-linked one
--
-- Two deletion paths exist for customer_addresses: the admin-side
-- deleteCustomerAddress() (customers/actions.ts, already has a JS-level
-- minimum-address precheck) and the customer's own self-service
-- ProfileClient.tsx, which calls the Supabase client directly with NO
-- validation at all. A customer could delete the exact address admin
-- configured with a delivery zone for their recurring schedule — silently
-- breaking it (customer_delivery_preferences.address_id is ON DELETE SET
-- NULL, so it just falls back to their default address, which may have no
-- zone or may not exist at all).
--
-- A DB-level trigger is the only enforcement point that can't be bypassed by
-- any current or future code path (including direct client-side calls),
-- unlike a JS-only check. It's the source of truth; the friendly precheck in
-- deleteCustomerAddress() stays for a cleaner error message on the admin
-- side, matching this codebase's existing double-enforcement style (e.g. the
-- schedule-plan immutability RLS + precheck in 022_schedule_engine.sql).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_unsafe_address_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_address_count INTEGER;
  v_linked_pref   RECORD;
BEGIN
  -- BEFORE DELETE: OLD is still counted, so <= 1 means "this is the only one".
  SELECT COUNT(*) INTO v_address_count
    FROM customer_addresses WHERE customer_id = OLD.customer_id;
  IF v_address_count <= 1 THEN
    RAISE EXCEPTION 'A customer must have at least one address.';
  END IF;

  -- Blocks deleting the address an active delivery schedule resolves to —
  -- either explicitly set, or implicitly (schedule has no explicit address
  -- and this is the customer's current default).
  SELECT * INTO v_linked_pref
    FROM customer_delivery_preferences
   WHERE customer_id = OLD.customer_id
     AND is_active = TRUE
     AND (address_id = OLD.id OR (address_id IS NULL AND OLD.is_default));
  IF FOUND THEN
    RAISE EXCEPTION 'This address is used for an active delivery schedule. Update the schedule before deleting it.';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_unsafe_address_deletion
  BEFORE DELETE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_address_deletion();
