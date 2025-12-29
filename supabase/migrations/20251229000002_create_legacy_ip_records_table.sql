/*
  # Create Separate Legacy IP Records Table

  1. New Table
    - legacy_ip_records: Dedicated table for historical IP records
    - Mirrors ip_records structure but optimized for legacy data
    - No workflow-related fields (evaluator, supervisor, status)
    - Includes legacy-specific fields (source, digitized_at, created_by_admin)

  2. Security
    - RLS enabled with policies for admin access
    - Anyone can view, only admins can create/edit/delete

  3. Storage
    - Documents linked via ip_documents table using foreign key
*/

-- Create legacy_ip_records table
CREATE TABLE IF NOT EXISTS legacy_ip_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  abstract TEXT,
  details JSONB DEFAULT '{}',
  
  -- Legacy-specific fields
  legacy_source TEXT NOT NULL,
  digitized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_filing_date TEXT,
  ipophil_application_no TEXT,
  remarks TEXT,
  
  -- Admin tracking
  created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_legacy_records_category ON legacy_ip_records(category);
CREATE INDEX idx_legacy_records_legacy_source ON legacy_ip_records(legacy_source);
CREATE INDEX idx_legacy_records_created_by_admin ON legacy_ip_records(created_by_admin_id);
CREATE INDEX idx_legacy_records_created_at ON legacy_ip_records(created_at);

-- Enable RLS
ALTER TABLE legacy_ip_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can create legacy records
CREATE POLICY "admins_can_create_legacy_records" ON legacy_ip_records
FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Admins can view/update/delete their own legacy records
CREATE POLICY "admins_can_manage_own_legacy_records" ON legacy_ip_records
FOR UPDATE
USING (
  created_by_admin_id = auth.uid()
  AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  created_by_admin_id = auth.uid()
);

-- Admins can delete any legacy record
CREATE POLICY "admins_can_delete_legacy_records" ON legacy_ip_records
FOR DELETE
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Anyone can view legacy records
CREATE POLICY "anyone_can_view_legacy_records" ON legacy_ip_records
FOR SELECT
USING (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_legacy_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legacy_records_updated_at_trigger
BEFORE UPDATE ON legacy_ip_records
FOR EACH ROW
EXECUTE FUNCTION update_legacy_records_updated_at();
