-- Add INSERT policy for admins on certificate_signatories
CREATE POLICY "Allow admin insert"
  ON certificate_signatories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
