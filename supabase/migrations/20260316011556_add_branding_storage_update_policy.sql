/*
  # Add UPDATE policy to branding storage bucket

  ## Summary
  The branding bucket had INSERT and DELETE policies for authenticated users
  but was missing an UPDATE policy. This caused "new row violates row-level
  security policy" errors when replacing (upsert) an existing signature image.

  ## Changes
  - Adds UPDATE policy to storage.objects for the branding bucket,
    allowing authenticated users to overwrite existing files (required for upsert).
*/

CREATE POLICY "Admin Update Branding"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'branding')
  WITH CHECK (bucket_id = 'branding');
