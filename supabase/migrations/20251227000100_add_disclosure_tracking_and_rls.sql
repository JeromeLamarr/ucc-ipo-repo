-- Add tracking_id to ip_records and full_disclosures tables
-- Enable public read access for disclosure verification via QR codes

-- Step 1: Add tracking_id column to ip_records if it doesn't exist
ALTER TABLE public.ip_records
ADD COLUMN IF NOT EXISTS tracking_id TEXT UNIQUE;

-- Step 2: Add tracking_id column to full_disclosures if it doesn't exist
ALTER TABLE public.full_disclosures
ADD COLUMN IF NOT EXISTS tracking_id TEXT;

-- Step 3: Drop conflicting RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read disclosures" ON full_disclosures;
DROP POLICY IF EXISTS "Allow public disclosure verification by tracking_id" ON full_disclosures;

-- Step 4: Create public read policy for disclosure verification
-- This allows anyone to view disclosure records for QR code verification
CREATE POLICY "Allow public read for disclosures"
  ON full_disclosures FOR SELECT
  USING (true);

-- Step 5: Keep existing authenticated insert policy
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert disclosures"
  ON full_disclosures FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create index on tracking_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_full_disclosures_tracking_id ON full_disclosures(tracking_id);
CREATE INDEX IF NOT EXISTS idx_ip_records_tracking_id ON ip_records(tracking_id);
