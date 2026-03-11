/*
  # Fix legacy_ip_records INSERT RLS for bulk import

  The live database may have stale or missing INSERT policies that block
  bulk inserts while allowing single-row inserts from the manual form.

  This migration:
  1. Ensures the is_admin() function exists and is correct
  2. Drops ALL existing INSERT policies (tracked + any manually applied)
  3. Re-creates a single, authoritative INSERT policy: any authenticated admin
*/

-- ============================================================
-- 1. Ensure is_admin() helper is present and correct
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id   = auth.uid()
      AND role = 'admin'
  );
$$;

-- ============================================================
-- 2. Drop every known INSERT policy variant (safe: IF EXISTS)
-- ============================================================
DROP POLICY IF EXISTS "legacy_ip_records_insert"       ON legacy_ip_records;
DROP POLICY IF EXISTS "admins_can_create_legacy_records" ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_insert"               ON legacy_ip_records;
DROP POLICY IF EXISTS "admin_insert_legacy"            ON legacy_ip_records;
DROP POLICY IF EXISTS "insert_legacy_ip_records"       ON legacy_ip_records;

-- ============================================================
-- 3. Create the single authoritative INSERT policy
-- ============================================================
CREATE POLICY "legacy_ip_records_insert"
  ON legacy_ip_records
  FOR INSERT
  WITH CHECK (public.is_admin());
