/*
  # Add Legacy Records Support

  ## Overview
  Adds columns to ip_records table to support legacy/historical IP record tracking.
  Allows admins to manually digitize and encode old IP submissions without mixing them with active workflow submissions.

  ## Changes
  - is_legacy_record: Boolean flag to identify legacy records
  - legacy_source: Source of the legacy record (Physical Archive, Email, Old System, etc.)
  - digitized_at: Timestamp when the record was digitized/added
  - created_by_admin_id: References the admin who created the legacy record

  ## Rules
  - Workflow records: is_legacy_record = false
  - Legacy records: is_legacy_record = true
  - Legacy records do NOT trigger applicant workflows or email notifications
  - Only admins can create/edit/delete legacy records
*/

-- Add new columns to ip_records table
ALTER TABLE ip_records
ADD COLUMN IF NOT EXISTS is_legacy_record BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS legacy_source TEXT,
ADD COLUMN IF NOT EXISTS digitized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for legacy record queries
CREATE INDEX IF NOT EXISTS idx_ip_records_is_legacy ON ip_records(is_legacy_record);
CREATE INDEX IF NOT EXISTS idx_ip_records_legacy_source ON ip_records(legacy_source) WHERE is_legacy_record = true;
CREATE INDEX IF NOT EXISTS idx_ip_records_created_by_admin ON ip_records(created_by_admin_id) WHERE is_legacy_record = true;

-- Add constraint to prevent workflow records from having legacy fields set
ALTER TABLE ip_records
ADD CONSTRAINT check_legacy_fields_consistency CHECK (
  (is_legacy_record = false AND legacy_source IS NULL AND digitized_at IS NULL) OR
  (is_legacy_record = true AND legacy_source IS NOT NULL AND digitized_at IS NOT NULL)
);

-- Create a view for easy querying of workflow records only
CREATE OR REPLACE VIEW workflow_ip_records AS
SELECT * FROM ip_records
WHERE is_legacy_record = false;

-- Create a view for easy querying of legacy records only
CREATE OR REPLACE VIEW legacy_ip_records AS
SELECT * FROM ip_records
WHERE is_legacy_record = true;

-- Add RLS policy for admins to manage legacy records
-- This will be applied alongside existing policies

ALTER TABLE ip_records ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can create legacy records
CREATE POLICY "admins_can_create_legacy_records" ON ip_records
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
  AND is_legacy_record = true
);

-- Policy: Admins can update legacy records
CREATE POLICY "admins_can_update_legacy_records" ON ip_records
FOR UPDATE
USING (
  is_legacy_record = true
  AND created_by_admin_id = auth.uid()
  AND (
    SELECT role FROM users WHERE id = auth.uid()
  ) = 'admin'
)
WITH CHECK (
  is_legacy_record = true
  AND created_by_admin_id = auth.uid()
);

-- Policy: Admins can delete legacy records
CREATE POLICY "admins_can_delete_legacy_records" ON ip_records
FOR DELETE
USING (
  is_legacy_record = true
  AND (
    SELECT role FROM users WHERE id = auth.uid()
  ) = 'admin'
);

-- Policy: Everyone can view legacy records (read-only for non-admins)
CREATE POLICY "anyone_can_view_legacy_records" ON ip_records
FOR SELECT
USING (
  is_legacy_record = true
  OR (
    is_legacy_record = false
    AND (
      applicant_id = auth.uid()
      OR supervisor_id = auth.uid()
      OR evaluator_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  )
);
