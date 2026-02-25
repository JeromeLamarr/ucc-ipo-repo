-- Create full_disclosures table to track generated disclosure documents
-- Similar to certificates table but for full disclosure statements

CREATE TABLE IF NOT EXISTS full_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES users(id),
  pdf_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ip_record_id, generated_at)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_full_disclosures_ip_record_id ON full_disclosures(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_full_disclosures_generated_by ON full_disclosures(generated_by);
CREATE INDEX IF NOT EXISTS idx_full_disclosures_generated_at ON full_disclosures(generated_at DESC);

-- Enable RLS
ALTER TABLE full_disclosures ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read disclosures
DROP POLICY IF EXISTS "Allow authenticated users to read disclosures" ON full_disclosures;
CREATE POLICY "Allow authenticated users to read disclosures"
  ON full_disclosures FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert disclosures (via edge functions)
DROP POLICY IF EXISTS "Allow authenticated users to insert disclosures" ON full_disclosures;
CREATE POLICY "Allow authenticated users to insert disclosures"
  ON full_disclosures FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create storage bucket for disclosures if it doesn't exist
-- Note: This is a SQL comment - bucket creation should be done in Supabase UI
-- Bucket name: disclosures
-- Make it public for PDF download links to work
