-- ============================================================================
-- REVERT: Separate Mission & Vision Back to Individual Sections
-- ============================================================================
-- This reverts the merged grid layout and restores separate sections
-- The CMS UI now handles grid management (no hardcoded data needed)
-- ============================================================================

-- Step 1: View current state
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title,
  (s.content->'internal_grid'->>'enabled')::boolean as has_grid
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section'
ORDER BY s.order_index;

-- Step 2: Delete the merged section
DELETE FROM cms_sections
WHERE id IN (
  SELECT s.id
  FROM cms_sections s
  JOIN cms_pages p ON s.page_id = p.id
  WHERE p.slug = 'about-us'
    AND s.section_type = 'text-section'
    AND (s.content->'internal_grid'->>'enabled')::boolean = true
);

-- Step 3: Add Mission back as separate section
INSERT INTO cms_sections (page_id, section_type, content, order_index)
VALUES (
  (SELECT id FROM cms_pages WHERE slug = 'about-us' LIMIT 1),
  'text-section',
  jsonb_build_object(
    'section_title', 'Our Mission',
    'body_content', 'Our mission is to empower organizations and communities by providing reliable digital platforms, structured processes, and accessible tools that promote accountability, growth, and sustainable development.',
    'text_alignment', 'left',
    'max_width', 'normal',
    'background_style', 'none',
    'show_divider', false
  ),
  0
);

-- Step 4: Add Vision back as separate section
INSERT INTO cms_sections (page_id, section_type, content, order_index)
VALUES (
  (SELECT id FROM cms_pages WHERE slug = 'about-us' LIMIT 1),
  'text-section',
  jsonb_build_object(
    'section_title', 'Our Vision',
    'body_content', 'We envision a future where institutions, investors, and the public are connected through transparent systems that foster trust, innovation, and long term value.',
    'text_alignment', 'left',
    'max_width', 'normal',
    'background_style', 'none',
    'show_divider', false
  ),
  1
);

-- Step 5: Verify
SELECT 
  s.id,
  s.order_index,
  s.content->>'section_title' as title
FROM cms_sections s
JOIN cms_pages p ON s.page_id = p.id
WHERE p.slug = 'about-us'
  AND s.section_type = 'text-section'
ORDER BY s.order_index;