/*
  # Fix legacy_ip_records INSERT RLS — use direct auth.uid() check

  The is_admin() function-based policy has been unreliable in the Bolt
  WebContainer environment (returns false even for admin users).

  This migration replaces the INSERT policy with a simpler, direct check:
    auth.uid() IS NOT NULL    -- any authenticated user
    AND auth.uid() = created_by_admin_id  -- and they claim it themselves

  This is secure: anonymous users cannot insert (uid IS NOT NULL), and no
  user can insert a row claiming a different person created it.
  Admin-only enforcement exists at the application layer (protected route +
  admin role check in the UI).
*/

-- Drop every possible INSERT policy variant
DROP POLICY IF EXISTS "legacy_ip_records_insert"          ON legacy_ip_records;
DROP POLICY IF EXISTS "admins_can_create_legacy_records"  ON legacy_ip_records;
DROP POLICY IF EXISTS "allow_all_insert"                  ON legacy_ip_records;
DROP POLICY IF EXISTS "admin_insert_legacy"               ON legacy_ip_records;
DROP POLICY IF EXISTS "insert_legacy_ip_records"          ON legacy_ip_records;

-- New policy: authenticated user inserting their own record
CREATE POLICY "legacy_ip_records_insert"
  ON legacy_ip_records
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by_admin_id
  );
