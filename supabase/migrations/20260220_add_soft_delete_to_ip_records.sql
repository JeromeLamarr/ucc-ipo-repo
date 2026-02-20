-- Add soft delete columns to ip_records table
ALTER TABLE ip_records
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for faster queries on active records
CREATE INDEX idx_ip_records_is_deleted ON ip_records(is_deleted);
CREATE INDEX idx_ip_records_deleted_at ON ip_records(deleted_at);

-- Comments for documentation
COMMENT ON COLUMN ip_records.is_deleted IS 'Boolean flag for soft delete (true = deleted, false = active)';
COMMENT ON COLUMN ip_records.deleted_at IS 'Timestamp when the record was deleted (soft delete)';

-- Update RLS policy to exclude deleted records by default
-- First, create a view for active records only
CREATE OR REPLACE VIEW active_ip_records AS
SELECT * FROM ip_records WHERE is_deleted = FALSE;

GRANT SELECT ON active_ip_records TO authenticated;
GRANT SELECT ON active_ip_records TO anon;
GRANT SELECT ON active_ip_records TO service_role;
