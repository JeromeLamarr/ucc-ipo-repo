/*
  # Academic Presentation Materials Stage

  ## Overview
  This migration adds the "Academic Presentation Materials" stage to replace "Legal Preparation".
  
  ## Changes
  1. Create presentation_materials table to track:
     - Materials requests from admins
     - Material submissions from applicants
     - File metadata and URLs
  
  2. Extend ip_records with tracking columns
  
  3. Add RLS policies for security
  
  4. Create indexes for performance
*/

-- =====================================================
-- 1. PRESENTATION MATERIALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS presentation_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  
  -- Request tracking
  materials_requested_at TIMESTAMPTZ,
  materials_requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Submission tracking
  materials_submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- File metadata for Scientific Poster (image)
  poster_file_name TEXT,
  poster_file_path TEXT,
  poster_file_url TEXT,
  poster_file_size BIGINT,
  poster_uploaded_at TIMESTAMPTZ,
  
  -- File metadata for IMRaD Short Paper (PDF/DOCX)
  paper_file_name TEXT,
  paper_file_path TEXT,
  paper_file_url TEXT,
  paper_file_size BIGINT,
  paper_uploaded_at TIMESTAMPTZ,
  
  -- Status and metadata
  status TEXT DEFAULT 'not_requested' CHECK (status IN ('not_requested', 'requested', 'submitted', 'rejected')),
  submission_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presentation_materials_ip_record 
  ON presentation_materials(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_presentation_materials_status 
  ON presentation_materials(status);
CREATE INDEX IF NOT EXISTS idx_presentation_materials_requested_at 
  ON presentation_materials(materials_requested_at);

-- =====================================================
-- 2. EXTEND IP_RECORDS TABLE
-- =====================================================
-- Add tracking columns to ip_records if they don't exist
ALTER TABLE ip_records 
ADD COLUMN IF NOT EXISTS materials_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS materials_submitted_at TIMESTAMPTZ;

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE presentation_materials ENABLE ROW LEVEL SECURITY;

-- Applicants can see their own materials
CREATE POLICY "Applicants can view their own presentation materials"
  ON presentation_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = presentation_materials.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

-- Admins can see all materials
CREATE POLICY "Admins can view all presentation materials"
  ON presentation_materials FOR SELECT
  USING (
    (SELECT role FROM users WHERE users.id = auth.uid()) = 'admin'
  );

-- Applicants can submit their own materials
CREATE POLICY "Applicants can submit presentation materials"
  ON presentation_materials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = presentation_materials.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
    AND status = 'requested'
  );

-- Admins can request and manage materials
CREATE POLICY "Admins can manage presentation materials"
  ON presentation_materials FOR UPDATE
  USING (
    (SELECT role FROM users WHERE users.id = auth.uid()) = 'admin'
  );

-- =====================================================
-- 4. HELPER FUNCTION: CREATE/GET MATERIALS RECORD
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_presentation_materials(
  p_ip_record_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_materials_id UUID;
BEGIN
  SELECT id INTO v_materials_id
  FROM presentation_materials
  WHERE ip_record_id = p_ip_record_id;
  
  IF v_materials_id IS NULL THEN
    INSERT INTO presentation_materials (ip_record_id, status)
    VALUES (p_ip_record_id, 'not_requested')
    RETURNING id INTO v_materials_id;
  END IF;
  
  RETURN v_materials_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER: UPDATE IP_RECORDS WHEN MATERIALS REQUESTED
-- =====================================================
CREATE OR REPLACE FUNCTION track_materials_request()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.materials_requested_at IS NOT NULL AND OLD.materials_requested_at IS NULL THEN
    UPDATE ip_records
    SET materials_requested_at = NEW.materials_requested_at,
        updated_at = now()
    WHERE id = NEW.ip_record_id;
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.materials_submitted_at IS NOT NULL AND OLD.materials_submitted_at IS NULL THEN
    UPDATE ip_records
    SET materials_submitted_at = NEW.materials_submitted_at,
        updated_at = now()
    WHERE id = NEW.ip_record_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_materials_to_ip_records ON presentation_materials;
CREATE TRIGGER sync_materials_to_ip_records
  AFTER UPDATE ON presentation_materials
  FOR EACH ROW
  EXECUTE FUNCTION track_materials_request();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON presentation_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE ON presentation_materials TO anon;
GRANT USAGE, SELECT ON SEQUENCE presentation_materials_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE presentation_materials_id_seq TO anon;

GRANT EXECUTE ON FUNCTION get_or_create_presentation_materials TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_presentation_materials TO anon;
