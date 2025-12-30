-- Update legacy_ip_records table to include complete details columns
-- Run this in Supabase SQL Editor

-- 1. Add missing columns if they don't exist
ALTER TABLE legacy_ip_records
ADD COLUMN IF NOT EXISTS abstract TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_legacy_ip_records_category ON legacy_ip_records(category);
CREATE INDEX IF NOT EXISTS idx_legacy_ip_records_created_at ON legacy_ip_records(created_at);
CREATE INDEX IF NOT EXISTS idx_legacy_ip_records_legacy_source ON legacy_ip_records(legacy_source);
CREATE INDEX IF NOT EXISTS idx_legacy_ip_records_admin_id ON legacy_ip_records(admin_id);

-- 3. Ensure legacy_record_documents table has correct structure
-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.legacy_record_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.legacy_ip_records(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- 'disclosure' or 'certificate'
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  pdf_data TEXT, -- Base64 encoded PDF
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for legacy_record_documents
CREATE INDEX IF NOT EXISTS idx_legacy_record_documents_record_id ON public.legacy_record_documents(record_id);
CREATE INDEX IF NOT EXISTS idx_legacy_record_documents_created_at ON public.legacy_record_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_legacy_record_documents_document_type ON public.legacy_record_documents(document_type);

-- 5. Enable RLS on legacy_record_documents if not already enabled
ALTER TABLE public.legacy_record_documents ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for legacy_record_documents
-- Drop existing policies first
DROP POLICY IF EXISTS legacy_record_documents_insert_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_select_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_update_policy ON public.legacy_record_documents;
DROP POLICY IF EXISTS legacy_record_documents_delete_policy ON public.legacy_record_documents;

-- Allow admin users to insert
CREATE POLICY legacy_record_documents_insert_policy 
  ON public.legacy_record_documents 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ));

-- Allow admin users to select
CREATE POLICY legacy_record_documents_select_policy 
  ON public.legacy_record_documents 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ));

-- Allow admin users to update
CREATE POLICY legacy_record_documents_update_policy 
  ON public.legacy_record_documents 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ));

-- Allow admin users to delete
CREATE POLICY legacy_record_documents_delete_policy 
  ON public.legacy_record_documents 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ));

-- 7. Create or update the trigger for updated_at on legacy_ip_records
CREATE OR REPLACE FUNCTION update_legacy_ip_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS legacy_ip_records_update_trigger ON public.legacy_ip_records;

CREATE TRIGGER legacy_ip_records_update_trigger
BEFORE UPDATE ON public.legacy_ip_records
FOR EACH ROW
EXECUTE FUNCTION update_legacy_ip_records_updated_at();

-- 8. Create or update the trigger for updated_at on legacy_record_documents
CREATE OR REPLACE FUNCTION update_legacy_record_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS legacy_record_documents_update_trigger ON public.legacy_record_documents;

CREATE TRIGGER legacy_record_documents_update_trigger
BEFORE UPDATE ON public.legacy_record_documents
FOR EACH ROW
EXECUTE FUNCTION update_legacy_record_documents_updated_at();
