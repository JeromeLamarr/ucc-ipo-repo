-- Fix RLS policy for ip_documents INSERT and SELECT
-- Simplify policies to remove problematic subqueries

BEGIN;

-- Drop only the applicant policies (the problematic ones)
DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
DROP POLICY IF EXISTS "Supervisors view documents" ON ip_documents;
DROP POLICY IF EXISTS "Evaluators view documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;

-- Recreate applicant policies with simpler logic
CREATE POLICY "Applicants upload documents" ON ip_documents
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "Applicants view own documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Supervisors can view documents for records they supervise
CREATE POLICY "Supervisors view documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

-- Evaluators can view documents for records they evaluate
CREATE POLICY "Evaluators view documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
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
    LIMIT 1
  )
);

COMMIT;
