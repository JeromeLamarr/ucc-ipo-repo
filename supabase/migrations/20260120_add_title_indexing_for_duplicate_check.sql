-- Add index on title column for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_ip_records_title_submitted ON ip_records(LOWER(title)) 
WHERE status = 'submitted';

-- Add index on title and status combined for duplicate checks
CREATE INDEX IF NOT EXISTS idx_ip_records_title_status ON ip_records(status, LOWER(title));

-- Add full text search index for similar title matching
CREATE INDEX IF NOT EXISTS idx_ip_records_title_tsvector ON ip_records 
USING GIN(to_tsvector('english', title));
