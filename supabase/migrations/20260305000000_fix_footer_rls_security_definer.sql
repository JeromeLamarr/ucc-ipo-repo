/*
  # Fix footer settings 403 error

  ## Problem
  Admin policies on site_footer_settings and site_footer_links use
  EXISTS (SELECT 1 FROM users ...) which triggers RLS recursion when
  the users table has its own RLS policies, causing 403 on all writes
  (and some reads).

  ## Fix
  1. Create a SECURITY DEFINER helper function is_admin() that reads
     the users table with elevated privileges, bypassing RLS.
  2. Rebuild all footer policies to use is_admin() instead of a raw subquery.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper function (runs as the function owner, bypasses RLS on users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id   = auth.uid()
      AND role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. site_footer_settings — drop ALL existing admin policies, rebuild cleanly
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "footer_settings_admin_all"    ON site_footer_settings;
DROP POLICY IF EXISTS "footer_settings_admin_insert" ON site_footer_settings;
DROP POLICY IF EXISTS "footer_settings_admin_update" ON site_footer_settings;
DROP POLICY IF EXISTS "footer_settings_admin_delete" ON site_footer_settings;

CREATE POLICY "footer_settings_admin_insert"
  ON site_footer_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "footer_settings_admin_update"
  ON site_footer_settings FOR UPDATE
  TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "footer_settings_admin_delete"
  ON site_footer_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. site_footer_links — same treatment
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "footer_links_admin_all"    ON site_footer_links;
DROP POLICY IF EXISTS "footer_links_admin_insert" ON site_footer_links;
DROP POLICY IF EXISTS "footer_links_admin_update" ON site_footer_links;
DROP POLICY IF EXISTS "footer_links_admin_delete" ON site_footer_links;

CREATE POLICY "footer_links_admin_insert"
  ON site_footer_links FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "footer_links_admin_update"
  ON site_footer_links FOR UPDATE
  TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "footer_links_admin_delete"
  ON site_footer_links FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. site_settings — apply the same fix proactively
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Only recreate if the old subquery-based policy exists
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'site_settings'
      AND policyname = 'site_settings_admin_all'
  ) THEN
    DROP POLICY "site_settings_admin_all" ON site_settings;

    CREATE POLICY "site_settings_admin_update"
      ON site_settings FOR UPDATE
      TO authenticated
      USING      (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;
