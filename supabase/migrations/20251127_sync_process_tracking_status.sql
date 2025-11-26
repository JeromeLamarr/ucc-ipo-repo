-- Sync ip_records.status with latest process_tracking status
-- This ensures ip_records.status is always current, not stale

BEGIN;

-- Create a function to sync ip_records.status with latest process_tracking entry
CREATE OR REPLACE FUNCTION sync_ip_record_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ip_records.status to match the latest process_tracking status
  UPDATE ip_records
  SET status = NEW.status,
      updated_at = NOW()
  WHERE id = NEW.ip_record_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_status_after_tracking_insert ON process_tracking;

-- Create trigger to sync status whenever a new process_tracking record is inserted
CREATE TRIGGER sync_status_after_tracking_insert
AFTER INSERT ON process_tracking
FOR EACH ROW
EXECUTE FUNCTION sync_ip_record_status();

COMMIT;
