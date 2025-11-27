-- Fix infinite recursion in ip_records related policies
-- The issue: ip_documents and generated_pdfs policies reference ip_records,
-- and these are being called in a way that creates circular dependencies
-- Solution: Simplify these policies to not recursively reference other tables

BEGIN;

-- Drop the problematic policies on ip_documents
DROP POLICY IF EXISTS "View accessible documents" ON ip_documents;
DROP POLICY IF EXISTS "Upload documents" ON ip_documents;

-- Create simpler policies for ip_documents
-- Applicants can view/upload their own documents
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

-- Drop the problematic policies on generated_pdfs
DROP POLICY IF EXISTS "View accessible PDFs" ON generated_pdfs;
DROP POLICY IF EXISTS "Admins create PDFs" ON generated_pdfs;

-- Create simpler policies for generated_pdfs
-- Admins can do everything
CREATE POLICY "Admins manage PDFs" ON generated_pdfs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Applicants can view their own PDFs (by checking if they own the ip_record)
-- But we can't do complex joins here, so we'll just let admins handle it
-- and rely on application-level validation

-- Now ensure the core ip_records policies don't have recursive references
DROP POLICY IF EXISTS "Applicants view own records" ON ip_records;
DROP POLICY IF EXISTS "Applicants create records" ON ip_records;
DROP POLICY IF EXISTS "Applicants update own records" ON ip_records;
DROP POLICY IF EXISTS "Supervisors view assigned records" ON ip_records;
DROP POLICY IF EXISTS "Supervisors update assigned" ON ip_records;
DROP POLICY IF EXISTS "Evaluators view assigned records" ON ip_records;
DROP POLICY IF EXISTS "Evaluators update assigned" ON ip_records;
DROP POLICY IF EXISTS "Admins view all records" ON ip_records;
DROP POLICY IF EXISTS "Admins update any record" ON ip_records;
DROP POLICY IF EXISTS "Admins delete records" ON ip_records;

-- Recreate with simpler, non-recursive policies
CREATE POLICY "Applicants view own records" ON ip_records
FOR SELECT TO authenticated
USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Applicants create records" ON ip_records
FOR INSERT TO authenticated
WITH CHECK (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Applicants update own records" ON ip_records
FOR UPDATE TO authenticated
USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
WITH CHECK (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Supervisors view assigned records" ON ip_records
FOR SELECT TO authenticated
USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Supervisors update assigned" ON ip_records
FOR UPDATE TO authenticated
USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
WITH CHECK (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Evaluators view assigned records" ON ip_records
FOR SELECT TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Evaluators update assigned" ON ip_records
FOR UPDATE TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
WITH CHECK (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins view all records" ON ip_records
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins update any record" ON ip_records
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins delete records" ON ip_records
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

COMMIT;
