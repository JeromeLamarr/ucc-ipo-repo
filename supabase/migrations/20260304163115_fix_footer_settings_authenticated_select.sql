/*
  # Fix footer settings SELECT policy for authenticated users

  ## Problem
  The existing SELECT policy on site_footer_settings only applies to the `public` role
  (unauthenticated). When an authenticated admin does UPDATE ... RETURNING *, PostgREST
  checks the SELECT policy for the `authenticated` role — finding none, it returns 0 rows
  and throws a 406 error.

  ## Fix
  Add a SELECT policy that allows all authenticated users to read footer settings.
  Also add the same fix to site_footer_links.
*/

CREATE POLICY "footer_settings_authenticated_select"
  ON site_footer_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "footer_links_authenticated_select"
  ON site_footer_links FOR SELECT
  TO authenticated
  USING (true);
