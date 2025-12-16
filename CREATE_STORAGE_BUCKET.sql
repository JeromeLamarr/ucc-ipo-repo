-- Create the generated-documents storage bucket and set up RLS policies
-- Run this in Supabase SQL Editor

-- First, create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own documents
CREATE POLICY "Users can view their generated documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-documents' AND
  EXISTS (
    SELECT 1 FROM submission_documents
    WHERE submission_documents.generated_file_path = storage.objects.path
    AND EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = submission_documents.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  ) OR
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor', 'evaluator')
);

-- Allow edge functions to upload documents
CREATE POLICY "Edge functions can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-documents' AND
  auth.role() = 'authenticated'
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-documents' AND
  (
    EXISTS (
      SELECT 1 FROM submission_documents
      WHERE submission_documents.generated_file_path = storage.objects.path
      AND EXISTS (
        SELECT 1 FROM ip_records
        WHERE ip_records.id = submission_documents.ip_record_id
        AND ip_records.applicant_id = auth.uid()
      )
    ) OR
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
);
