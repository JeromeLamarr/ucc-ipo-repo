-- Fix departments RLS policy to allow public access to active departments
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active departments" ON departments;

-- Create corrected policy that allows unauthenticated users to view active departments
CREATE POLICY "Anyone can view active departments"
ON departments FOR SELECT
USING (active = true);
