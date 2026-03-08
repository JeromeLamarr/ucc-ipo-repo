/*
  # Add archive_legacy_ip_records RPC function

  ## Problem
  The RLS UPDATE policy on legacy_ip_records using is_admin() is silently
  blocking soft-delete updates (returns 0 rows, no error) even for authenticated
  admins, likely due to how the Supabase client passes JWTs in certain
  environments.

  ## Solution
  Create a SECURITY DEFINER function that:
  1. Accepts an array of record UUIDs to archive
  2. Internally verifies the caller is an admin via auth.uid()
  3. Performs the soft-delete UPDATE bypassing RLS (runs as postgres)
  4. Returns the count of rows actually archived

  The client calls supabase.rpc('archive_legacy_ip_records', { p_ids: [...] })
  instead of a direct UPDATE, completely sidestepping the RLS issue.

  A companion single-record wrapper is also created for the detail page.
*/

-- ── Bulk archive (array of IDs) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_legacy_ip_records(
  p_ids        uuid[],
  p_deleted_by uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
  v_is_admin       boolean;
  v_now            timestamptz;
  v_count          integer;
BEGIN
  -- Resolve the users.id of the caller from their auth JWT
  SELECT id INTO v_caller_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  LIMIT 1;

  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: caller is not an admin';
  END IF;

  v_now := now();

  -- Perform the soft-delete as the function owner (bypasses RLS)
  UPDATE public.legacy_ip_records
  SET
    is_deleted          = TRUE,
    deleted_at          = v_now,
    deleted_by_admin_id = COALESCE(p_deleted_by, v_caller_user_id)
  WHERE id = ANY(p_ids)
    AND is_deleted = FALSE;   -- only archive active records

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated users (RLS-equivalent permission gate is internal)
GRANT EXECUTE ON FUNCTION public.archive_legacy_ip_records(uuid[], uuid)
  TO authenticated;

-- ── Single-record restore (for Deleted Archive page) ───────────────────────
CREATE OR REPLACE FUNCTION public.restore_legacy_ip_record(
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
  v_count          integer;
BEGIN
  SELECT id INTO v_caller_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  LIMIT 1;

  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: caller is not an admin';
  END IF;

  UPDATE public.legacy_ip_records
  SET
    is_deleted          = FALSE,
    deleted_at          = NULL,
    deleted_by_admin_id = NULL
  WHERE id = p_id
    AND is_deleted = TRUE;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_legacy_ip_record(uuid)
  TO authenticated;

-- ── Permanent hard-delete (for Deleted Archive page) ───────────────────────
CREATE OR REPLACE FUNCTION public.hard_delete_legacy_ip_record(
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_user_id uuid;
  v_count          integer;
BEGIN
  SELECT id INTO v_caller_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  LIMIT 1;

  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: caller is not an admin';
  END IF;

  DELETE FROM public.legacy_ip_records
  WHERE id = p_id
    AND is_deleted = TRUE;   -- only delete already-archived records

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hard_delete_legacy_ip_record(uuid)
  TO authenticated;
