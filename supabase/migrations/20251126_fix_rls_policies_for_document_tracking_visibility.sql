-- Migration: Fix RLS policies for document and tracking visibility
-- Date: 2025-11-26
-- Purpose: Ensure supervisors and evaluators can view documents and tracking for assigned records

BEGIN;

-- Drop old policies that may have issues
DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view tracking" ON process_tracking;
DROP POLICY IF EXISTS "Applicants view tracking" ON process_tracking;

-- New ip_documents policies with proper cascade

-- Allow applicants to view their own uploaded documents
CREATE POLICY "Applicants view own documents" ON ip_documents
FOR SELECT TO authenticated
USING (uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Allow applicants to upload documents
CREATE POLICY "Applicants upload documents" ON ip_documents
FOR INSERT TO authenticated
WITH CHECK (uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Allow supervisors to view documents for their assigned records
CREATE POLICY "Supervisors view documents" ON ip_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = ip_documents.ip_record_id
  AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

-- Allow evaluators to view documents for their assigned records
CREATE POLICY "Evaluators view documents" ON ip_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = ip_documents.ip_record_id
  AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

-- Allow admins to view all documents
CREATE POLICY "Admins view all documents" ON ip_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

-- New process_tracking policies with proper cascade

-- Allow applicants to view their tracking history
CREATE POLICY "Applicants view their tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = process_tracking.ip_record_id
  AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

-- Allow supervisors to view tracking for their assigned records
CREATE POLICY "Supervisors view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = process_tracking.ip_record_id
  AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

-- Allow evaluators to view tracking for their assigned records
CREATE POLICY "Evaluators view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = process_tracking.ip_record_id
  AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

-- Allow admins to view all tracking
CREATE POLICY "Admins view all tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

-- Allow admins and supervisors to insert tracking entries
CREATE POLICY "Admins and supervisors insert tracking" ON process_tracking
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() 
  AND role IN ('admin', 'supervisor')
));

COMMIT;
