-- Add 'completed' status to ip_status enum type

ALTER TYPE ip_status ADD VALUE 'completed' AFTER 'ready_for_filing';
