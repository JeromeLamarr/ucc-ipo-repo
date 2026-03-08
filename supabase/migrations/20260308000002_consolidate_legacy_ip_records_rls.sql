/*
  # Consolidate RLS policies for legacy_ip_records

  ## Problem
  The live database has manually-applied policies that are out of sync with
  the migration history:

    allow_all_delete   DELETE  -- applied manually, likely USING (true) = no role check
    allow_all_insert   INSERT  -- applied manually, likely WITH CHECK (true) = no role check
    allow_all_select   SELECT  -- applied manually, likely USING (true)
    allow_all_update   UPDATE  -- applied manually, likely USING (true) = no role check

  These unsafe policies coexist with the admin-scoped policies added in
  earlier migrations.  Because Supabase RLS grants access when ANY policy
  passes, the allow_all_* policies completely bypass the admin role checks.

  ## This migration
  1. Drops ALL policies on legacy_ip_records (tracked + untracked) via IF EXISTS
  2. Recreates the definitive, authoritative four-policy set
  3. Leaves RLS enabled

  ## Final policy set (authoritative)
  - SELECT : anyone can view (intentional -- legacy records are public-read)
  - INSERT : any authenticated admin
  - UPDATE : any authenticated admin  (aligned with DELETE, replaces creator-only rule)
  - DELETE : any authenticated admin
*/

-- ============================================================
-- 1. Drop ALL known policies (both tracked and manually applied)
-- ============================================================

-- From original migration 20251229000002
DROP POLICY IF EXISTS "admins_can_create_legacy_records"    ON legacy_ip_records;
DROP POLICY IF EXISTS "admins_can_manage_own_legacy_records" ON legacy_ip_records;
DROP POLICY IF EXISTS "admins_can_delete_legacy_records"    ON legacy_ip_records;
DROP POLICY IF EXISTS "anyone_can_view_legacy_records"      ON legacy_ip_records;

-- From migration 20260308000001
DROP POLICY IF EXISTS "admins_can_update_legacy_records"    ON legacy_ip_records;

-- Manually applied (not tracked in any migration file)
DROP POLICY IF EXISTS "allow_all_delete"  ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_insert"  ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_select"  ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_update"  ON legacy_ip_records;

-- ============================================================
-- 2. Recreate the definitive admin-scoped policy set
-- ============================================================

-- SELECT: publicly readable (intentional for legacy archive)
CREATE POLICY "legacy_ip_records_select"
  ON legacy_ip_records
  FOR SELECT
  USING (true);

-- INSERT: any authenticated admin
CREATE POLICY "legacy_ip_records_insert"
  ON legacy_ip_records
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- UPDATE: any authenticated admin (no creator-only restriction)
CREATE POLICY "legacy_ip_records_update"
  ON legacy_ip_records
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- DELETE: any authenticated admin
CREATE POLICY "legacy_ip_records_delete"
  ON legacy_ip_records
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
