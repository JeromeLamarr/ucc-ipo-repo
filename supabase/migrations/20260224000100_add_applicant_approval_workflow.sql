-- Migration: Add applicant approval workflow
-- Date: 2026-02-24
-- Purpose: Enable admin approval of new applicant registrations
-- Impact: Existing applicants default to approved; new applicants require approval

BEGIN;

-- Add approval columns to users table
ALTER TABLE IF EXISTS users
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for querying pending applicants (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_users_pending_applicants 
ON users(role, is_approved) 
WHERE role = 'applicant' AND is_approved = FALSE;

-- Create index for querying approved applicants
CREATE INDEX IF NOT EXISTS idx_users_approved_applicants 
ON users(role, is_approved) 
WHERE role = 'applicant' AND is_approved = TRUE;

-- Add comment documenting the columns
COMMENT ON COLUMN users.is_approved IS 'Indicates if applicant account has been approved by admin. Non-applicant roles default to TRUE.';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when admin approved the applicant account.';
COMMENT ON COLUMN users.approved_by IS 'UUID of admin user who approved the applicant.';
COMMENT ON COLUMN users.rejected_at IS 'Timestamp when admin rejected the applicant account.';
COMMENT ON COLUMN users.rejection_reason IS 'Reason for rejection (if applicable).';

COMMIT;
