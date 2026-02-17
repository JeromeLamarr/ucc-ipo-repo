-- Add TABS section type to CMS
-- Created: February 17, 2026
-- Purpose: Support tabbed content sections in CMS

-- Update the CHECK constraint to include 'tabs'
ALTER TABLE cms_sections 
DROP CONSTRAINT valid_section_type;

ALTER TABLE cms_sections 
ADD CONSTRAINT valid_section_type CHECK (
  section_type IN ('hero', 'features', 'steps', 'categories', 'text-section', 'showcase', 'cta', 'gallery', 'tabs')
);

-- Add comment on the new section type
COMMENT ON CONSTRAINT valid_section_type ON cms_sections IS 
  'Valid CMS section types: hero, features, steps, categories, text-section, showcase, cta, gallery, tabs';
