# UCC IP Office CMS System - Complete Guide

## Overview

The CMS (Content Management System) is a dynamic, database-driven system that allows administrators to create, edit, and publish web pages without touching code. The frontend automatically renders these pages with proper styling, layouts, and interactive elements.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐    ┌──────────────────┐  ┌──────────────┐ │
│ │  LandingPage     │    │ CMSPageRenderer  │  │PublicPages   │ │
│ │  (ucc-ipo.com)   │    │ (/pages/:slug)   │  │List/Manager  │ │
│ └────────┬─────────┘    └────────┬─────────┘  └──────┬───────┘ │
│          │                       │                    │          │
│          └───────────────────────┼────────────────────┘          │
│                                  │                                │
│                    Fetch CMS Pages & Sections                    │
│                    Render by Section Type                        │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                    Supabase API
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐    │
│ │  site_settings   │  │   cms_pages      │  │ cms_sections │    │
│ ├──────────────────┤  ├──────────────────┤  ├──────────────┤    │
│ │ site_name        │  │ id               │  │ id           │    │
│ │ tagline          │  │ slug             │  │ page_id (FK) │    │
│ │ primary_color    │  │ title            │  │ section_type │    │
│ │ secondary_color  │  │ is_published     │  │ content      │    │
│ │ logo_url         │  │ created_at       │  │ order_index  │    │
│ └──────────────────┘  │ updated_at       │  │ created_at   │    │
│                       └──────────────────┘  └──────────────┘    │
│                                                                   │
│         Row-Level Security (RLS) Policies:                      │
│         ✓ Public can READ published pages                       │
│         ✓ Authenticated users can READ/WRITE all pages          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. **site_settings** Table
Stores global website configuration accessible to all pages.

```sql
site_settings
├── id (UUID, PK)
├── site_name (TEXT) - "University of Caloocan City Intellectual Property Office"
├── tagline (TEXT) - "Protecting Innovation, Promoting Excellence"
├── primary_color (TEXT) - "#2563EB" (blue - used in buttons, headings)
├── secondary_color (TEXT) - "#9333EA" (purple - accent color)
├── logo_url (TEXT, nullable) - URL to logo image
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 2. **cms_pages** Table
Represents a complete page that can be published and shared.

```sql
cms_pages
├── id (UUID, PK)
├── slug (TEXT, UNIQUE) - URL path ("home", "about", "contact")
├── title (TEXT) - Display name ("Home", "About Us")
├── is_published (BOOLEAN) - Control visibility (true = public can see)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── Relationships:
    └── has many cms_sections
```

### 3. **cms_sections** Table
Individual content blocks that belong to pages. Flexible JSONB storage.

```sql
cms_sections
├── id (UUID, PK)
├── page_id (UUID, FK) → cms_pages.id
├── section_type (TEXT) - "hero", "features", "steps", "categories", 
│                          "text", "cta", "gallery", "showcase"
├── content (JSONB) - Flexible structure based on section_type
├── order_index (INTEGER) - Determines display order (0, 1, 2, ...)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
└── Indexes:
    ├── page_id (fast section lookup)
    ├── section_type (filter by type)
    └── page_id + order_index (fast ordered sections)
```

---

## Section Types & Content Structure

Each section type has a different content structure (stored as JSONB):

### **1. Hero Section**
Landing hero banner with headline and CTA button.

```json
{
  "headline": "Welcome to UCC IP Office",
  "headline_highlight": "Protect Your Innovation",
  "subheadline": "A comprehensive platform for managing intellectual property",
  "cta_text": "Get Started",
  "cta_link": "/register"
}
```

**Rendered as:**
- Large headline with optional highlighted text in primary color
- Subheadline paragraph
- CTA button linking to specified page

---

### **2. Features Section**
Grid of feature cards with icons and descriptions.

```json
{
  "features": [
    {
      "title": "Easy Submissions",
      "description": "Submit with streamlined forms",
      "icon_bg_color": "bg-blue-100",
      "icon_color": "text-blue-600"
    },
    {
      "title": "Secure Workflow",
      "description": "Multi-level review process"
    }
  ]
}
```

**Rendered as:**
- 3-column responsive grid
- Each card has icon, title, and description
- Color customizable per card

---

### **3. Steps Section**
Sequential process visualization (numbered steps).

```json
{
  "title": "How It Works",
  "steps": [
    {
      "number": 1,
      "label": "Register",
      "description": "Create your account"
    },
    {
      "number": 2,
      "label": "Submit",
      "description": "Upload documents"
    }
  ]
}
```

**Rendered as:**
- Numbered step circles
- Step labels and descriptions
- 4-column responsive grid

---

### **4. Categories Section**
Grid of category tags/pills.

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

**Rendered as:**
- Category tags/badges in grid
- Light blue background
- Responsive columns

---

### **5. Text Section**
HTML content with sanitization. Use for detailed information.

```json
{
  "title": "Who We Are",
  "body": "<h3>Our Mission</h3><p>We protect innovations at UCC...</p><h3>Our Vision</h3><p>To become...</p>"
}
```

**Rendered as:**
- Title heading (h2, 1.5rem, blue, bold)
- Sanitized HTML (h3, h4, links, lists allowed)
- h3 headings styled as: 1.5rem, #1e40af (blue), bold

---

### **6. CTA Section**
Call-to-action banner with background color/gradient and button.

```json
{
  "heading": "Start Your IP Journey Today",
  "description": "Join us in protecting innovations",
  "background_color": "bg-gradient-to-r from-blue-600 to-blue-800",
  "button_text": "Register Now",
  "button_link": "/register"
}
```

**Rendered as:**
- Full-width colored/gradient background
- White text with heading and description
- White button with text
- Can use hex colors (#2563EB) or Tailwind classes (bg-gradient-to-r...)

---

### **7. Gallery Section**
Image grid for showcasing photos.

```json
{
  "title": "Gallery",
  "images": [
    {
      "url": "https://bucket.supabase.co/image1.jpg",
      "alt_text": "Team photo",
      "caption": "Our team at work"
    }
  ]
}
```

**Rendered as:**
- 3-column responsive grid
- Images 300x300px with object-cover
- Optional captions below each image

---

### **8. Showcase Section**
(Optional) Featured items or achievements display.

```json
{
  "title": "Our Achievements",
  "items": [...]
}
```

---

## Data Flow: How Pages Render

### **Scenario 1: User visits ucc-ipo.com (Landing Page)**

```
1. Browser requests localhost:5173/
   ↓
2. React loads LandingPage component
   ↓
3. useEffect hook triggers:
   a) Fetch site_settings from database
   b) Query cms_pages WHERE slug = 'home' AND is_published = true
   c) Fetch ALL cms_sections for that page
      SELECT * FROM cms_sections 
      WHERE page_id = {home_page_id} 
      ORDER BY order_index
   ↓
4. State updates: sections = [hero, features, steps, categories, text, cta, gallery]
   ↓
5. JSX renders: sections.map(section => renderSection(section))
   ↓
6. renderSection() function dispatches to correct renderer:
   - section.section_type === 'hero' → <HeroSection />
   - section.section_type === 'features' → <FeaturesSection />
   - etc.
   ↓
7. Each renderer extracts content from section.content (JSONB)
   and renders HTML with styling
   ↓
8. User sees complete page with all sections in order
```

---

### **Scenario 2: User visits /pages/about-us (Dynamic Public Page)**

```
1. Browser requests localhost:5173/pages/about-us
   ↓
2. React Router matches route to CMSPageRenderer
   ↓
3. useParams extracts slug = "about-us"
   ↓
4. useEffect hook triggers:
   a) Fetch site_settings
   b) Query cms_pages WHERE slug = 'about-us' AND is_published = true
   c) If NOT found: setNotFound(true) → render 404 page
   d) If found: Fetch cms_sections for this page
   ↓
5. Same rendering flow as landing page
   ↓
6. Page renders with sections in order_index sequence
```

---

### **Scenario 3: Admin Creates New Page (Authenticated)**

```
1. Admin logs in → auth.uid() is set
   ↓
2. Admin navigates to Dashboard → Public Pages Manager
   ↓
3. Admin clicks "Create New Page"
   ↓
4. Form: Title, Slug, Content
   ↓
5. Admin submits → Insert into cms_pages
   INSERT INTO cms_pages (title, slug, is_published) 
   VALUES ('Contact Us', 'contact', false)
   ↓
6. RLS Policy Check:
   - CREATE POLICY "cms_pages_write" ON cms_pages
   - WITH CHECK (auth.uid() IS NOT NULL)
   ✓ Authenticated user allowed to insert
   ↓
7. New page created with is_published = false (draft)
   ↓
8. Admin adds sections by clicking "Add Section"
   ↓
9. For each section:
   INSERT INTO cms_sections 
   (page_id, section_type, content, order_index)
   VALUES (...)
   ↓
10. RLS Policy Check:
    - WITH CHECK (auth.uid() IS NOT NULL)
    ✓ Authenticated user allowed
    ↓
11. Admin previews page at /pages/contact (still draft)
    ↓
12. Admin publishes: UPDATE cms_pages SET is_published = true
    ↓
13. Page now visible to public at /pages/contact
```

---

## Row-Level Security (RLS) - Access Control

RLS policies control who can read/write which data.

### **Current Policies:**

**Site Settings:**
```sql
-- Everyone can READ site settings
CREATE POLICY "site_settings_read" 
  ON site_settings FOR SELECT 
  USING (true);

-- Only authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "site_settings_write" 
  ON site_settings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**CMS Pages:**
```sql
-- Published pages readable by all, drafts only to authenticated
CREATE POLICY "cms_pages_public_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true OR auth.uid() IS NOT NULL);

-- Only authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "cms_pages_write" 
  ON cms_pages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**CMS Sections:**
```sql
-- Readable if parent page is published or user is authenticated
CREATE POLICY "cms_sections_public_read" 
  ON cms_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cms_pages 
      WHERE cms_pages.id = cms_sections.page_id 
      AND (cms_pages.is_published = true OR auth.uid() IS NOT NULL)
    )
  );

-- Only authenticated users can INSERT/UPDATE/DELETE
CREATE POLICY "cms_sections_write" 
  ON cms_sections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Frontend Components Structure

```
src/pages/
├── LandingPage.tsx
│   ├── Fetches site_settings
│   ├── Fetches cms_pages (slug='home')
│   ├── Fetches cms_sections (ordered)
│   ├── renderSection() → dispatches to type-specific renderer
│   └── Individual renderers:
│       ├── HeroSection()
│       ├── FeaturesSection()
│       ├── StepsSection()
│       ├── CategoriesSection()
│       ├── TextSection() + DOMPurify sanitization
│       ├── CTASection()
│       └── GallerySection()
│
├── CMSPageRenderer.tsx
│   ├── Dynamic page renderer (same as above)
│   ├── Uses :slug param from URL
│   └── Same section renderers
│
└── Dashboard/
    ├── PublicPages.tsx
    │   ├── List all cms_pages
    │   ├── Edit/Delete/Publish actions
    │   └── "Add Section" button → CMSSectionEditor
    │
    └── CMSSectionEditor.tsx
        ├── JSONB editor for content
        ├── Type selector
        ├── Visual preview
        └── Save/Delete buttons

src/components/
├── PublicNavigation.tsx
│   ├── Fetches all published pages
│   ├── Renders dynamic nav links
│   └── Uses primary_color from settings
│
└── (other components)
```

---

## Key Technologies

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling (including gradients) |
| **Supabase** | Database + Auth + Real-time |
| **PostgreSQL** | Data storage + RLS |
| **DOMPurify** | HTML sanitization (TextSection) |
| **React Router v7** | Client-side routing |
| **Vite v5.4.8** | Build tool |

---

## How to Use the CMS

### **Creating a New Page:**

1. Log in to Dashboard
2. Navigate to "Public Pages"
3. Click "Add Page"
4. Enter:
   - **Title**: "Services" (displayed in nav)
   - **Slug**: "services" (URL: /pages/services)
   - Leave **is_published = false** (draft mode)
5. Click "Create"
6. Click "Add Section" and choose type:
   - **Hero** - Page banner
   - **Features** - Feature cards
   - **Steps** - Process steps
   - **Text** - Detailed content with HTML
   - **Categories** - Tag/pill grid
   - **CTA** - Call-to-action banner
   - **Gallery** - Image grid
7. Fill in content JSON
8. Drag to reorder sections (uses order_index)
9. Click "Publish" when ready
10. Share link: `ucc-ipo.com/pages/services`

---

### **Editing Existing Page:**

1. Dashboard → Public Pages
2. Find page in list
3. Click edit icon
4. Click section to edit
5. Modify JSON content
6. Click "Save Changes"
7. Changes reflect immediately if published

---

### **Content JSON Tips:**

- **Tailwind Classes in CTA**: 
  - `"background_color": "bg-gradient-to-r from-blue-600 to-blue-800"`
  - Or hex colors: `"background_color": "#2563EB"`

- **HTML in Text Section**:
  - Allowed tags: `<h1>` `<h2>` `<h3>` `<p>` `<ul>` `<li>` `<a>` `<strong>` `<em>` `<b>` `<i>` `<br>`
  - Example: `"body": "<h3>Section Title</h3><p>Paragraph text</p><a href='/link'>Link</a>"`

- **Image URLs**:
  - Use Supabase storage URLs
  - Format: `https://bucket.supabase.co/image.jpg`

---

## Site Settings Configuration

Edit in Dashboard → Settings:

```json
{
  "site_name": "University of Caloocan City Intellectual Property Office",
  "tagline": "Protecting Innovation, Promoting Excellence",
  "primary_color": "#2563EB",
  "secondary_color": "#9333EA",
  "logo_url": "https://..."
}
```

- **primary_color**: Used in buttons, headings, CTA sections
- **secondary_color**: Used for accents
- **Changes apply globally** to all pages

---

## Query Performance

All queries have **indexes** for fast lookups:

```sql
-- Fast page lookup by slug
CREATE INDEX idx_cms_pages_slug ON cms_pages(slug);

-- Fast section lookup by page
CREATE INDEX idx_cms_sections_page_id ON cms_sections(page_id);

-- Fast ordered section fetch
CREATE INDEX idx_cms_sections_page_order 
  ON cms_sections(page_id, order_index);

-- Fast published page filtering
CREATE INDEX idx_cms_pages_published 
  ON cms_pages(is_published) 
  WHERE is_published = true;
```

---

## Error Handling

Frontend gracefully handles:

| Error | Handling |
|-------|----------|
| **Database down** | Shows error message, renders DefaultLandingPage |
| **Page not found** | Renders 404 "Page Not Found" |
| **Invalid JSON** | Shows validation error in admin |
| **Failed image load** | Shows broken image placeholder |
| **RLS policy denies access** | Non-auth users can't see drafts |

---

## Summary: The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ADMIN CREATES CONTENT IN DATABASE                             │
│    - cms_pages (title, slug, is_published)                       │
│    - cms_sections (type, content JSONB, order_index)             │
│    - site_settings (branding colors)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│ 2. USER VISITS PUBLIC PAGE                                        │
│    - Browser loads React component                               │
│    - Supabase RLS checks if user can view                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│ 3. COMPONENTS FETCH DATA                                          │
│    - Fetch site_settings (global config)                         │
│    - Fetch cms_pages by slug                                     │
│    - Fetch cms_sections ordered by order_index                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│ 4. REACT RENDERS DYNAMICALLY                                      │
│    - Map sections array                                          │
│    - Switch on section_type                                      │
│    - Render appropriate component                                │
│    - Apply Tailwind styling                                      │
│    - Sanitize HTML if needed                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│ 5. USER SEES COMPLETE PAGE                                        │
│    - All sections rendered in order                              │
│    - Styling from Tailwind + site_settings colors                │
│    - Responsive design on all devices                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Advantages of This CMS

✅ **No-Code Page Building** - Create pages without touching React/HTML  
✅ **Dynamic Content** - Change site content without redeploying  
✅ **Flexible Sections** - Mix and match any section types  
✅ **Responsive Design** - All sections work on mobile/tablet/desktop  
✅ **Secure by Default** - RLS prevents unauthorized access  
✅ **Real-time Updates** - Changes appear instantly  
✅ **Version Tracking** - created_at/updated_at timestamps  
✅ **Draft Support** - Publish when ready, not before  
✅ **Reusable Components** - Same renderers across all pages  

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not appearing | Check `is_published = true` |
| Section not showing | Verify section_type in content |
| Images not loading | Check Supabase URL format |
| Styling looks wrong | Verify Tailwind class names |
| Can't edit page | Check authentication status |
| Heading colors wrong | Verify primary_color in settings |

---

**Created:** January 30, 2026  
**CMS Version:** 1.0 Complete  
**Status:** Production Ready ✅
