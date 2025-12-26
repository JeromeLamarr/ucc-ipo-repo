/*
  # Add automatic email notification trigger for status changes
  
  1. Changes
    - Create email_queue table to store pending email notifications
    - Create function that queues status notifications when status changes
    - Add trigger to ip_records table to call this function on status changes
    - Ensures no status change is missed, even if frontend fails to send email
  
  2. How it works
    - When ip_records.status is updated, trigger calls queue_status_notification
    - Function inserts a record into email_queue table with notification details
    - A separate edge function/cron job processes the queue and sends emails
    - This decouples email sending from the database transaction
*/

-- Create email queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_queue (
  id BIGSERIAL PRIMARY KEY,
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
  status TEXT NOT NULL,
  old_status TEXT,
  current_stage TEXT,
  title TEXT NOT NULL,
  reference_number TEXT,
  applicant_email TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  actor_name TEXT,
  actor_role TEXT,
  remarks TEXT,
  payload JSONB,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_email_queue_sent ON email_queue(sent);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_ip_record_id ON email_queue(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_applicant_id ON email_queue(applicant_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_queue(sent, attempt_count) WHERE sent = FALSE AND attempt_count < 3;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS auto_notify_applicant_status_change ON ip_records CASCADE;
DROP FUNCTION IF EXISTS notify_applicant_of_status_change() CASCADE;

-- Create function that queues status notifications
CREATE OR REPLACE FUNCTION queue_status_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_applicant_email TEXT;
  v_applicant_name TEXT;
  v_current_user_id UUID;
  v_current_user_name TEXT;
  v_current_user_role TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    
    -- Get applicant details
    SELECT email, full_name INTO v_applicant_email, v_applicant_name
    FROM users
    WHERE id = NEW.applicant_id
    LIMIT 1;
    
    -- If no applicant email found, skip notification
    IF v_applicant_email IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get current user info (who made the change)
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NOT NULL THEN
      SELECT full_name, role INTO v_current_user_name, v_current_user_role
      FROM users
      WHERE id = v_current_user_id
      LIMIT 1;
    END IF;
    
    -- Insert notification into queue
    INSERT INTO email_queue (
      ip_record_id,
      applicant_id,
      notification_type,
      status,
      old_status,
      current_stage,
      title,
      reference_number,
      applicant_email,
      applicant_name,
      actor_name,
      actor_role,
      payload
    ) VALUES (
      NEW.id,
      NEW.applicant_id,
      'status_change',
      NEW.status::text,
      OLD.status::text,
      NEW.current_stage,
      NEW.title,
      NEW.reference_number,
      v_applicant_email,
      v_applicant_name,
      v_current_user_name,
      v_current_user_role,
      jsonb_build_object(
        'applicantEmail', v_applicant_email,
        'applicantName', v_applicant_name,
        'recordTitle', NEW.title,
        'referenceNumber', NEW.reference_number,
        'oldStatus', OLD.status::text,
        'newStatus', NEW.status::text,
        'currentStage', NEW.current_stage,
        'actorName', v_current_user_name,
        'actorRole', v_current_user_role
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that calls the function on status changes
CREATE TRIGGER auto_notify_applicant_status_change
  AFTER UPDATE ON ip_records
  FOR EACH ROW
  EXECUTE FUNCTION queue_status_notification();

-- Create index to support the trigger efficiently
CREATE INDEX IF NOT EXISTS idx_ip_records_applicant_id ON ip_records(applicant_id);
CREATE INDEX IF NOT EXISTS idx_ip_records_status ON ip_records(status);
