-- Add file_path column to certificates table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificates' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE public.certificates 
    ADD COLUMN file_path TEXT;
    RAISE NOTICE 'Column file_path added to certificates table';
  ELSE
    RAISE NOTICE 'Column file_path already exists in certificates table';
  END IF;
END $$;
