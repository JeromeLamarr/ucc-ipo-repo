-- LEGACY RECORDS FILE UPLOAD FIX
-- Storage Bucket & RLS Configuration
-- Run these commands in Supabase SQL Editor

-- STEP 1: Create the 'documents' bucket if it doesn't exist
-- (Supabase doesn't have IF NOT EXISTS for buckets, so we'll use the UI or API)
-- Go to Supabase Dashboard > Storage > Create new bucket
-- Name: documents
-- Public: OFF
-- Then run the RLS policies below

-- STEP 2: List all existing buckets (run this first to check what you have)
SELECT id, name, public, created_at FROM storage.buckets ORDER BY created_at DESC;

-- STEP 3: If 'documents' bucket doesn't exist, you need to:
-- A) Go to Supabase Dashboard
-- B) Click Storage in sidebar
-- C) Click "Create a new bucket"
-- D) Name: documents
-- E) Public: toggle OFF
-- F) Click Create bucket

-- STEP 4: Then run these RLS policies
-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Admin can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin read documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete documents" ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_0" ON storage.objects;
DROP POLICY IF EXISTS "admin_read_0" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_0" ON storage.objects;

-- Policy 1: Allow authenticated admins to upload to documents bucket
CREATE POLICY "admin_upload_documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 2: Allow authenticated admins to read from documents bucket
CREATE POLICY "admin_read_documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 3: Allow authenticated admins to update in documents bucket
CREATE POLICY "admin_update_documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy 4: Allow authenticated admins to delete from documents bucket
CREATE POLICY "admin_delete_documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- VERIFY SETUP
-- Run these queries to confirm:
SELECT 'Buckets' as check, id, name, public FROM storage.buckets WHERE id = 'documents'
UNION ALL
SELECT 'Policies', policy_name, NULL, NULL FROM (
  SELECT policy_name FROM storage.policies WHERE name ILIKE '%documents%'
) policies;
