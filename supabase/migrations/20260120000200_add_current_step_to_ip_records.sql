-- Add current_step column to ip_records table for tracking multi-step form progress
ALTER TABLE ip_records ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ip_records_current_step ON ip_records(current_step);

-- Update existing 'draft' records to have current_step = 1 as default
UPDATE ip_records SET current_step = 1 WHERE status = 'draft' AND current_step IS NULL;
