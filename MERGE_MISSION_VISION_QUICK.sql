-- ============================================================================
-- QUICK MERGE: Mission + Vision into 2-Column Grid (about-us page)
-- ============================================================================
-- This script converts the vertically stacked Mission/Vision sections
-- into a single section with 2-column grid layout
-- ============================================================================

-- Step 1: View current sections (run this first to see data)
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title,
  SUBSTRING(s.content->>'body_content', 1, 100) as preview
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section'
ORDER BY s.order_index;

-- Step 2: Execute the merge (update Mission section with grid + both blocks)
UPDATE cms_sections
SET content = jsonb_build_object(
  'section_title', 'Our Mission & Vision',
  'text_alignment', 'left',
  'max_width', 'normal',
  'background_style', 'none',
  'show_divider', false,
  'internal_grid', jsonb_build_object(
    'enabled', true,
    'columns', 2,
    'gap', 'gap-6'
  ),
  'blocks', jsonb_build_array(
    jsonb_build_object(
      'title', 'Our Mission',
      'content', 'Our mission is to empower organizations and communities by providing reliable digital platforms, structured processes, and accessible tools that promote accountability, growth, and sustainable development.'
    ),
    jsonb_build_object(
      'title', 'Our Vision',
      'content', 'We envision a future where institutions, investors, and the public are connected through transparent systems that foster trust, innovation, and long term value.'
    )
  )
)
WHERE id IN (
  SELECT s.id
  FROM cms_sections s
  JOIN cms_pages p ON s.page_id = p.id
  WHERE p.slug = 'about-us'
    AND s.section_type = 'text-section'
    AND s.order_index = (
      SELECT MIN(order_index)
      FROM cms_sections s2
      JOIN cms_pages p2 ON s2.page_id = p2.id
      WHERE p2.slug = 'about-us'
        AND s2.section_type = 'text-section'
    )
);

-- Step 3: Delete the Vision section (now merged)
DELETE FROM cms_sections
WHERE id IN (
  SELECT s.id
  FROM cms_sections s
  JOIN cms_pages p ON s.page_id = p.id
  WHERE p.slug = 'about-us'
    AND s.section_type = 'text-section'
    AND s.order_index = (
      SELECT MAX(order_index)
      FROM cms_sections s2
      JOIN cms_pages p2 ON s2.page_id = p2.id
      WHERE p2.slug = 'about-us'
        AND s2.section_type = 'text-section'
    )
);

-- Step 4: Verify the result
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title,
  (s.content->'internal_grid'->>'enabled')::boolean as has_grid,
  (s.content->'internal_grid'->>'columns')::int as columns,
  jsonb_array_length(s.content->'blocks') as blocks
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section'
ORDER BY s.order_index;