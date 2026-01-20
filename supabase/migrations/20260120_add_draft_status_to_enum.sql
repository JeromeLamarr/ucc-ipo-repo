-- Add 'draft' to ip_status enum for autosave drafts
ALTER TYPE ip_status ADD VALUE 'draft' BEFORE 'submitted';
