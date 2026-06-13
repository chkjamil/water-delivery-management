-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: RPC helper for empty bottle return counter
-- Called by: recordBottleReturn() server action
-- ─────────────────────────────────────────────────────────────────────────────

-- Safely increments the empty_bottles_returned counter on the inventory row
-- without overwriting other fields that may have been updated concurrently.
CREATE OR REPLACE FUNCTION increment_empty_returns(
  p_product_id UUID,
  p_quantity   INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inventory
  SET    empty_bottles_returned = COALESCE(empty_bottles_returned, 0) + p_quantity,
         updated_at             = NOW()
  WHERE  product_id = p_product_id;
END;
$$;

-- Grant execute to authenticated users (staff+ allowed to call recordBottleReturn)
GRANT EXECUTE ON FUNCTION increment_empty_returns(UUID, INTEGER) TO authenticated;
