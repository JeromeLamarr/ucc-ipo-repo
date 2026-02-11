-- Add 'text-section' to valid section types
-- This migration updates the section_type constraint to use 'text-section' instead of 'text'

-- Drop the existing constraint
ALTER TABLE cms_sections DROP CONSTRAINT valid_section_type;

-- Add the new constraint with updated values
ALTER TABLE cms_sections ADD CONSTRAINT valid_section_type CHECK (
  section_type IN ('hero', 'features', 'steps', 'categories', 'text-section', 'showcase', 'cta', 'gallery')
);

-- Update the comment to reflect the new section type
COMMENT ON COLUMN cms_sections.section_type IS 'Type of section: hero, features, steps, categories, text-section, showcase, cta, gallery';
