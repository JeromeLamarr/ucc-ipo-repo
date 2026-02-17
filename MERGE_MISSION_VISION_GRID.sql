-- ============================================================================
-- Merge "Our Mission" and "Our Vision" into a 2-Column Grid Layout
-- ============================================================================
-- Purpose: Replace two separate text-section blocks with a single section
--          that displays both blocks side-by-side using internal_grid
--
-- Before: Two separate, vertically stacked "text-section" blocks taking up lots of space
-- After:  One "text-section" with internal_grid enabled (2 columns) showing both blocks
--
-- Steps:
-- 1. Find the about-us page ID
-- 2. Get the Mission and Vision section IDs
-- 3. Combine them into a single section with internal_grid configuration
-- 4. Delete the old sections
-- ============================================================================

-- Step 1: Get the page ID for about-us
WITH page_info AS (
  SELECT id, slug, title 
  FROM cms_pages 
  WHERE slug = 'about-us' 
  LIMIT 1
)
-- Step 2: Find the Mission and Vision sections
SELECT 
  id, 
  page_id, 
  section_type, 
  order_index, 
  content->>'section_title' as section_title,
  content->>'body_content' as preview
FROM cms_sections 
WHERE page_id = (SELECT id FROM page_info)
  AND section_type = 'text-section'
ORDER BY order_index;

-- The above query shows you the sections. Now execute the actual merge:
-- (Replace the section IDs with actual values from the query above)

-- ============================================================================
-- ACTUAL MERGE SCRIPT - Execute this to combine the sections
-- ============================================================================

-- First, get the page details (update the about-us slug if needed)
WITH page_data AS (
  SELECT id 
  FROM cms_pages 
  WHERE slug = 'about-us'
  LIMIT 1
),
-- Get the first (Mission) section details
mission_data AS (
  SELECT 
    id,
    order_index,
    content
  FROM cms_sections
  WHERE page_id = (SELECT id FROM page_data)
    AND section_type = 'text-section'
    AND (content->>'section_title' LIKE '%Mission%' OR order_index = (
      SELECT MIN(order_index) 
      FROM cms_sections 
      WHERE page_id = (SELECT id FROM page_data)
        AND section_type = 'text-section'
    ))
  LIMIT 1
),
-- Get the second (Vision) section details
vision_data AS (
  SELECT 
    id,
    order_index,
    content
  FROM cms_sections
  WHERE page_id = (SELECT id FROM page_data)
    AND section_type = 'text-section'
    AND (content->>'section_title' LIKE '%Vision%' OR order_index > (
      SELECT order_index FROM mission_data LIMIT 1
    ))
  LIMIT 1
)
-- Update the Mission section to include both blocks with grid layout
UPDATE cms_sections
SET 
  content = jsonb_set(
    content,
    '{internal_grid}',
    jsonb_build_object(
      'enabled', true,
      'columns', 2,
      'gap', 'gap-6'
    )
  ) || jsonb_build_object(
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'title', (SELECT content->>'section_title' FROM mission_data),
        'content', (SELECT content->>'body_content' FROM mission_data)
      ),
      jsonb_build_object(
        'title', (SELECT content->>'section_title' FROM vision_data),
        'content', (SELECT content->>'body_content' FROM vision_data)
      )
    )
  )
WHERE id = (SELECT id FROM mission_data);

-- Delete the Vision section (it's now merged into Mission)
DELETE FROM cms_sections
WHERE id IN (SELECT id FROM vision_data);

-- Cleanup: Reorder remaining sections
WITH page_data AS (
  SELECT id FROM cms_pages WHERE slug = 'about-us' LIMIT 1
)
UPDATE cms_sections
SET order_index = row_number() OVER (ORDER BY order_index)
WHERE page_id = (SELECT id FROM page_data);

-- ============================================================================
-- Verification Query - Run this to see the merged result
-- ============================================================================
SELECT 
  id,
  section_type,
  order_index,
  content->>'section_title' as title,
  (content->'internal_grid'->>'enabled')::boolean as grid_enabled,
  (content->'internal_grid'->>'columns')::int as grid_columns,
  jsonb_array_length(content->'blocks') as block_count
FROM cms_sections
WHERE page_id = (SELECT id FROM cms_pages WHERE slug = 'about-us' LIMIT 1)
ORDER BY order_index;

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
-- If you need to revert this change, use the git history to restore
-- the original sections, or manually create them again with the original content

/*
-- Example rollback (restore from git history):
UPDATE cms_sections
SET content = jsonb_set(content, '{section_title}', '"Our Mission"')
WHERE section_type = 'text-section' AND id = 'mission-section-id';

INSERT INTO cms_sections (page_id, section_type, content, order_index)
VALUES (
  (SELECT id FROM cms_pages WHERE slug = 'about-us' LIMIT 1),
  'text-section',
  jsonb_build_object(
    'section_title', 'Our Vision',
    'body_content', 'Original vision content here...',
    'text_alignment', 'left',
    'max_width', 'normal',
    'background_style', 'none'
  ),
  2
);
*/