-- ============================================================================
-- CMS Demo Page - Comprehensive Test of All Section Types
-- ============================================================================
-- This script creates a demo page with all available CMS sections
-- to test all features and functionality

-- 1. Create the demo page
INSERT INTO cms_pages (slug, title, description, is_published)
VALUES (
  'demo',
  'CMS Demo - All Sections',
  'Comprehensive demo page showcasing all available CMS sections and features',
  TRUE
)
ON CONFLICT DO NOTHING;

-- Get the demo page ID for inserting sections
-- Note: You may need to adjust these IDs based on your database

-- 2. HERO SECTION - Main landing banner
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'hero',
  jsonb_build_object(
    'headline', 'Welcome to',
    'headline_highlight', 'UCC IP Management System',
    'subheadline', 'A comprehensive platform for managing intellectual property, protecting innovation, and promoting excellence across the university',
    'cta_text', 'Get Started',
    'cta_link', '/register',
    'background_image', NULL
  ),
  0
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'hero'
);

-- 3. FEATURES SECTION - Key features grid
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'features',
  jsonb_build_object(
    'features', jsonb_build_array(
      jsonb_build_object(
        'title', 'Secure Storage',
        'description', 'Enterprise-grade security for your IP documents and records',
        'icon_bg_color', 'bg-blue-100',
        'icon_color', 'text-blue-600'
      ),
      jsonb_build_object(
        'title', 'Easy Management',
        'description', 'Intuitive interface to manage and track all intellectual property',
        'icon_bg_color', 'bg-purple-100',
        'icon_color', 'text-purple-600'
      ),
      jsonb_build_object(
        'title', 'Real-time Analytics',
        'description', 'Monitor submissions, approvals, and evaluation progress in real-time',
        'icon_bg_color', 'bg-green-100',
        'icon_color', 'text-green-600'
      ),
      jsonb_build_object(
        'title', 'Collaboration Tools',
        'description', 'Work seamlessly with supervisors, evaluators, and stakeholders',
        'icon_bg_color', 'bg-orange-100',
        'icon_color', 'text-orange-600'
      )
    )
  ),
  1
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'features'
);

-- 4. STEPS SECTION - Process workflow
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'steps',
  jsonb_build_object(
    'title', 'How It Works',
    'steps', jsonb_build_array(
      jsonb_build_object(
        'number', 1,
        'label', 'Register & Login',
        'description', 'Create your account and log in to the system'
      ),
      jsonb_build_object(
        'number', 2,
        'label', 'Submit IP Record',
        'description', 'Fill out the IP disclosure form with all required information'
      ),
      jsonb_build_object(
        'number', 3,
        'label', 'Expert Review',
        'description', 'Submit for evaluation and feedback from IP experts'
      ),
      jsonb_build_object(
        'number', 4,
        'label', 'Decision & Next Steps',
        'description', 'Receive decision and guidance on protecting your innovation'
      )
    )
  ),
  2
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'steps'
);

-- 5. CATEGORIES SECTION - Service categories
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'categories',
  jsonb_build_object(
    'title', 'Intellectual Property Types',
    'categories', jsonb_build_array(
      jsonb_build_object(
        'name', 'Patents',
        'description', 'Protect your inventions and technological innovations'
      ),
      jsonb_build_object(
        'name', 'Trademarks',
        'description', 'Safeguard your brand identity and logos'
      ),
      jsonb_build_object(
        'name', 'Copyright',
        'description', 'Register and protect creative works'
      ),
      jsonb_build_object(
        'name', 'Trade Secrets',
        'description', 'Manage and protect confidential business information'
      ),
      jsonb_build_object(
        'name', 'Designs',
        'description', 'Protect industrial designs and aesthetic creations'
      )
    )
  ),
  3
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'categories'
);

-- 6. TEXT SECTION - Informational content
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'text-section',
  jsonb_build_object(
    'section_title', 'About IP Protection',
    'body_content', 'Intellectual Property (IP) is the product of human creativity and innovation. It includes inventions, literary and artistic works, designs, and symbols used in commerce. Protecting your IP is crucial for maintaining competitive advantage, attracting investors, and ensuring your innovations benefit you and your organization.

At the University of Caloocan City, we are committed to supporting faculty, students, and researchers in protecting and commercializing their intellectual property. Our state-of-the-art management system makes it easy to disclose, evaluate, and manage all types of IP.',
    'text_alignment', 'left',
    'max_width', 'normal',
    'background_style', 'light_gray',
    'show_divider', TRUE,
    'text_style_preset', 'default',
    'title_style', 'normal',
    'text_size', 'medium',
    'visual_tone', 'neutral',
    'accent_icon', 'none',
    'emphasize_section', FALSE,
    'vertical_spacing', 'normal'
  ),
  4
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'text-section'
);

-- 7. SHOWCASE SECTION - Featured items
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'showcase',
  jsonb_build_object(
    'title', 'Our Success Stories',
    'items', jsonb_build_array(
      jsonb_build_object(
        'title', 'Patent for Advanced Robotics',
        'description', 'Successfully filed a patent for an innovative robotics system developed by our engineering department',
        'image_url', NULL,
        'image_width', 400,
        'image_height', 300,
        'image_position', 'center'
      ),
      jsonb_build_object(
        'title', 'Medical Device Innovation',
        'description', 'Created a trademark for a groundbreaking medical diagnostic tool',
        'image_url', NULL,
        'image_width', 400,
        'image_height', 300,
        'image_position', 'center'
      ),
      jsonb_build_object(
        'title', 'Software Framework',
        'description', 'Copyrighted a comprehensive open-source software framework used by developers worldwide',
        'image_url', NULL,
        'image_width', 400,
        'image_height', 300,
        'image_position', 'center'
      )
    )
  ),
  5
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'showcase'
);

-- 8. GALLERY SECTION - Image gallery
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'gallery',
  jsonb_build_object(
    'title', 'Gallery',
    'images', jsonb_build_array(
      jsonb_build_object(
        'url', NULL,
        'alt_text', 'UCC IP Office Building',
        'caption', 'Main Office Building',
        'offset_x', 50,
        'offset_y', 50
      ),
      jsonb_build_object(
        'url', NULL,
        'alt_text', 'Research Lab',
        'caption', 'State-of-the-art Research Facilities',
        'offset_x', 50,
        'offset_y', 50
      ),
      jsonb_build_object(
        'url', NULL,
        'alt_text', 'Team Meeting',
        'caption', 'Expert Evaluation Team',
        'offset_x', 50,
        'offset_y', 50
      )
    ),
    'columns', 3
  ),
  6
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'gallery'
);

-- 9. CTA SECTION - Call to action
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  id,
  'cta',
  jsonb_build_object(
    'heading', 'Ready to Protect Your Innovation?',
    'description', 'Join hundreds of faculty members and students who have already secured their intellectual property through our platform.',
    'button_text', 'Start Your IP Journey',
    'button_link', '/register',
    'background_color', 'bg-blue-600'
  ),
  7
FROM cms_pages
WHERE slug = 'demo'
AND NOT EXISTS (
  SELECT 1 FROM cms_sections WHERE page_id = cms_pages.id AND section_type = 'cta'
);

-- 10. Display the created page and sections
SELECT 
  'Demo page created successfully! Sections added:' as status,
  COUNT(*) as total_sections
FROM cms_sections
WHERE page_id = (SELECT id FROM cms_pages WHERE slug = 'demo');

-- Show section details
SELECT 
  section_type,
  order_index,
  jsonb_build_object(
    'fields', ARRAY_LENGTH(ARRAY(SELECT jsonb_object_keys(content)), 1)
  ) as content_preview
FROM cms_sections
WHERE page_id = (SELECT id FROM cms_pages WHERE slug = 'demo')
ORDER BY order_index ASC;
