/*
  # Fix footer settings UPDATE policy

  ## Problem
  The existing UPDATE policy uses is_admin() which is a SECURITY DEFINER function.
  In some JWT contexts this may not evaluate correctly via PostgREST.

  ## Fix
  Replace the UPDATE policy with an inline check directly against the users table.
  This avoids any potential issues with the is_admin() function caching or context.
*/

DROP POLICY IF EXISTS "footer_settings_admin_update" ON site_footer_settings;

CREATE POLICY "footer_settings_admin_update"
  ON site_footer_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "footer_settings_admin_insert" ON site_footer_settings;

CREATE POLICY "footer_settings_admin_insert"
  ON site_footer_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
