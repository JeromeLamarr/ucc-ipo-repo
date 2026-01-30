# RLS Policy Fix - Testing & Verification Guide

**Date:** January 30, 2026  
**Purpose:** Verify that the RLS policy fix correctly enables admin CMS access while maintaining security

---

## Pre-Test Checklist

- [ ] You have admin access to your Supabase dashboard
- [ ] You have an admin user account (with `role = 'admin'` in users table)
- [ ] You have a test user account (with `role = 'applicant'` or other non-admin role)
- [ ] Your app is running locally or deployed to a testing environment
- [ ] You have the Supabase SQL Editor open

---

## Step 1: Apply the RLS Policy Fix

**Duration:** 2-3 minutes

### Option A: SQL Editor (Fastest)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste **EXACTLY** from [CORRECTED_CMS_TABLES_MIGRATION.sql](CORRECTED_CMS_TABLES_MIGRATION.sql)
5. Click **RUN**
6. Expected result: All DROP and CREATE statements execute successfully

### Option B: Migration File

If you prefer using migrations:

1. Save [CORRECTED_CMS_TABLES_MIGRATION.sql](CORRECTED_CMS_TABLES_MIGRATION.sql) as:
   ```
   supabase/migrations/20260130_fix_cms_rls_policies.sql
   ```

2. Push to Supabase:
   ```bash
   supabase db push
   ```

3. Verify in Supabase dashboard → SQL Editor → Run any test query

---

## Step 2: Verify Tables Exist

**Duration:** 1 minute

Run this query in Supabase SQL Editor to confirm tables and policies are in place:

```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cms_pages', 'cms_sections', 'site_settings')
ORDER BY table_name;
```

**Expected Result:**
```
table_name
-----------
cms_pages
cms_sections
site_settings
```

---

## Step 3: Test Admin CMS Access

**Duration:** 5-10 minutes

### A. Test Admin Can Create a Page

1. **Sign in as admin user** to your app
2. **Open browser DevTools** → Network tab
3. **Navigate to:** `/dashboard/public-pages`
4. **Create a test page:**
   - Click "Create Page" button
   - Title: `Test Admin Access`
   - Slug: `test-admin-access`
   - Click Create

5. **Expected Result:**
   - ✅ Form submits without errors
   - ✅ No 403 Forbidden error in Network tab
   - ✅ Page appears in the list with status "Draft"
   - ✅ Console shows no RLS errors

6. **If it fails:**
   - Check Network tab for status code (should be 200, not 403)
   - Open browser console for error messages
   - Verify you're signed in as an admin user
   - See **Troubleshooting** section below

### B. Test Admin Can Add Content Sections

1. **Click "Edit" on the page you just created**
2. **Should redirect to:** `/dashboard/public-pages/[page-id]`
3. **Add a section:**
   - Click "Add Section"
   - Select section type: `hero`
   - Content should appear as JSON template:
     ```json
     {
       "headline": "Your Headline",
       "subheadline": "Your Subheadline",
       "cta_text": "Learn More",
       "cta_link": "/pages/test"
     }
     ```
   - Modify headline: `Admin Access Verified`
   - Click Save

4. **Expected Result:**
   - ✅ Section added without errors
   - ✅ Section appears in the list with order index
   - ✅ No 403 Forbidden errors
   - ✅ Content saved to database

### C. Test Admin Can Update a Page

1. **Go back to page list:** `/dashboard/public-pages`
2. **Click on the page to edit it**
3. **Update title:** `Test Admin Access - Updated`
4. **Click Save**

5. **Expected Result:**
   - ✅ Update succeeds immediately
   - ✅ Page list refreshes with new title
   - ✅ No RLS errors in console

### D. Test Admin Can Publish a Page

1. **In page details, click "Publish" button**
2. **Confirm the publish action**

3. **Expected Result:**
   - ✅ Status changes from "Draft" to "Published"
   - ✅ Page is_published = true in database
   - ✅ No errors

### E. Test Admin Can Delete a Page

1. **In page list, find the test page**
2. **Click Delete button**
3. **Confirm deletion**

4. **Expected Result:**
   - ✅ Page removed from list
   - ✅ Deleted from cms_pages table
   - ✅ All associated sections deleted (CASCADE)

---

## Step 4: Test Public Page Loading

**Duration:** 5 minutes

### A. Create and Publish a Public Page

1. **As admin, create a new page:**
   - Title: `Public Test Page`
   - Slug: `public-test-page`
   - Click Create

2. **Add a hero section** with content:
   ```json
   {
     "headline": "This is a Public Test Page",
     "subheadline": "Visible to everyone",
     "cta_text": "Click Me",
     "cta_link": "/pages/another-page"
   }
   ```

3. **Publish the page** (set is_published = true)

### B. Test Public Can View Published Page

1. **Open a NEW INCOGNITO/PRIVATE browser window** (not logged in)
2. **Navigate to:** `http://localhost:5173/pages/public-test-page`
   - (Adjust port if different, use production URL if deployed)

3. **Expected Result:**
   - ✅ Page loads without errors
   - ✅ Hero section displays with your headline
   - ✅ "This is a Public Test Page" appears on page
   - ✅ Layout and styling look correct
   - ✅ No authentication required

### C. Test Published Page Appears in Navigation

1. **Still in incognito window, go to home:** `http://localhost:5173/`
2. **Check the navigation bar at top**

3. **Expected Result:**
   - ✅ Navigation shows "Public Test Page" as a link
   - ✅ Link goes to `/pages/public-test-page`
   - ✅ Clicking it loads the published page

### D. Test Unpublished Pages Don't Show

1. **As admin, create another page but DON'T publish it:**
   - Title: `Secret Unpublished Page`
   - Slug: `secret-page`
   - Leave is_published = false
   - Click Create

2. **In incognito window, try to access:** `http://localhost:5173/pages/secret-page`

3. **Expected Result:**
   - ✅ Page redirects to home (404 behavior)
   - ✅ Unpublished page is not accessible
   - ✅ No data leak in browser console

---

## Step 5: Test Non-Admin Access Control

**Duration:** 5 minutes

### A. Create a Non-Admin Test User

1. **Go to Supabase dashboard → SQL Editor**
2. **Run this query to see all users:**
   ```sql
   SELECT id, auth_user_id, email, role FROM users ORDER BY created_at DESC LIMIT 10;
   ```

3. **Or create a test user via the app:**
   - Sign up with test email: `nonAdmin@test.com`
   - This creates a user with `role = 'applicant'`

### B. Test Non-Admin Cannot Modify CMS

1. **Sign out and sign in as the non-admin user**
2. **Try to access:** `/dashboard/public-pages`

3. **Expected Result:**
   - ✅ Route is protected (redirects to dashboard or login)
   - OR ❌ Shows pages but buttons are disabled
   - ❌ Cannot create/edit/delete pages

4. **If you get access to the page list:**
   - Try to create a page via Network tab (using fetch API)
   - Expected: 403 Forbidden error from RLS policy
   - Database blocks the INSERT, not just frontend

---

## Step 6: Database-Level Verification

**Duration:** 3 minutes

### A. Verify is_admin() Function

Run in Supabase SQL Editor:

```sql
-- Check that is_admin() function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'is_admin'
AND routine_schema = 'public';
```

**Expected Result:**
```
routine_name | routine_type | data_type
is_admin     | FUNCTION     | boolean
```

### B. Verify RLS Policies Are Enabled

```sql
-- Check that RLS is enabled on CMS tables
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cms_pages', 'cms_sections', 'site_settings')
ORDER BY tablename;
```

**Expected Result:**
```
tablename     | rowsecurity
cms_pages     | t (true)
cms_sections  | t (true)
site_settings | t (true)
```

### C. Verify Admin Policies Exist

```sql
-- Check that admin INSERT policy exists
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'cms_pages'
AND policyname LIKE '%admin%'
ORDER BY tablename, policyname;
```

**Expected Result:**
```
schemaname | tablename | policyname
public     | cms_pages | cms_pages_admin_delete
public     | cms_pages | cms_pages_admin_insert
public     | cms_pages | cms_pages_admin_update
```

---

## Troubleshooting

### Issue: 403 Forbidden When Creating Page

**Cause:** RLS policy still references wrong column

**Fix:**
1. Check the migration was applied correctly
2. Verify policies reference `is_admin()` function (not broken `WHERE id = auth.uid()`)
3. Re-run the CORRECTED_CMS_TABLES_MIGRATION.sql

```sql
-- Check current policies
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'cms_pages'
AND policyname LIKE '%insert%';
```

**Should show:**
- policyname: `cms_pages_admin_insert`
- with_check should reference `is_admin()`, NOT `(SELECT role FROM users WHERE id = auth.uid())`

### Issue: Admin Can Create But Update Fails

**Cause:** Likely UPDATE policy uses old syntax

**Fix:**
```sql
-- Drop and recreate UPDATE policies
DROP POLICY IF EXISTS "cms_pages_admin_update" ON cms_pages;
CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE 
  USING (is_admin()) WITH CHECK (is_admin());
```

### Issue: Public Can't See Published Pages

**Cause:** SELECT policies not configured

**Fix:**
```sql
-- Check that published-read policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'cms_pages' 
AND policyname LIKE '%read%';

-- Should see cms_pages_published_read with condition: is_published = true
```

### Issue: Page Loads But No Content Shows

**Cause:** is_admin() function may not exist or has wrong implementation

**Fix:**
```sql
-- Verify function implementation
SELECT pg_get_functiondef('is_admin()'::regprocedure);

-- Should return function body using auth_user_id, not id
```

---

## Test Results Summary

After completing all tests, document your results:

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Admin creates page | ✅ Success | | |
| Admin updates page | ✅ Success | | |
| Admin deletes page | ✅ Success | | |
| Admin publishes page | ✅ Success | | |
| Admin adds sections | ✅ Success | | |
| Public views published page | ✅ Success | | |
| Published page in nav | ✅ Success | | |
| Unpublished page hidden | ✅ Success | | |
| Non-admin blocked from CMS | ✅ Blocked (403) | | |
| is_admin() function exists | ✅ Exists | | |
| RLS policies enabled | ✅ Enabled | | |

---

## Success Criteria

✅ **All tests pass** when:
- Admin can create/read/update/delete CMS pages and sections
- Public can view published pages via `/pages/:slug`
- Published pages appear in navigation
- Unpublished pages are NOT accessible
- Non-admin users cannot modify CMS data
- Database shows RLS policies using `is_admin()` function

✅ **Ready to commit** when all tests pass

---

## Next Steps

1. ✅ Run all tests above
2. ✅ Document results in the table above
3. ✅ Fix any failures using troubleshooting guide
4. ✅ Commit with message: `fix(rls): correct admin role check for CMS access`
5. ✅ Merge to main branch after peer review

