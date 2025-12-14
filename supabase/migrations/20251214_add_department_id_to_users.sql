-- Add department_id column to users table

-- Step 1: Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'department_id'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_users_department_id ON public.users(department_id);
  END IF;
END $$;
