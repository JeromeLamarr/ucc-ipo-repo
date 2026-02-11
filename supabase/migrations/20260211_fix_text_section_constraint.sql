-- Fix: Update cms_sections constraint to accept 'text-section' type
-- This migration updates the valid_section_type constraint to include 'text-section'
-- Date: February 11, 2026

-- Drop the old constraint
ALTER TABLE IF EXISTS cms_sections 
DROP CONSTRAINT IF EXISTS valid_section_type;

-- Add the new constraint with 'text-section' support
ALTER TABLE cms_sections 
ADD CONSTRAINT valid_section_type CHECK (
  section_type IN ('hero', 'features', 'steps', 'categories', 'text-section', 'showcase', 'cta', 'gallery')
);

-- Verify the constraint was applied
-- SELECT constraint_name, table_name FROM information_schema.table_constraints 
-- WHERE table_name='cms_sections' AND constraint_type='CHECK';
