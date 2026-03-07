-- Fix RLS policies for site_footer_settings and site_footer_links.
-- The original policies used:
--   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
-- which causes RLS recursion on the users table.
-- Replace with public.is_admin() which is a SECURITY DEFINER function.

-- ── site_footer_settings ──────────────────────────────────────
DROP POLICY IF EXISTS "footer_settings_admin_all" ON site_footer_settings;
CREATE POLICY "footer_settings_admin_all"
  ON site_footer_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── site_footer_links ─────────────────────────────────────────
DROP POLICY IF EXISTS "footer_links_admin_all" ON site_footer_links;
CREATE POLICY "footer_links_admin_all"
  ON site_footer_links FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
