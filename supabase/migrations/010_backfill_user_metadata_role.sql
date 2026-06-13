-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Backfill role into auth.users.user_metadata
--
-- The middleware now reads the role from user_metadata (JWT) instead of
-- querying the profiles table on every request. This migration syncs the
-- role for any existing users who were created before that change.
--
-- Run this once in the Supabase SQL editor (requires service_role access).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE auth.users.id = p.id
  AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' = '');
