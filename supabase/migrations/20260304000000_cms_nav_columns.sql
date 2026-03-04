-- Migration: Add navigation control columns to cms_pages
-- Run this in the Supabase SQL Editor

-- Add show_in_nav: controls whether a page appears in public navigation
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS show_in_nav boolean NOT NULL DEFAULT true;

-- Add nav_order: controls sort order in public navigation (lower = first)
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS nav_order integer NOT NULL DEFAULT 0;

-- Add nav_label: optional custom label shown in navigation (falls back to title)
ALTER TABLE cms_pages
  ADD COLUMN IF NOT EXISTS nav_label text;

-- Update RLS: allow anyone to read these new columns (they are public pages anyway)
-- No additional policy changes needed — existing policies cover all columns.

-- Backfill: set show_in_nav = false for the 'home' page (already excluded by slug filter, but clean to mark it)
UPDATE cms_pages SET show_in_nav = false WHERE slug = 'home';

-- Backfill: assign nav_order values based on created_at so existing order is preserved
UPDATE cms_pages
SET nav_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM cms_pages
  WHERE slug <> 'home'
) sub
WHERE cms_pages.id = sub.id;
