-- FINAL FIX: Drop all policies and recreate with proper authenticated user support
-- This migration clears all existing policies and creates fresh ones

-- ============================================================================
-- DROP ALL EXISTING POLICIES (if they exist)
-- ============================================================================
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
DROP POLICY IF EXISTS "site_settings_read" ON site_settings;
DROP POLICY IF EXISTS "site_settings_write" ON site_settings;
DROP POLICY IF EXISTS "site_settings_modify" ON site_settings;
DROP POLICY IF EXISTS "site_settings_remove" ON site_settings;

DROP POLICY IF EXISTS "cms_pages_published_read" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_insert" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_update" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_delete" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_read" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_write" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_public_read" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_write" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_modify" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_remove" ON cms_pages;

DROP POLICY IF EXISTS "cms_sections_published_read" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_insert" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_update" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_delete" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_read" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_write" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_public_read" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_write" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_modify" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_remove" ON cms_sections;

-- ============================================================================
-- CREATE FRESH, SIMPLE POLICIES
-- ============================================================================

-- SITE_SETTINGS: Read for all, write for authenticated users
CREATE POLICY "site_settings_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_write" 
  ON site_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "site_settings_modify" 
  ON site_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "site_settings_remove" 
  ON site_settings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- CMS_PAGES: Published pages readable by all, authenticated users can write all
CREATE POLICY "cms_pages_public_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true OR auth.uid() IS NOT NULL);

CREATE POLICY "cms_pages_write" 
  ON cms_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_pages_modify" 
  ON cms_pages FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_pages_remove" 
  ON cms_pages FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- CMS_SECTIONS: Published sections readable by all, authenticated users can write
CREATE POLICY "cms_sections_public_read" 
  ON cms_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cms_pages 
      WHERE cms_pages.id = cms_sections.page_id 
      AND (cms_pages.is_published = true OR auth.uid() IS NOT NULL)
    )
  );

CREATE POLICY "cms_sections_write" 
  ON cms_sections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_sections_modify" 
  ON cms_sections FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_sections_remove" 
  ON cms_sections FOR DELETE
  USING (auth.uid() IS NOT NULL);
