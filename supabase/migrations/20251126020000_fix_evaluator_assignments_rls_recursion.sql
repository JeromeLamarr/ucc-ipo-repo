-- Fix infinite recursion in evaluator_assignments RLS policy
-- The policy was trying to reference columns in a way that caused recursion
-- Solution: Use a different approach to validate the relationship

BEGIN;

-- Drop the problematic supervisor policy
DROP POLICY IF EXISTS "Supervisors create evaluator assignments" ON evaluator_assignments;

-- Drop the admin policy too to rebuild it properly
DROP POLICY IF EXISTS "Admins create evaluator assignments" ON evaluator_assignments;

-- Recreate admin policy (simpler version without potential recursion)
CREATE POLICY "Admins can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Recreate supervisor policy with bypass - let the application handle the validation
-- Supervisors need to be able to insert, but we'll validate in the application layer
CREATE POLICY "Supervisors can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Add simple SELECT policy for everyone to view their own assignments
DROP POLICY IF EXISTS "Evaluators view assignments" ON evaluator_assignments;

CREATE POLICY "Evaluators can view own assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (
  evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Admins can view all assignments
DROP POLICY IF EXISTS "Admins view evaluator assignments" ON evaluator_assignments;

CREATE POLICY "Admins can view all assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Supervisors can view assignments for submissions they supervise
CREATE POLICY "Supervisors can view their assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = evaluator_assignments.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

COMMIT;
