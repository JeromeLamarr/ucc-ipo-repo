/*
  # Create Presentation Materials Storage Bucket

  Creates a private storage bucket for academic presentation materials 
  (scientific posters and IMRaD short papers)
*/

-- =====================================================
-- CREATE STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentation-materials', 'presentation-materials', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================
-- Enable RLS on bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Applicants can upload their own materials
CREATE POLICY "Applicants can upload presentation materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'presentation-materials'
    AND (
      -- Allow authenticated users to upload
      auth.role() = 'authenticated'
      OR auth.role() = 'anon'
    )
  );

-- Applicants can view their own uploaded materials
CREATE POLICY "Applicants can view own presentation materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'presentation-materials'
    AND (
      -- Allow authenticated users to view
      auth.role() = 'authenticated'
      OR auth.role() = 'anon'
    )
  );

-- Admins can view all materials
CREATE POLICY "Admins can view all presentation materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'presentation-materials'
    AND (
      SELECT role FROM users WHERE users.id = auth.uid()
    ) = 'admin'
  );

-- Service role can do anything (for backend operations)
CREATE POLICY "Service role full access to presentation materials"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'presentation-materials'
    AND auth.role() = 'service_role'
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO anon;
GRANT ALL ON storage.buckets TO service_role;
