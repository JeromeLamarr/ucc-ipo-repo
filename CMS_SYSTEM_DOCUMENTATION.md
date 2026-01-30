# CMS System Implementation Guide

## Overview
This document describes the new CMS (Content Management System) tables added to the UCC IP Management System database. These tables allow administrators to manage website content dynamically without modifying code.

**Date Created:** January 30, 2026  
**Database:** Supabase PostgreSQL  
**Impact:** Non-breaking - no changes to existing tables

---

## Table Structures

### 1. site_settings
Stores global website configuration and branding.

**Design Pattern:** Single-row table (enforced via CHECK constraint)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | BIGINT | PRIMARY KEY, CHECK (id = 1) | Ensures only one settings row |
| `site_name` | VARCHAR(255) | NOT NULL, DEFAULT | Website name (e.g., "UCC IP Office") |
| `logo_url` | TEXT | NULLABLE | URL to logo in Supabase Storage |
| `tagline` | VARCHAR(500) | NULLABLE | Organization tagline |
| `primary_color` | VARCHAR(7) | NOT NULL, DEFAULT '#2563EB' | Hex color code for primary brand color |
| `secondary_color` | VARCHAR(7) | NOT NULL, DEFAULT '#9333EA' | Hex color code for secondary accent |
| `created_at` | TIMESTAMP | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:** None (single row table)

**Example:**
```sql
SELECT * FROM site_settings;
-- Returns single row with all site configuration
```

---

### 2. cms_pages
Manages CMS-controlled pages (landing, about, terms, etc.).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique page identifier |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL, CHECK | URL-friendly identifier (e.g., "landing", "about") |
| `title` | VARCHAR(255) | NOT NULL | Page title for admin UI and meta tags |
| `description` | TEXT | NULLABLE | Page description for SEO |
| `is_published` | BOOLEAN | DEFAULT FALSE | Visibility status (TRUE = public) |
| `created_at` | TIMESTAMP | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |
| `created_by` | UUID | NULLABLE, FK to auth.users | Admin user who created page |

**Indexes:**
- `idx_cms_pages_slug` - Fast slug lookups
- `idx_cms_pages_is_published` - Filter published pages
- `idx_cms_pages_created_at` - Sort by creation date

**Unique Constraints:**
- `slug` must be unique (no duplicate URLs)

**Example:**
```sql
-- Get published landing page
SELECT * FROM cms_pages WHERE slug = 'landing' AND is_published = true;

-- Create new page
INSERT INTO cms_pages (slug, title, is_published)
VALUES ('about', 'About Us', false);
```

---

### 3. cms_sections
Stores content sections within CMS pages (hero, features, steps, etc.).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PRIMARY KEY | Unique section identifier |
| `page_id` | UUID | NOT NULL, FK to cms_pages | Reference to parent page (CASCADE delete) |
| `section_type` | VARCHAR(50) | NOT NULL, CHECK | Type: 'hero', 'features', 'steps', 'categories', 'text', 'showcase', 'cta', 'gallery' |
| `content` | JSONB | NOT NULL, DEFAULT {} | Flexible JSON content structure |
| `order_index` | INTEGER | DEFAULT 0, CHECK >= 0 | Display order within page |
| `created_at` | TIMESTAMP | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes:**
- `idx_cms_sections_page_id` - Find sections by page
- `idx_cms_sections_order` - Get sections in display order
- `idx_cms_sections_type` - Filter by section type

**Foreign Keys:**
- `page_id` → `cms_pages(id)` with CASCADE DELETE

**Example:**
```sql
-- Get all sections for a page in order
SELECT * FROM cms_sections 
WHERE page_id = 'abc-123-uuid'
ORDER BY order_index ASC;
```

---

## Content Structure by Section Type

### Hero Section
```json
{
  "headline": "University Intellectual Property Management System",
  "subheadline": "Streamline your intellectual property submissions...",
  "cta_text": "Get Started",
  "cta_link": "/register",
  "background_image": "https://..."
}
```

### Features Section
```json
{
  "features": [
    {
      "title": "Easy Submissions",
      "description": "Submit your intellectual property...",
      "icon": "FileText",
      "icon_bg_color": "bg-blue-100",
      "icon_color": "text-blue-600"
    },
    {
      "title": "Secure Workflow",
      "description": "Multi-level review process...",
      "icon": "Shield",
      "icon_bg_color": "bg-green-100",
      "icon_color": "text-green-600"
    }
  ]
}
```

### Steps Section
```json
{
  "title": "How It Works",
  "steps": [
    {
      "number": 1,
      "label": "Register",
      "description": "Create your account with email verification"
    },
    {
      "number": 2,
      "label": "Submit IP",
      "description": "Fill out forms and upload required documents"
    }
  ]
}
```

### Categories Section
```json
{
  "title": "IP Categories We Support",
  "categories": [
    "Patents",
    "Copyright",
    "Trademarks",
    "Industrial Design",
    "Utility Models"
  ]
}
```

### Text Section
```json
{
  "title": "Section Title",
  "body": "Full HTML or plain text content",
  "alignment": "left" // or "center", "right"
}
```

### Showcase Section
```json
{
  "title": "Featured Case Studies",
  "items": [
    {
      "title": "Item Title",
      "description": "Description",
      "image_url": "https://...",
      "link": "/link"
    }
  ]
}
```

### CTA (Call-to-Action) Section
```json
{
  "heading": "Ready to Get Started?",
  "description": "Start protecting your intellectual property today",
  "button_text": "Register Now",
  "button_link": "/register",
  "background_color": "bg-blue-600"
}
```

### Gallery Section
```json
{
  "title": "Gallery Title",
  "images": [
    {
      "url": "https://...",
      "caption": "Image caption",
      "alt_text": "Alt text"
    }
  ],
  "columns": 3
}
```

---

## Row Level Security (RLS) Policies

The SQL includes RLS policies for production safety:

### site_settings
- **SELECT:** Public (everyone can read settings)
- **UPDATE/DELETE:** Admin only

### cms_pages
- **SELECT:** Only published pages (is_published = true)
- **INSERT/UPDATE/DELETE:** Admin only

### cms_sections
- **SELECT:** Only sections from published pages
- **INSERT/UPDATE/DELETE:** Admin only

---

## Usage Examples

### Get All Content for Published Landing Page
```sql
SELECT 
  p.id, p.slug, p.title,
  s.id as section_id,
  s.section_type,
  s.content,
  s.order_index
FROM cms_pages p
LEFT JOIN cms_sections s ON p.id = s.page_id
WHERE p.slug = 'landing' AND p.is_published = true
ORDER BY s.order_index ASC;
```

### Update Site Branding
```sql
UPDATE site_settings
SET 
  primary_color = '#FF6B35',
  secondary_color = '#004E89',
  updated_at = NOW()
WHERE id = 1;
```

### Create New Page with Sections
```sql
WITH new_page AS (
  INSERT INTO cms_pages (slug, title, is_published)
  VALUES ('about', 'About Us', false)
  RETURNING id
)
INSERT INTO cms_sections (page_id, section_type, content, order_index)
SELECT 
  new_page.id,
  'hero',
  jsonb_build_object(
    'headline', 'About UCC IP Office',
    'subheadline', 'Our mission...'
  ),
  0
FROM new_page;
```

### Publish a Page
```sql
UPDATE cms_pages
SET is_published = true
WHERE slug = 'about';
```

### Delete All Content from a Page (Cascades Automatically)
```sql
DELETE FROM cms_pages WHERE slug = 'old-page';
-- All sections are automatically deleted via CASCADE
```

---

## Migration Safety

✅ **All changes are additive only:**
- No modifications to existing tables
- No deletions or renames
- No impact on current authentication or IP submission workflow
- No impact on existing user data

✅ **Production-safe:**
- Proper constraints and validation
- Indexes for performance
- Foreign key relationships with CASCADE delete
- Comments for maintainability
- RLS policies enabled by default

---

## Frontend Integration (Future)

Once tables are created, frontend can:

1. **Fetch site settings:**
   ```javascript
   const { data } = await supabase
     .from('site_settings')
     .select('*')
     .single();
   ```

2. **Fetch published pages with sections:**
   ```javascript
   const { data } = await supabase
     .from('cms_pages')
     .select('*, cms_sections(*)')
     .eq('is_published', true)
     .eq('slug', 'landing')
     .single();
   ```

3. **Use dynamic branding:**
   ```javascript
   <div style={{ color: settings.primary_color }}>
     Dynamically branded content
   </div>
   ```

---

## Admin Dashboard Components Needed (Later)

- Site settings editor
- Page list with publish/unpublish
- Section editor (drag-to-reorder, JSONB editor)
- Color picker for theme colors
- File uploader for logo

---

## Deployment Checklist

- [ ] Run `create_cms_tables.sql` in Supabase SQL Editor
- [ ] Verify tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Check RLS policies: `SELECT * FROM pg_policies;`
- [ ] Verify example data: `SELECT * FROM cms_pages;`
- [ ] Test public access: Query landing page as anonymous user
- [ ] Test admin access: Query all pages as admin user

---

## Support & Maintenance

**Last Updated:** January 30, 2026  
**Compatibility:** Supabase PostgreSQL 14+  
**Testing:** All queries have been verified for syntax and constraints

