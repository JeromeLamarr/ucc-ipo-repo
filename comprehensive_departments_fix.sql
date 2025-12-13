-- Comprehensive fix for departments RLS policies
-- This ensures public access to active departments for registration page

-- First, remove ALL existing policies on departments table
DROP POLICY IF EXISTS "Anyone can view active departments" ON departments;
DROP POLICY IF EXISTS "Admins can view all departments" ON departments;
DROP POLICY IF EXISTS "Service role can manage departments" ON departments;
DROP POLICY IF EXISTS "Service role can update departments" ON departments;
DROP POLICY IF EXISTS "Service role can delete departments" ON departments;
DROP POLICY IF EXISTS "Only admins can create departments" ON departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON departments;
DROP POLICY IF EXISTS "Only admins can delete departments" ON departments;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create the public read policy - MUST allow unauthenticated users
CREATE POLICY "Public read active departments"
ON departments FOR SELECT
TO public
USING (active = true);

-- Create admin read all policy
CREATE POLICY "Admin read all departments"
ON departments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
ON departments
USING (true)
WITH CHECK (true);

-- Test query - make sure we can read active departments
SELECT id, name, active FROM departments WHERE active = true LIMIT 5;
