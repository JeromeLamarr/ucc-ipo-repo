-- Migration: Add approval check to RLS policies
-- Date: 2026-02-24
-- Purpose: Enforce applicant approval at database level (security)
-- Impact: Applicant users with is_approved=false cannot insert ip_records or access workflow tables

BEGIN;

-- 1. Create a helper function to check if current user is an approved applicant or non-applicant user
CREATE OR REPLACE FUNCTION is_approved_applicant_or_privileged()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (role != 'applicant' OR (role = 'applicant' AND is_approved = true)),
      false
    )
    FROM users
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update ip_records insert policy to check applicant approval
-- This prevents unapproved applicants from creating submissions even if they bypass frontend checks
DROP POLICY IF EXISTS "Applicants can create their own IP records" ON ip_records;
DROP POLICY IF EXISTS "Applicants can create their own IP records (must be approved)" ON ip_records;

CREATE POLICY "Applicants can create their own IP records (must be approved)"
  ON ip_records
  FOR INSERT
  WITH CHECK (
    -- User must be creating record with their own ID
    applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND
    -- User must be approved (or not an applicant)
    is_approved_applicant_or_privileged()
  );

-- 3. Prevent unapproved applicants from uploading files
DROP POLICY IF EXISTS "Users can upload documents for their own IP" ON ip_documents;
DROP POLICY IF EXISTS "Users can upload documents (applicants must be approved)" ON ip_documents;

CREATE POLICY "Users can upload documents (applicants must be approved)"
  ON ip_documents
  FOR INSERT
  WITH CHECK (
    -- User must be creating record with their own ID
    uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND
    -- User must be approved or non-applicant
    is_approved_applicant_or_privileged()
  );

-- 4. Ensure unapproved applicants can't view their own IP records either (belt-and-suspenders)
DROP POLICY IF EXISTS "Applicants can view created IP records" ON ip_records;
DROP POLICY IF EXISTS "Applicants can view created IP records (if approved)" ON ip_records;

CREATE POLICY "Applicants can view created IP records (if approved)"
  ON ip_records
  FOR SELECT
  USING (
    -- Must be associated with user
    applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND
    -- User must be approved or non-applicant
    is_approved_applicant_or_privileged()
  );

COMMIT;
