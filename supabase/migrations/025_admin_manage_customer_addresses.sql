-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 025: Let admins actually write customer_addresses
--
-- 001_initial_schema.sql only ever gave admins/staff SELECT on
-- customer_addresses ("Admins view all addresses") — the only write policy
-- was "Customers manage own addresses" (FOR ALL, customer_id = auth.uid()),
-- which is correct for customer self-service but blocks an admin from
-- inserting/updating/deleting on a customer's behalf. That's exactly what
-- addCustomerAddress/updateCustomerAddress/deleteCustomerAddress
-- (021_customer_scheduling_and_addresses.sql's app code, customers/actions.ts)
-- need to do, so admin address-add was silently rejected by RLS with
-- "new row violates row-level security policy for table customer_addresses".
--
-- Scoped to super_admin/admin only, matching requireAdminAccess() in
-- customers/actions.ts exactly (staff already gets read via the existing
-- SELECT policy, but was never meant to add/edit addresses through this
-- feature).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Admins manage all addresses"
  ON customer_addresses FOR ALL
  USING (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));
