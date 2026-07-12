-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 029: Delivery proof-of-location/photo, and payment evidence
--
-- Two gaps: (1) nothing captures where/whether a driver actually was at the
-- customer when marking a delivery/stop complete; (2) recording a payment
-- against a customer's credit balance had no way to attach evidence and was
-- never shown to the customer it affects.
--
-- Buckets are created private (public=false). No storage.objects RLS
-- policies are added — all uploads and reads go through server actions using
-- the service-role client (lib/supabase/admin.ts), with authorization
-- enforced in application code exactly like every other privileged write in
-- this codebase (see my-stops/actions.ts, customers/actions.ts). Reads
-- always go through short-lived signed URLs, never a public bucket URL.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES
  ('delivery-proofs', 'delivery-proofs', false),
  ('payment-evidence', 'payment-evidence', false);

ALTER TABLE delivery_stops
  ADD COLUMN proof_lat NUMERIC,
  ADD COLUMN proof_lng NUMERIC,
  ADD COLUMN proof_accuracy NUMERIC,
  ADD COLUMN proof_captured_at TIMESTAMPTZ,
  ADD COLUMN proof_photo_path TEXT,
  ADD COLUMN location_available BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE deliveries
  ADD COLUMN proof_lat NUMERIC,
  ADD COLUMN proof_lng NUMERIC,
  ADD COLUMN proof_accuracy NUMERIC,
  ADD COLUMN proof_captured_at TIMESTAMPTZ,
  ADD COLUMN proof_photo_path TEXT,
  ADD COLUMN location_available BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE customer_credit_transactions
  ADD COLUMN evidence_path TEXT;

-- Extend the existing settle-payment RPC to accept optional evidence and
-- return the created row so the UI can show the real record immediately
-- instead of a fabricated optimistic one.
CREATE OR REPLACE FUNCTION record_credit_payment(
  p_customer_id UUID, p_amount NUMERIC, p_note TEXT, p_created_by UUID,
  p_evidence_path TEXT DEFAULT NULL
)
RETURNS customer_credit_transactions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row customer_credit_transactions;
BEGIN
  UPDATE customers SET credit_balance = credit_balance - p_amount WHERE id = p_customer_id;
  INSERT INTO customer_credit_transactions (customer_id, type, amount, note, evidence_path, created_by)
  VALUES (p_customer_id, 'payment', p_amount, p_note, p_evidence_path, p_created_by)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION record_credit_payment(UUID, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
