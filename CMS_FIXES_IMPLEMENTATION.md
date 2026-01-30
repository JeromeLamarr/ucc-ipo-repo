# CMS Implementation - Critical Fixes (Implementation Guide)

## Execution Plan

This document provides copy-paste ready fixes for all critical issues found in the CMS code review.

---

## Fix #1: RLS Policies Admin Role Check

**File:** `supabase/migrations/create_cms_tables.sql`

**Current Status:** Uses `(SELECT role FROM users WHERE id = auth.uid()) = 'admin'` which fails

**Action Required:** Identify your actual auth structure first

### Step 1: Verify Your Auth Structure

Run this query in Supabase SQL Editor to see what you have:

```sql
-- Check what you have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'users', 'user_profiles');

-- If you have a profiles table, check its structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check if role is in auth.users metadata
SELECT id, raw_user_meta_data ->> 'role' as role 
FROM auth.users LIMIT 1;
```

### Step 2: Apply the Correct Fix

**If you have a `profiles` table with a `role` column:**

Replace lines 136-145 in the migration with:

```sql
-- SITE_SETTINGS POLICIES: Anyone can read, only admins can write
CREATE POLICY "site_settings_public_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

**Then apply the same pattern to cms_pages and cms_sections:**

```sql
-- CMS_PAGES POLICIES
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- CMS_SECTIONS POLICIES
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
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

---

## Fix #2: CMSPageRenderer - Add Null Guards for Sections

**File:** `src/pages/CMSPageRenderer.tsx`

Replace the `fetchPageData` function:

```tsx
const fetchPageData = async () => {
  try {
    setLoading(true);
    setNotFound(false);

    // Fetch page by slug (published only)
    const { data: pageData, error: pageError } = await supabase
      .from('cms_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (pageError || !pageData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPage(pageData);

    // Fetch sections for this page
    const { data: sectionsData, error: sectionsError } = await supabase
      .from('cms_sections')
      .select('*')
      .eq('page_id', pageData.id)
      .order('order_index', { ascending: true });

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      // Use empty array instead of null
      setSections([]);
    } else {
      setSections(sectionsData || []);
    }

    // Fetch site settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError) {
      console.warn('Error fetching settings, using defaults:', settingsError);
    } else if (settingsData) {
      setSettings({
        site_name: settingsData.site_name || DEFAULT_SITE_SETTINGS.site_name,
        tagline: settingsData.tagline || DEFAULT_SITE_SETTINGS.tagline,
        primary_color: settingsData.primary_color || DEFAULT_SITE_SETTINGS.primary_color,
        secondary_color: settingsData.secondary_color || DEFAULT_SITE_SETTINGS.secondary_color,
        logo_url: settingsData.logo_url,
      });
    }
  } catch (err) {
    console.error('Error fetching page data:', err);
    setNotFound(true);
  } finally {
    setLoading(false);
  }
};
```

And update the render section to handle empty sections array safely:

```tsx
{sections && sections.length > 0 ? (
  sections.map((section) => (
    <SectionRenderer key={section.id} section={section} settings={settings} />
  ))
) : (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
    <p className="text-gray-600">No sections published for this page.</p>
  </div>
)}
```

---

## Fix #3: Move getIconComponent Function

**File:** `src/pages/CMSPageRenderer.tsx`

Move the `getIconComponent` function to the TOP of the file, right after imports and before any component definitions:

```tsx
import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicNavigation } from '../components/PublicNavigation';

// ... interfaces ...

// ← ADD THIS HERE, before any component definitions
function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    FileText: '📄',
    Shield: '🛡️',
    TrendingUp: '📈',
    Users: '👥',
    Settings: '⚙️',
    CheckCircle: '✓',
  };
  return iconMap[iconName] || '●';
}

export function CMSPageRenderer() {
  // ... rest of component
}

// ... other functions ...
```

Remove the duplicate definition at the end of the file.

---

## Fix #4: Fix PageSectionsManagement Batch Update

**File:** `src/pages/PageSectionsManagement.tsx`

Replace the `handleMoveSection` function:

```tsx
const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
  const sectionIndex = sections.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) return;

  if (direction === 'up' && sectionIndex === 0) return;
  if (direction === 'down' && sectionIndex === sections.length - 1) return;

  const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
  const section = sections[sectionIndex];
  const targetSection = sections[targetIndex];

  setReordering(sectionId);
  setError(null);

  try {
    // Update the moving section
    const { error: err1 } = await supabase
      .from('cms_sections')
      .update({ order_index: targetSection.order_index })
      .eq('id', sectionId);

    if (err1) throw err1;

    // Update the target section
    const { error: err2 } = await supabase
      .from('cms_sections')
      .update({ order_index: section.order_index })
      .eq('id', targetSection.id);

    if (err2) throw err2;

    // Re-fetch to maintain correct order
    await fetchPageAndSections();
    setSuccess(`Section moved ${direction}`);

    setTimeout(() => setSuccess(null), 3000);
  } catch (err: any) {
    console.error('Error reordering sections:', err);
    setError(err.message || 'Failed to reorder sections');
  } finally {
    setReordering(null);
  }
};
```

---

## Fix #5: Add Admin Role Check to Management Components

**File:** `src/pages/PublicPagesManagement.tsx`

Add this import at the top:

```tsx
import { useAuth } from '../contexts/AuthContext';
```

Add this check inside the component function, right after the state declarations:

```tsx
export function PublicPagesManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();  // ← Add this
  
  const [pages, setPages] = useState<CMSPage[]>([]);
  // ... rest of state ...

  // ADD THIS CHECK
  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">Only administrators can manage CMS pages.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Rest of component continues...
  return (
    <div>
      {/* existing content */}
    </div>
  );
};
```

**Apply the same fix to:** `src/pages/PageSectionsManagement.tsx`

---

## Fix #6: Resolve Slug Mismatch

**File:** `src/pages/LandingPage.tsx` (OPTION B - RECOMMENDED)

Change line 67:

```tsx
// FROM:
const { data: pageData, error: pageError } = await supabase
  .from('cms_pages')
  .select('id')
  .eq('slug', 'home')  // ← Change this
  .eq('is_published', true)
  .single();

// TO:
const { data: pageData, error: pageError } = await supabase
  .from('cms_pages')
  .select('id')
  .eq('slug', 'landing')  // ← Match the migration
  .eq('is_published', true)
  .single();
```

This matches what the migration creates: `'landing'` slug, not `'home'`.

---

## Fix #7: Sanitize dangerouslySetInnerHTML

**File:** `src/pages/CMSPageRenderer.tsx`

### Step 1: Install DOMPurify

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### Step 2: Update the TextSection function

Replace the entire `TextSection` function:

```tsx
import DOMPurify from 'dompurify';

function TextSection({ content }: { content: Record<string, any> }) {
  const alignment = content.alignment || 'left';
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment] || 'text-left';

  // Sanitize HTML to prevent XSS
  const sanitizedBody = DOMPurify.sanitize(content.body || '', {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className={`max-w-3xl ${alignment === 'center' ? 'mx-auto' : ''}`}>
        {content.title && (
          <h2 className={`text-3xl font-bold mb-4 ${alignClass}`}>{content.title}</h2>
        )}
        <div
          className={`prose prose-lg ${alignClass}`}
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
      </div>
    </div>
  );
}
```

---

## Testing Checklist After Fixes

```
[ ] RLS policies test:
    - [ ] Admin can create page
    - [ ] Admin can edit page
    - [ ] Admin can delete page
    - [ ] Non-admin cannot create page
    - [ ] Non-admin cannot edit page

[ ] CMSPageRenderer tests:
    - [ ] Page loads without errors
    - [ ] Sections render correctly
    - [ ] Graceful fallback if no sections
    - [ ] Icons render correctly

[ ] PageSectionsManagement tests:
    - [ ] Can reorder sections up
    - [ ] Can reorder sections down
    - [ ] Sections maintain correct order after page reload

[ ] Admin access control:
    - [ ] Admin can access /dashboard/public-pages
    - [ ] Non-admin redirected from /dashboard/public-pages
    - [ ] Non-admin redirected from /dashboard/public-pages/:pageId

[ ] Landing page:
    - [ ] CMS hero section loads (if published)
    - [ ] Uses fallback if no CMS hero
    - [ ] Logo and navigation display correctly

[ ] Security:
    - [ ] Cannot inject HTML into text sections
    - [ ] XSS attempts are sanitized
```

---

## Deployment Steps

1. **Update migration** - Fix RLS policies
2. **Update component files** - Apply all 7 fixes
3. **Run tests** - Verify fixes work
4. **Deploy** - Merge to main branch

---

