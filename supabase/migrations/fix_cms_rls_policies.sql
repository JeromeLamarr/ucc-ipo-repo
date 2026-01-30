-- Fix CMS RLS Policies - Drop and recreate with proper logic
-- Created: January 30, 2026

-- ============================================================================
-- DROP OLD POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON site_settings;

DROP POLICY IF EXISTS "cms_pages_published_read" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_insert" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_update" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_delete" ON cms_pages;

DROP POLICY IF EXISTS "cms_sections_published_read" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_insert" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_update" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_delete" ON cms_sections;

-- ============================================================================
-- CREATE NEW SIMPLIFIED POLICIES
-- ============================================================================

-- ============================================================================
-- SITE_SETTINGS POLICIES: Anyone can read, authenticated admins can write
-- ============================================================================
CREATE POLICY "site_settings_public_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_admin_write" 
  ON site_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- CMS_PAGES POLICIES: Published pages readable by all, authenticated users can write
-- ============================================================================
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);

-- Allow authenticated users (including admins) to read all pages
CREATE POLICY "cms_pages_admin_read"
  ON cms_pages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- CMS_SECTIONS POLICIES: Published sections readable by all, authenticated users can write
-- ============================================================================
CREATE POLICY "cms_sections_published_read" 
  ON cms_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cms_pages 
      WHERE cms_pages.id = cms_sections.page_id 
      AND cms_pages.is_published = true
    )
  );

-- Allow authenticated users to read all sections
CREATE POLICY "cms_sections_admin_read"
  ON cms_sections FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "cms_sections_admin_insert" 
  ON cms_sections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE
  USING (auth.uid() IS NOT NULL);
