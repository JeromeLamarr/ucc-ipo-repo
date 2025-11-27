-- Fix RLS policies for ip_documents and process_tracking
-- These tables need to be visible to supervisors and evaluators for their assigned records

BEGIN;

-- Drop old problematic policies on ip_documents
DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;

-- Create new policies for ip_documents
-- Applicants can view and upload their own documents
CREATE POLICY "Applicants view own documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Applicants upload documents" ON ip_documents
FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

-- Supervisors can view documents for records they supervise
CREATE POLICY "Supervisors view documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

-- Evaluators can view documents for records they evaluate
CREATE POLICY "Evaluators view documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

-- Admins can view all documents
CREATE POLICY "Admins view all documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Drop old policies on process_tracking
DROP POLICY IF EXISTS "Admins view tracking" ON process_tracking;
DROP POLICY IF EXISTS "Applicants view tracking" ON process_tracking;

-- Create new policies for process_tracking
-- Everyone who has access to the record can view its tracking
CREATE POLICY "Applicants view their tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = process_tracking.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Supervisors view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = process_tracking.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Evaluators view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = process_tracking.ip_record_id
    AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Admins view all tracking" ON process_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins and supervisors to insert tracking records
DROP POLICY IF EXISTS "Allow tracking inserts" ON process_tracking;

CREATE POLICY "Admins and supervisors insert tracking" ON process_tracking
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('admin', 'supervisor')
  )
);

COMMIT;
