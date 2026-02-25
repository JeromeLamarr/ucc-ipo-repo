/*
  # Add RLS Policies for workflow_sla_policies Table
  
  This migration adds Row Level Security policies to workflow_sla_policies table.
  
  ## Changes
  1. Enable RLS on workflow_sla_policies table
  2. Add SELECT policy for authenticated users (all users can view SLA policies)
  3. Add INSERT/UPDATE/DELETE policies for admins only
  
  ## Security
  - All authenticated users can view SLA policies (needed for displaying deadlines)
  - Only admins can modify SLA policies
  - Uses existing is_admin() function for admin verification
*/

-- Enable RLS on workflow_sla_policies if not already enabled
ALTER TABLE workflow_sla_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for migration safety)
DROP POLICY IF EXISTS "Allow authenticated users to view SLA policies" ON workflow_sla_policies;
DROP POLICY IF EXISTS "Allow admins to insert SLA policies" ON workflow_sla_policies;
DROP POLICY IF EXISTS "Allow admins to update SLA policies" ON workflow_sla_policies;
DROP POLICY IF EXISTS "Allow admins to delete SLA policies" ON workflow_sla_policies;

-- SELECT: All authenticated users can view SLA policies
CREATE POLICY "Allow authenticated users to view SLA policies"
  ON workflow_sla_policies
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only admins can create new SLA policies
CREATE POLICY "Allow admins to insert SLA policies"
  ON workflow_sla_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Only admins can update SLA policies
CREATE POLICY "Allow admins to update SLA policies"
  ON workflow_sla_policies
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- DELETE: Only admins can delete SLA policies
CREATE POLICY "Allow admins to delete SLA policies"
  ON workflow_sla_policies
  FOR DELETE
  TO authenticated
  USING (is_admin());
