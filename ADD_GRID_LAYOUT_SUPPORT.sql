-- ============================================================================
-- CMS Grid Layout Support - Database Migration
-- ============================================================================
-- Date: January 31, 2026
-- Purpose: Add page-level grid layout configuration to cms_pages table
-- Status: Backward-compatible - adds new column with default empty object

-- This migration:
-- 1. Adds 'layout' JSONB column to cms_pages table
-- 2. Default value: {} (empty object, triggers fallback to vertical layout)
-- 3. No existing data is affected
-- 4. Supports optional grid configuration

-- ============================================================================
-- ADD LAYOUT COLUMN TO CMS_PAGES
-- ============================================================================

-- Add layout column with default empty JSONB object
ALTER TABLE cms_pages 
ADD COLUMN IF NOT EXISTS layout JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add comment explaining the layout column structure
COMMENT ON COLUMN cms_pages.layout IS 
'Flexible layout configuration stored as JSONB. 
Default: {} (empty, uses vertical layout)
Schema when grid is enabled:
{
  "grid": {
    "enabled": true,
    "columns": 2|3|4,
    "gap": "gap-4"|"gap-6"|"gap-8",
    "max_width": "max-w-4xl"|"max-w-6xl"|"max-w-7xl",
    "align": "left"|"center"
  }
}
Example (centered 3-column grid with 6px gap):
{
  "grid": {
    "enabled": true,
    "columns": 3,
    "gap": "gap-6",
    "max_width": "max-w-7xl",
    "align": "center"
  }
}';

-- Create index on layout for potential future queries
CREATE INDEX IF NOT EXISTS idx_cms_pages_layout_enabled 
ON cms_pages USING GIN (layout) 
WHERE layout->>''grid''->''enabled'' = ''true'';

-- ============================================================================
-- RLS POLICY UPDATES (Optional - if RLS is enabled on cms_pages)
-- ============================================================================
-- The layout column is automatically protected by existing RLS policies
-- since it''s part of the cms_pages table.
-- No additional RLS changes needed.

-- ============================================================================
-- SAMPLE USAGE IN APPLICATION
-- ============================================================================
-- Fetch page with layout configuration:
-- SELECT id, slug, title, layout FROM cms_pages WHERE slug = 'home' AND is_published = true;

-- Update page layout:
-- UPDATE cms_pages SET layout = '{"grid": {"enabled": true, "columns": 3, "gap": "gap-6", "max_width": "max-w-7xl", "align": "center"}}'::jsonb WHERE slug = 'home';

-- Reset layout to default (vertical layout):
-- UPDATE cms_pages SET layout = '{}'::jsonb WHERE slug = 'home';

-- Query all pages with grid layout enabled:
-- SELECT id, slug, title FROM cms_pages WHERE layout->>''grid''->''enabled'' = ''true'';
