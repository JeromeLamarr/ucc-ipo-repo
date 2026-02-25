-- Add department_id column to temp_registrations if it doesn't exist

-- Step 1: Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'temp_registrations' 
    AND column_name = 'department_id'
  ) THEN
    ALTER TABLE public.temp_registrations
    ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Ensure RLS policies allow service role to insert and update department_id
-- (These should already exist, but we make sure)
DROP POLICY IF EXISTS "temp_reg_insert_service" ON public.temp_registrations;
CREATE POLICY "temp_reg_insert_service" ON public.temp_registrations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "temp_reg_update_service" ON public.temp_registrations;
CREATE POLICY "temp_reg_update_service" ON public.temp_registrations
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
