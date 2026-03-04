/*
  # Fix is_admin() function and footer settings RLS policies

  ## Problem
  The users table uses auth_user_id to store the Supabase auth UUID,
  but is_admin() and the footer policies were checking users.id = auth.uid().
  Since users.id is an internal UUID (different from auth.uid()), the check
  always failed, blocking admins from updating footer settings.

  ## Fix
  1. Update is_admin() to use auth_user_id = auth.uid()
  2. Update footer settings UPDATE and INSERT policies to use auth_user_id
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "footer_settings_admin_update" ON site_footer_settings;
CREATE POLICY "footer_settings_admin_update"
  ON site_footer_settings FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "footer_settings_admin_insert" ON site_footer_settings;
CREATE POLICY "footer_settings_admin_insert"
  ON site_footer_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "footer_settings_admin_delete" ON site_footer_settings;
CREATE POLICY "footer_settings_admin_delete"
  ON site_footer_settings FOR DELETE
  TO authenticated
  USING (is_admin());
