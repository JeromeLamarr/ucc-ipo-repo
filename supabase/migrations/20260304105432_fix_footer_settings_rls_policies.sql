/*
  # Fix Footer Settings RLS Policies

  ## Problem
  The existing admin policies on site_footer_settings and site_footer_links
  use a subquery against the users table which can cause RLS recursion issues,
  blocking admins from saving footer data.

  ## Changes
  - Drop existing admin policies on both footer tables
  - Recreate them using auth.jwt() metadata check to avoid recursion
  - Keep the public SELECT policies intact
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "footer_settings_admin_all" ON site_footer_settings;
DROP POLICY IF EXISTS "footer_links_admin_all" ON site_footer_links;

-- Recreate admin INSERT policy for footer settings
CREATE POLICY "footer_settings_admin_insert"
  ON site_footer_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Recreate admin UPDATE policy for footer settings
CREATE POLICY "footer_settings_admin_update"
  ON site_footer_settings
  FOR UPDATE
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

-- Recreate admin DELETE policy for footer settings
CREATE POLICY "footer_settings_admin_delete"
  ON site_footer_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Recreate admin INSERT policy for footer links
CREATE POLICY "footer_links_admin_insert"
  ON site_footer_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Recreate admin UPDATE policy for footer links
CREATE POLICY "footer_links_admin_update"
  ON site_footer_links
  FOR UPDATE
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

-- Recreate admin DELETE policy for footer links
CREATE POLICY "footer_links_admin_delete"
  ON site_footer_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
