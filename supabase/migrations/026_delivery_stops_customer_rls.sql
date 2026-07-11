-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 026: Let delivery_person actually see who/where they're delivering
--
-- app/(dashboard)/my-stops/page.tsx joins delivery_stops -> customer:profiles(...)
-- and address:customer_addresses(...), and MyStopsClient.tsx already renders the
-- customer's name, a call button, and the address. But 020_delivery_person_rls.sql's
-- SELECT policies on profiles/customer_addresses only grant access via
-- `orders JOIN deliveries WHERE driver_id = auth.uid()` — written before
-- delivery_stops existed, for the /my-deliveries flow only. A delivery_stops row
-- has no orders/deliveries row until completeStop() creates one, so for every
-- 'pending' stop — exactly when the driver needs this info — RLS silently
-- returned NULL for both joins.
--
-- Additive SELECT policies (OR'd with the existing ones from 020, no conflict),
-- scoped identically (only rows tied to a stop actually assigned to that driver),
-- just keyed off delivery_stops.driver_id instead of the orders/deliveries chain.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Delivery persons view stop customer profiles"
  ON profiles FOR SELECT
  USING (
    id IN (SELECT customer_id FROM delivery_stops WHERE driver_id = auth.uid())
  );

CREATE POLICY "Delivery persons view stop addresses"
  ON customer_addresses FOR SELECT
  USING (
    id IN (SELECT address_id FROM delivery_stops WHERE driver_id = auth.uid())
  );
