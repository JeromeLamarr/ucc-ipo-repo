-- URGENT: Run this SQL directly in Supabase SQL Editor to add missing department_id columns
-- This is needed because the migrations might not run automatically

-- Step 1: Add department_id to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_department_id ON public.users(department_id);

-- Step 2: Add department_id to temp_registrations table
ALTER TABLE public.temp_registrations
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Step 3: Recreate RLS policies for temp_registrations to ensure they work
DROP POLICY IF EXISTS "temp_reg_insert_service" ON public.temp_registrations;
DROP POLICY IF EXISTS "temp_reg_update_service" ON public.temp_registrations;

CREATE POLICY "temp_reg_insert_service" ON public.temp_registrations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "temp_reg_update_service" ON public.temp_registrations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify the columns were added
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name IN ('users', 'temp_registrations') 
AND column_name = 'department_id';
