-- Check and fix RLS policies for departments table public access

-- Step 1: Check current policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'departments'
ORDER BY policyname;

-- Step 2: If needed, enable RLS and create policy for public read access
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy for public (unauthenticated) access to active departments
DROP POLICY IF EXISTS "Allow public read active departments" ON public.departments;

CREATE POLICY "Allow public read active departments" 
  ON public.departments 
  FOR SELECT 
  USING (active = true);

-- Step 4: Create policy for authenticated users to read all departments
DROP POLICY IF EXISTS "Allow authenticated read all departments" ON public.departments;

CREATE POLICY "Allow authenticated read all departments" 
  ON public.departments 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Step 5: Verify policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'departments'
ORDER BY policyname;

-- Step 6: Test query to verify public access works
SELECT id, name, description, active FROM public.departments WHERE active = true ORDER BY name;
