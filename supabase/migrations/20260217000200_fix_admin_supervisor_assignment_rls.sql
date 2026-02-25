/*
  # Fix Admin Supervisor Assignment RLS Policy

  ## Problem
  Admins cannot manually assign supervisors to IP records because the RLS policy 
  on supervisor_assignments only allows the applicant to insert records.

  ## Solution
  Add an RLS policy to allow admins to insert supervisor_assignments

  ## Security
  - Admins can create supervisor assignments for any IP record
  - Existing applicant policy remains unchanged
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Create assignments" ON supervisor_assignments;

-- Recreate it with applicant access
CREATE POLICY "Applicants create assignments" ON supervisor_assignments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM ip_records WHERE ip_records.id = supervisor_assignments.ip_record_id
  AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

-- Add new policy for admins
CREATE POLICY "Admins create supervisor assignments" ON supervisor_assignments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));
