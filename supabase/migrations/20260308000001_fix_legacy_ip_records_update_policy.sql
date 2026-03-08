/*
  # Fix UPDATE policy on legacy_ip_records

  ## Problem
  The original "admins_can_manage_own_legacy_records" UPDATE policy is creator-only:
    USING (created_by_admin_id = auth.uid() AND role = 'admin')
  This means non-creator admins can see the record (SELECT passes) but silently
  fail to save any edits, because the UPDATE USING check rejects them at the DB level.

  ## Change
  - DROP the creator-only UPDATE policy
  - CREATE a new UPDATE policy that allows any authenticated admin to update any row
  - Pattern matches the existing DELETE policy ("admins_can_delete_legacy_records")

  ## Unchanged
  - INSERT policy ("admins_can_create_legacy_records") — untouched
  - DELETE policy ("admins_can_delete_legacy_records") — untouched
  - SELECT policy ("anyone_can_view_legacy_records") — untouched
  - RLS remains enabled on the table
  - legacy_record_documents policies — not touched
*/

-- Drop the existing creator-only UPDATE policy
DROP POLICY IF EXISTS "admins_can_manage_own_legacy_records" ON legacy_ip_records;

-- Create new UPDATE policy: any authenticated admin can update any legacy record
-- Mirrors the DELETE policy style exactly
CREATE POLICY "admins_can_update_legacy_records" ON legacy_ip_records
FOR UPDATE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
