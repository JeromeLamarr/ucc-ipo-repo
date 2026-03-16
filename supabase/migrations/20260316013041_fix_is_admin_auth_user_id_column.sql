/*
  # Fix is_admin() function to use correct column

  ## Summary
  The is_admin() helper function was checking `WHERE id = auth.uid()` but the users
  table maps Supabase auth UIDs via the `auth_user_id` column, not `id`.
  This caused is_admin() to always return false, blocking all admin-only RPC calls
  (including upsert_disclosure_signatories and upsert_certificate_signatories).

  ## Changes
  - Replaces is_admin() body to use `auth_user_id = auth.uid()` instead of `id = auth.uid()`
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;
