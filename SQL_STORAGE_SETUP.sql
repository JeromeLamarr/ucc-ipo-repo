-- Supabase Storage Diagnostics and Setup for Legacy Records
-- Run this in Supabase SQL Editor

-- 1. Check if storage buckets exist
-- Run this query to see all buckets:
-- SELECT * FROM storage.buckets;

-- 2. Create or update the 'documents' bucket if needed
INSERT INTO storage.buckets (id, name, public, avx_encryption, owner, created_at, updated_at)
VALUES ('documents', 'documents', false, false, auth.uid(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Create the 'legacy-generated-documents' bucket for PDFs
INSERT INTO storage.buckets (id, name, public, avx_encryption, owner, created_at, updated_at)
VALUES ('legacy-generated-documents', 'legacy-generated-documents', false, false, auth.uid(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Drop old RLS policies on storage.objects for documents bucket
DROP POLICY IF EXISTS "Admin can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin read" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete" ON storage.objects;

-- 5. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for documents bucket
-- Allow admin users to upload
CREATE POLICY "Admin can upload to documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admin users to read
CREATE POLICY "Admin can read documents bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admin users to delete
CREATE POLICY "Admin can delete from documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 7. Create RLS policies for legacy-generated-documents bucket
-- Allow admin users to insert
CREATE POLICY "Admin can upload to legacy-generated-documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'legacy-generated-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admin users to read
CREATE POLICY "Admin can read legacy-generated-documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'legacy-generated-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow admin users to delete
CREATE POLICY "Admin can delete from legacy-generated-documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'legacy-generated-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 8. Verify setup
-- Run these queries to verify:
-- SELECT id, name, public FROM storage.buckets WHERE id IN ('documents', 'legacy-generated-documents');
-- SELECT * FROM storage.policies WHERE name LIKE '%documents%' OR name LIKE '%legacy%';
