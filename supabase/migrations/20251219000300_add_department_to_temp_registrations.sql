-- Add department_id to temp_registrations table
DO $$
BEGIN
  -- Check if temp_registrations table exists and has department_id column
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'temp_registrations'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name='temp_registrations' 
      AND column_name='department_id'
    ) THEN
      ALTER TABLE temp_registrations ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create index for department_id if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'temp_registrations'
  ) THEN
    IF NOT EXISTS (
      SELECT FROM pg_indexes 
      WHERE indexname = 'idx_temp_registrations_department_id'
    ) THEN
      CREATE INDEX idx_temp_registrations_department_id ON temp_registrations(department_id);
    END IF;
  END IF;
END $$;
