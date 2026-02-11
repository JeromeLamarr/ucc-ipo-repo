-- CMS System Tables for UCC IP Management System
-- Created: January 30, 2026
-- Safe to run: Does not modify or delete existing tables

-- ============================================================================
-- 1. SITE SETTINGS TABLE
-- ============================================================================
-- Stores global configuration for the website (branding, colors, etc.)
-- Single row design pattern using a check constraint

CREATE TABLE IF NOT EXISTS site_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  site_name VARCHAR(255) NOT NULL DEFAULT 'UCC IP Management System',
  logo_url TEXT,
  tagline VARCHAR(500),
  primary_color VARCHAR(7) NOT NULL DEFAULT '#2563EB', -- Hex color code
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#9333EA', -- Hex color code
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint: Only allow single row (id = 1)
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Add comment for clarity
COMMENT ON TABLE site_settings IS 'Global website configuration and branding settings';
COMMENT ON COLUMN site_settings.site_name IS 'Main site name displayed in headers and footer';
COMMENT ON COLUMN site_settings.logo_url IS 'URL to logo image stored in Supabase Storage';
COMMENT ON COLUMN site_settings.tagline IS 'Short tagline for the organization';
COMMENT ON COLUMN site_settings.primary_color IS 'Primary brand color in hex format';
COMMENT ON COLUMN site_settings.secondary_color IS 'Secondary accent color in hex format';

-- Insert default settings (safe: will not duplicate due to constraint)
INSERT INTO site_settings (
  id,
  site_name,
  logo_url,
  tagline,
  primary_color,
  secondary_color
) VALUES (
  1,
  'University of Caloocan City IP Office',
  NULL, -- Will be set later via admin panel
  'Protecting Innovation, Promoting Excellence',
  '#2563EB',
  '#9333EA'
) ON CONFLICT DO NOTHING;


-- ============================================================================
-- 2. CMS PAGES TABLE
-- ============================================================================
-- Stores information about CMS-managed pages (landing page, about, etc.)

CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT slug_not_empty CHECK (LENGTH(TRIM(slug)) > 0)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_is_published ON cms_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_cms_pages_created_at ON cms_pages(created_at DESC);

-- Add comments
COMMENT ON TABLE cms_pages IS 'CMS-managed pages (landing, about, pricing, etc.)';
COMMENT ON COLUMN cms_pages.slug IS 'URL-friendly slug (e.g., "landing", "about", "terms")';
COMMENT ON COLUMN cms_pages.title IS 'Page title for admin UI and meta tags';
COMMENT ON COLUMN cms_pages.is_published IS 'Page visibility status (TRUE = public)';
COMMENT ON COLUMN cms_pages.created_by IS 'Reference to admin user who created the page';


-- ============================================================================
-- 3. CMS SECTIONS TABLE
-- ============================================================================
-- Stores content sections within pages (hero, features, steps, etc.)
-- Content stored as JSONB for flexibility

CREATE TABLE IF NOT EXISTS cms_sections (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_section_type CHECK (
    section_type IN ('hero', 'features', 'steps', 'categories', 'text-section', 'showcase', 'cta', 'gallery')
  ),
  CONSTRAINT order_index_positive CHECK (order_index >= 0)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cms_sections_page_id ON cms_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_sections_order ON cms_sections(page_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_cms_sections_type ON cms_sections(section_type);

-- Add comments
COMMENT ON TABLE cms_sections IS 'Content sections within CMS pages (hero, features, steps, etc.)';
COMMENT ON COLUMN cms_sections.page_id IS 'Foreign key reference to parent CMS page';
COMMENT ON COLUMN cms_sections.section_type IS 'Type of section: hero, features, steps, categories, text-section, showcase, cta, gallery';
COMMENT ON COLUMN cms_sections.content IS 'Flexible JSONB content structure per section type';
COMMENT ON COLUMN cms_sections.order_index IS 'Display order within the page (0-indexed)';


-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Restricts access to CMS tables:
-- - site_settings: publicly readable, admin-only writable
-- - cms_pages: published pages publicly readable, admins can manage all
-- - cms_sections: readable via published pages, admin-only writable

-- Enable RLS on all CMS tables
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_sections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SITE_SETTINGS POLICIES: Anyone can read, only admins can write
-- ============================================================================
CREATE POLICY "site_settings_public_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- CMS_PAGES POLICIES: Public pages readable by all, admins manage all pages
-- ============================================================================
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- CMS_SECTIONS POLICIES: Readable via published pages, admin-only writable
-- ============================================================================
CREATE POLICY "cms_sections_published_read" 
  ON cms_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cms_pages 
      WHERE cms_pages.id = cms_sections.page_id 
      AND cms_pages.is_published = true
    )
  );

CREATE POLICY "cms_sections_admin_insert" 
  ON cms_sections FOR INSERT
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE
  USING (
    auth.uid()::text IN (
      SELECT id::text FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin' 
      OR email LIKE '%admin%'
    )
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );


-- ============================================================================
-- EXAMPLE DATA (Optional - Remove if not needed)
-- ============================================================================

-- Insert home page example (canonical slug: 'home')
INSERT INTO cms_pages (slug, title, description, is_published)
VALUES (
  'home',
  'Home Page',
  'Main home page for the IP Management System',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Get the home page ID for sections
DO $$
DECLARE
  home_page_id UUID;
BEGIN
  SELECT id INTO home_page_id FROM cms_pages WHERE slug = 'home' LIMIT 1;
  
  IF home_page_id IS NOT NULL THEN
    -- Insert hero section
    INSERT INTO cms_sections (
      page_id,
      section_type,
      content,
      order_index
    ) VALUES (
      home_page_id,
      'hero',
      jsonb_build_object(
        'headline', 'University Intellectual Property Management System',
        'subheadline', 'Streamline your intellectual property submissions, evaluations, and approvals with our comprehensive management platform.',
        'cta_text', 'Get Started',
        'cta_link', '/register'
      ),
      0
    ) ON CONFLICT DO NOTHING;

    -- Insert features section
    INSERT INTO cms_sections (
      page_id,
      section_type,
      content,
      order_index
    ) VALUES (
      home_page_id,
      'features',
      jsonb_build_object(
        'features', jsonb_build_array(
          jsonb_build_object(
            'title', 'Easy Submissions',
            'description', 'Submit your intellectual property with a streamlined digital form.',
            'icon', 'FileText',
            'icon_bg_color', 'bg-blue-100',
            'icon_color', 'text-blue-600'
          ),
          jsonb_build_object(
            'title', 'Secure Workflow',
            'description', 'Multi-level review process with supervisor approval and expert evaluation.',
            'icon', 'Shield',
            'icon_bg_color', 'bg-green-100',
            'icon_color', 'text-green-600'
          ),
          jsonb_build_object(
            'title', 'Track Progress',
            'description', 'Monitor your submission status in real-time and generate certificates.',
            'icon', 'TrendingUp',
            'icon_bg_color', 'bg-purple-100',
            'icon_color', 'text-purple-600'
          )
        )
      ),
      1
    ) ON CONFLICT DO NOTHING;

    -- Insert steps section
    INSERT INTO cms_sections (
      page_id,
      section_type,
      content,
      order_index
    ) VALUES (
      home_page_id,
      'steps',
      jsonb_build_object(
        'title', 'How It Works',
        'steps', jsonb_build_array(
          jsonb_build_object('number', 1, 'label', 'Register', 'description', 'Create your account with email verification'),
          jsonb_build_object('number', 2, 'label', 'Submit IP', 'description', 'Fill out forms and upload required documents'),
          jsonb_build_object('number', 3, 'label', 'Review Process', 'description', 'Supervisor and evaluator assessment'),
          jsonb_build_object('number', 4, 'label', 'Get Certificate', 'description', 'Receive official documents with QR codes')
        )
      ),
      2
    ) ON CONFLICT DO NOTHING;

    -- Insert categories section
    INSERT INTO cms_sections (
      page_id,
      section_type,
      content,
      order_index
    ) VALUES (
      home_page_id,
      'categories',
      jsonb_build_object(
        'title', 'IP Categories We Support',
        'categories', jsonb_build_array(
          'Patents',
          'Copyright',
          'Trademarks',
          'Industrial Design',
          'Utility Models'
        )
      ),
      3
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify tables were created)
-- ============================================================================
-- Uncomment and run individually to verify:

-- SELECT * FROM site_settings;
-- SELECT * FROM cms_pages;
-- SELECT * FROM cms_sections;
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('site_settings', 'cms_pages', 'cms_sections');
