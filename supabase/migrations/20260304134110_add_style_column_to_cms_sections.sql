/*
  # Add style column to cms_sections

  ## Summary
  Adds an optional `style` JSONB column to `cms_sections` for per-section styling.
  Also ensures the `valid_section_type` constraint includes all 9 section types
  used in the application codebase.

  ## Changes
  - `cms_sections.style` (jsonb, nullable, default null) — stores section-level style overrides
  - Updates `valid_section_type` CHECK constraint to include all 9 types

  ## Section types
  hero, features, steps, categories, text-section, showcase, cta, gallery, tabs

  ## Notes
  - Backwards compatible: existing rows have style = null, renderer treats null as default
  - No data loss — constraint update uses DROP IF EXISTS + ADD pattern
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cms_sections' AND column_name = 'style'
  ) THEN
    ALTER TABLE cms_sections ADD COLUMN style jsonb DEFAULT NULL;
  END IF;
END $$;

ALTER TABLE cms_sections DROP CONSTRAINT IF EXISTS valid_section_type;

ALTER TABLE cms_sections
ADD CONSTRAINT valid_section_type CHECK (
  section_type IN (
    'hero',
    'features',
    'steps',
    'categories',
    'text-section',
    'showcase',
    'cta',
    'gallery',
    'tabs'
  )
);
