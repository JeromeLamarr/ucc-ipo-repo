# Landing Page CMS Content Verification - Testing Guide

**Date:** January 30, 2026  
**Objective:** Verify that CMS content now renders on the landing page after slug fix  
**Status:** Ready for testing

---

## Pre-Testing Checklist

- [ ] Slug mismatch fix applied (2 migration files updated)
- [ ] cmsConstants.ts created in src/constants/
- [ ] Application running: `npm run dev`
- [ ] Supabase migration applied
- [ ] Database has home page with slug='home'

---

## Step 1: Verify Database Setup

**Run in Supabase SQL Editor:**

```sql
-- Check that home page exists with correct slug
SELECT id, slug, title, is_published FROM cms_pages WHERE slug = 'home' LIMIT 1;
```

**Expected Result:**
```
id                   | slug | title     | is_published
[uuid]              | home | Home Page | true
```

---

## Step 2: Start the Application

```bash
# Terminal
npm run dev

# Expected output:
# ➜ Local: http://localhost:5173/
# ➜ press h + enter to show help
```

---

## Step 3: Test Landing Page Without CMS Content

**Before adding CMS content:**

1. Open browser: `http://localhost:5173/`
2. Check browser console (F12)
3. Look for: "Home page not found in CMS" warning
4. Expected: Landing page displays with **hardcoded fallback** hero section
5. Hero text should show:
   - "University Intellectual Property Management System" (hardcoded)
   - "Streamline your intellectual property..." (hardcoded)

---

## Step 4: Create CMS Home Page Content

**Option A: Use Admin Dashboard (if available)**

1. Sign in as admin
2. Go to: `http://localhost:5173/dashboard/public-pages`
3. Look for "Home Page" entry
4. Click "Edit" button
5. Verify sections: hero, features, steps, categories
6. Confirm is_published = true
7. Click on the page in the list to edit

**Option B: Create via Supabase SQL (Direct)**

```sql
-- Add test hero content to home page
DO $$
DECLARE
  home_page_id UUID;
BEGIN
  SELECT id INTO home_page_id FROM cms_pages WHERE slug = 'home' LIMIT 1;
  
  IF home_page_id IS NOT NULL THEN
    -- Update or insert hero section with test content
    DELETE FROM cms_sections WHERE page_id = home_page_id AND section_type = 'hero';
    
    INSERT INTO cms_sections (
      page_id,
      section_type,
      content,
      order_index
    ) VALUES (
      home_page_id,
      'hero',
      jsonb_build_object(
        'headline', '✅ CMS CONTENT LOADED - SLUG FIX WORKS!',
        'subheadline', 'This hero text is from the CMS database, not hardcoded. If you see this, the slug mismatch is fixed!',
        'cta_text', 'Confirm Fix',
        'cta_link', '#'
      ),
      0
    );
  END IF;
END $$;
```

---

## Step 5: Reload Landing Page

**In browser:**

1. Go to: `http://localhost:5173/`
2. **Hard refresh:** Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Check browser console (F12)
4. Open DevTools → Network tab
5. Look for Supabase queries

---

## Step 6: Visual Verification

**After reload, verify you see:**

### ✅ SUCCESS - CMS Content Rendered
- [ ] Hero section headline: **"✅ CMS CONTENT LOADED - SLUG FIX WORKS!"**
- [ ] Subheadline: **"This hero text is from the CMS database..."**
- [ ] Button text: **"Confirm Fix"**
- [ ] No console errors
- [ ] No "Home page not found in CMS" warning

### ❌ FAILURE - Hardcoded Fallback (Slug mismatch still exists)
- [ ] Hero shows: "University Intellectual Property Management System"
- [ ] Console shows: "Home page not found in CMS" warning
- [ ] CMS content didn't load

---

## Step 7: Browser Console Verification

**Open DevTools (F12) → Console tab:**

### ✅ Success Output
```
No warnings or errors related to CMS home page
(You may see other unrelated messages)
```

### ❌ Failure Output (if slug mismatch not fixed)
```
Home page not found in CMS
```

---

## Step 8: Network Traffic Verification

**Open DevTools → Network tab:**

1. Reload page: F5
2. Look for requests to: `/rest/v1/cms_pages`
3. Query string should contain: `slug.eq.home`
4. Check response:
   - **Success:** Returns an array with one object (id, slug, title, etc.)
   - **Failure:** Returns empty array `[]`

---

## Step 9: Code Verification

**Check that code is using correct slug:**

Open `src/pages/LandingPage.tsx` around line 78:

```typescript
// SHOULD show:
.eq('slug', 'home')

// NOT:
.eq('slug', 'landing')
```

---

## Step 10: Constants File Verification

**Verify cmsConstants.ts exists:**

```bash
ls -la src/constants/cmsConstants.ts
```

**Should output:**
```
-rw-r--r-- ...  src/constants/cmsConstants.ts
```

**Verify it exports CMS_PAGES constant:**

```bash
grep -n "export const CMS_PAGES" src/constants/cmsConstants.ts
```

**Should show:**
```
23: export const CMS_PAGES = {
24:   HOME: 'home',
```

---

## Troubleshooting

### Problem: Still Seeing Hardcoded Content

**Causes & Fixes:**

1. **Migration not applied**
   ```bash
   # Check Supabase dashboard → SQL Editor
   # Run: SELECT slug FROM cms_pages WHERE title LIKE '%Home%';
   # If returns: 'landing' → Migration not applied or old version
   # Fix: Apply CORRECTED_CMS_TABLES_MIGRATION.sql
   ```

2. **Database cache**
   ```bash
   # Clear Supabase cache
   # Restart application: Stop npm run dev, then restart
   ```

3. **Slug value wrong**
   ```sql
   -- Check exact slug value
   SELECT slug, LENGTH(slug) as slug_length FROM cms_pages WHERE id LIKE '%home%';
   -- Verify: slug = 'home' (exactly, no spaces)
   ```

4. **Page not published**
   ```sql
   -- Check is_published
   SELECT is_published FROM cms_pages WHERE slug = 'home';
   -- Should return: true
   ```

### Problem: Console Shows "Home page not found"

**This means:** Query returned NULL → Slug mismatch still exists

**Fix:**
```sql
-- Verify migration ran with 'home' slug
SELECT slug FROM cms_pages WHERE slug IN ('home', 'landing');

-- If you see 'landing': Migration didn't apply correctly
-- If you see 'home': Code is still querying 'landing'

-- Check frontend code:
grep -n "eq('slug'" src/pages/LandingPage.tsx
# Should show: .eq('slug', 'home')
```

---

## Success Checklist

✅ **All Indicators Present:**
- [ ] Landing page loads without errors
- [ ] Hero section shows test CMS content (not hardcoded)
- [ ] Console has no "Home page not found" warning
- [ ] Network shows successful `/cms_pages` query
- [ ] Query uses `slug.eq.home` parameter
- [ ] Database shows `slug='home'` (not 'landing')
- [ ] cmsConstants.ts file exists and exports CMS_PAGES
- [ ] Code uses 'home' slug (not 'landing')

**If all checkboxes pass: 🟢 SLUG FIX VERIFIED - READY TO COMMIT**

---

## Git Commit After Verification

```bash
# 1. Stage the changes
git add supabase/migrations/create_cms_tables.sql
git add CORRECTED_CMS_TABLES_MIGRATION.sql
git add src/constants/cmsConstants.ts
git add CMS_SLUG_MISMATCH_FIX.md
git add CMS_SLUG_MISMATCH_DETAILED_CHANGES.md
git add CMS_SLUG_MISMATCH_LINE_BY_LINE.md

# 2. Check what will be committed
git status

# 3. Commit with provided message
git commit -m "fix(cms): align landing page slug with CMS data

- Update migration seed data: use canonical 'home' slug
- Rename variables: landing_page_id → home_page_id for clarity
- Create src/constants/cmsConstants.ts for type-safe slug references
- Add slug validation helpers and migration guide

ROOT CAUSE: Frontend queries slug='home' but database created 'landing'
This mismatch prevented CMS content from displaying on the landing page.

VERIFICATION:
- Landing page now loads CMS hero content correctly
- No 'Home page not found in CMS' console warnings
- Database queries return expected results
- All slug references use canonical 'home' value

PREVENTION:
- New cmsConstants.ts provides centralized slug definitions
- TypeScript type-safety prevents future hardcoded slug mismatches
- Comprehensive migration guide for adding new CMS pages

TESTING:
- Landing page renders CMS hero section
- Console shows no RLS or query errors
- Network requests use correct slug parameter
- Fallback to hardcoded content no longer needed"

# 4. Verify commit
git log -1 --stat

# 5. Push to repository
git push origin main
# (or feature branch: git push origin fix/cms-slug-alignment)
```

---

## Expected Commit Output

```bash
[main abc1234] fix(cms): align landing page slug with CMS data
 3 files changed, 250 insertions(+), 8 deletions(-)
 create mode 100644 src/constants/cmsConstants.ts
 modify supabase/migrations/create_cms_tables.sql
 modify CORRECTED_CMS_TABLES_MIGRATION.sql
```

---

## After Commit

### Team Notification
```
✅ CMS Slug Mismatch Fixed

The landing page now correctly loads CMS content.

Changes:
- Fixed 'landing' → 'home' slug mismatch in database
- Created cmsConstants.ts for type-safe slug references
- Verified landing page renders CMS hero content

Migration: Apply CORRECTED_CMS_TABLES_MIGRATION.sql
```

### Documentation Update
- Update team wiki/docs pointing to CMS_SLUG_MISMATCH_FIX.md
- Add cmsConstants.ts to onboarding guide
- Update code review checklist to require constant usage

---

## Final Verification (After Commit)

```bash
# Verify commit was created
git log --oneline | head -1
# Should show: fix(cms): align landing page slug with CMS data

# Verify files are in commit
git show --name-only | head -10
# Should list: create_cms_tables.sql, CORRECTED_CMS_TABLES_MIGRATION.sql, cmsConstants.ts

# Verify push succeeded
git log origin/main --oneline | head -1
# Should match your local commit
```

---

**Status: 🟢 READY FOR TESTING & COMMIT**

Follow steps 1-10 above, then commit when verification passes.

