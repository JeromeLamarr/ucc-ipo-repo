-- Create certificate_signatories table for admin-manageable signatory settings
CREATE TABLE IF NOT EXISTS certificate_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_head_name TEXT NOT NULL DEFAULT 'Teodoro Macaraeg',
  research_head_position TEXT NOT NULL DEFAULT 'Research Department Head',
  president_name TEXT NOT NULL DEFAULT 'Atty. Jared',
  president_position TEXT NOT NULL DEFAULT 'President',
  supervisor_title TEXT NOT NULL DEFAULT 'Supervisor',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row (single-row settings table)
INSERT INTO certificate_signatories (
  research_head_name,
  research_head_position,
  president_name,
  president_position,
  supervisor_title
) VALUES (
  'Teodoro Macaraeg',
  'Research Department Head',
  'Atty. Jared',
  'President',
  'Supervisor'
) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE certificate_signatories ENABLE ROW LEVEL SECURITY;

-- Policy: everyone authenticated can read
CREATE POLICY "Allow authenticated read"
  ON certificate_signatories FOR SELECT
  TO authenticated
  USING (true);

-- Policy: only admins can update
CREATE POLICY "Allow admin update"
  ON certificate_signatories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
