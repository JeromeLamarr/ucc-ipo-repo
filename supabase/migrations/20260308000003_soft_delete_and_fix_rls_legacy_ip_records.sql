/*
  # Soft delete + RLS fix for legacy_ip_records

  ## Problems addressed

  1. ROOT CAUSE — RLS policies in migration 20260308000002 used
       (SELECT role FROM users WHERE id = auth.uid())
     but `users.id` is an internal UUID; the Supabase auth UUID is stored in
     `users.auth_user_id`. This meant every admin INSERT/UPDATE/DELETE silently
     affected 0 rows (policy condition evaluated to NULL → deny), while the UI
     optimistically removed rows that were never deleted in the DB — causing
     records to "reappear" after a page refresh.

  2. MISSING soft-delete — legacy_ip_records had no is_deleted / deleted_at
     columns, so deleted records could not be archived or shown in
     Deleted Archive.

  ## Changes in this migration

  A. Add soft-delete columns to legacy_ip_records:
       is_deleted          BOOLEAN NOT NULL DEFAULT FALSE
       deleted_at          TIMESTAMPTZ NULL
       deleted_by_admin_id UUID    NULL

  B. Drop ALL legacy_ip_records RLS policies (including 20260308000002 ones)
     and recreate them using the existing public.is_admin() SECURITY DEFINER
     function (which correctly uses auth_user_id = auth.uid()).

  C. Update the existing SELECT policy to exclude soft-deleted rows for
     regular viewers; admins still need to see deleted rows via Deleted Archive
     so we keep SELECT open (is_deleted rows are shown in the archive UI,
     which filters deliberately).

  ## Policy set after this migration (authoritative)
  - SELECT : USING (true)                       → public read (list + archive pages filter in app)
  - INSERT : WITH CHECK (is_admin())            → any authenticated admin
  - UPDATE : USING (is_admin())                 → any authenticated admin
             WITH CHECK (is_admin())
  - DELETE : USING (is_admin())                 → any authenticated admin (permanent delete from archive)
*/

-- ============================================================
-- A. Add soft-delete columns
-- ============================================================

ALTER TABLE legacy_ip_records
  ADD COLUMN IF NOT EXISTS is_deleted          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_admin_id UUID        NULL;

-- Index for fast filtering of active vs deleted records
CREATE INDEX IF NOT EXISTS idx_legacy_ip_records_is_deleted
  ON legacy_ip_records (is_deleted);

-- ============================================================
-- B. Drop ALL known policies from previous migrations
-- ============================================================

-- From 20251229000002
DROP POLICY IF EXISTS "admins_can_create_legacy_records"     ON legacy_ip_records;
DROP POLICY IF EXISTS "admins_can_manage_own_legacy_records" ON legacy_ip_records;
DROP POLICY IF EXISTS "admins_can_delete_legacy_records"     ON legacy_ip_records;
DROP POLICY IF EXISTS "anyone_can_view_legacy_records"       ON legacy_ip_records;

-- From 20260308000001
DROP POLICY IF EXISTS "admins_can_update_legacy_records"     ON legacy_ip_records;

-- From 20260308000002
DROP POLICY IF EXISTS "legacy_ip_records_select" ON legacy_ip_records;
DROP POLICY IF EXISTS "legacy_ip_records_insert" ON legacy_ip_records;
DROP POLICY IF EXISTS "legacy_ip_records_update" ON legacy_ip_records;
DROP POLICY IF EXISTS "legacy_ip_records_delete" ON legacy_ip_records;

-- Manually applied (not in any migration)
DROP POLICY IF EXISTS "allow_all_delete" ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_insert" ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_select" ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_update" ON legacy_ip_records;

-- ============================================================
-- C. Recreate policies using is_admin() (correct auth check)
-- ============================================================

-- SELECT: publicly readable (intentional — legacy archive is a public record)
-- The Deleted Archive page filters is_deleted=true in the app query.
-- The active Legacy Records list filters is_deleted=false in the app query.
CREATE POLICY "legacy_ip_records_select"
  ON legacy_ip_records
  FOR SELECT
  USING (true);

-- INSERT: any authenticated admin
CREATE POLICY "legacy_ip_records_insert"
  ON legacy_ip_records
  FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: any authenticated admin (covers soft-delete updates)
CREATE POLICY "legacy_ip_records_update"
  ON legacy_ip_records
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: any authenticated admin (permanent hard-delete from Deleted Archive only)
CREATE POLICY "legacy_ip_records_delete"
  ON legacy_ip_records
  FOR DELETE
  USING (public.is_admin());
