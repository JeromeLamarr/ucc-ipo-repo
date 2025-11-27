/*
  # Ensure file_path column exists on certificates table

  This migration ensures the certificates table has the file_path column.
  If it already exists, this is a no-op.
*/

DO $$
BEGIN
  -- Check if column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificates' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE public.certificates 
    ADD COLUMN file_path TEXT;
    
    COMMENT ON COLUMN public.certificates.file_path IS 'Path to the PDF file in storage';
  END IF;
END $$;
