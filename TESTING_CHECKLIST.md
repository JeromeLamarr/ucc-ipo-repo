# RLS Fix Testing Checklist ✅

**Date:** January 30, 2026
**Status:** Ready for Testing
**Target:** Verify admin CMS access works, public pages load, security maintained

---

## Quick Start (5 minutes)

### 1️⃣ Apply the Fix
- [ ] Open Supabase SQL Editor
- [ ] Copy SQL from `CORRECTED_CMS_TABLES_MIGRATION.sql`
- [ ] Run the migration
- [ ] Verify: All DROP and CREATE statements succeed

### 2️⃣ Test Admin CMS
- [ ] Sign in as admin user
- [ ] Go to `/dashboard/public-pages`
- [ ] Create test page (`test-page` slug)
- [ ] ✅ Page created (no 403 error)
- [ ] Add hero section to page
- [ ] ✅ Section added (no RLS error)
- [ ] Update page title
- [ ] ✅ Update succeeds
- [ ] Publish page
- [ ] ✅ Status changes to Published
- [ ] Delete test page
- [ ] ✅ Page deleted

### 3️⃣ Test Public Pages
- [ ] Create new page as admin: `public-test` slug
- [ ] Add hero section with content
- [ ] Publish the page
- [ ] **Open private/incognito window** (not logged in)
- [ ] Navigate to `/pages/public-test`
- [ ] ✅ Page loads without auth required
- [ ] ✅ Content displays correctly
- [ ] Go to home page `/`
- [ ] ✅ Page link appears in navigation
- [ ] Try to access unpublished page at `/pages/unpublished-slug`
- [ ] ✅ Access denied / redirects to home

### 4️⃣ Test Security
- [ ] Create non-admin test user
- [ ] Sign in as non-admin
- [ ] Try to access `/dashboard/public-pages`
- [ ] ✅ Route is protected (403 or redirect)
- [ ] Verify in database: non-admin cannot INSERT into cms_pages

---

## Detailed Test Cases

### Admin Access Tests
- [ ] **TC-001:** Admin creates page → **Expected:** 200 OK, page created
- [ ] **TC-002:** Admin updates page → **Expected:** 200 OK, page updated
- [ ] **TC-003:** Admin deletes page → **Expected:** 200 OK, page deleted
- [ ] **TC-004:** Admin adds section → **Expected:** 200 OK, section created
- [ ] **TC-005:** Admin publishes page → **Expected:** 200 OK, is_published = true

### Public Access Tests
- [ ] **TC-006:** Public GETs published page → **Expected:** 200 OK, content visible
- [ ] **TC-007:** Public sees page in navigation → **Expected:** Link in nav, clickable
- [ ] **TC-008:** Unauthenticated accesses `/pages/:slug` → **Expected:** Works without login
- [ ] **TC-009:** Unpublished page not accessible → **Expected:** 404 or redirect
- [ ] **TC-010:** Public page appears after publishing → **Expected:** Visible immediately

### Security Tests
- [ ] **TC-011:** Non-admin tries to INSERT → **Expected:** 403 Forbidden (RLS)
- [ ] **TC-012:** Non-admin tries to UPDATE → **Expected:** 403 Forbidden (RLS)
- [ ] **TC-013:** Non-admin tries to DELETE → **Expected:** 403 Forbidden (RLS)
- [ ] **TC-014:** is_admin() function exists → **Expected:** Query returns boolean
- [ ] **TC-015:** RLS enabled on all tables → **Expected:** rowsecurity = true

---

## Database Verification Queries

**Run these in Supabase SQL Editor:**

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cms_pages', 'cms_sections', 'site_settings');

-- Verify is_admin() function
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'is_admin' AND routine_schema = 'public';

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('cms_pages', 'cms_sections', 'site_settings');

-- Verify policies reference is_admin()
SELECT policyname, with_check FROM pg_policies 
WHERE tablename = 'cms_pages' AND policyname LIKE '%insert%';
```

---

## Test Results

**Date Tested:** __________  
**Tested By:** __________  
**Environment:** Local / Staging / Production

### Results Summary
- [ ] All admin tests pass (100% ✅)
- [ ] All public tests pass (100% ✅)
- [ ] All security tests pass (100% ✅)
- [ ] All database verifications pass (100% ✅)

### Issues Found
_List any failures and their resolution:_
```
[Issue 1]: ...
[Resolution]: ...

[Issue 2]: ...
[Resolution]: ...
```

### Sign-Off
- [ ] All tests completed
- [ ] All tests passed
- [ ] Ready to commit
- [ ] Reviewed by: __________

---

## Commit Command

```bash
# Stage migration file
git add supabase/migrations/

# Stage documentation
git add RLS_POLICY_*.md CORRECTED_CMS_TABLES_MIGRATION.sql TEST_RLS_FIX.md TESTING_CHECKLIST.md

# Commit with provided message
git commit -m "fix(rls): correct admin role check for CMS access

- Fix admin role check to reference auth_user_id instead of id column
- Uses existing is_admin() SECURITY DEFINER function
- Maintains published-only access for public users
- All RLS policies now correctly enforce admin-only write access
- Database-level security enforcement prevents frontend bypass
- Verified: Admin can create/update/delete CMS content
- Verified: Public can only view published pages
- Zero breaking changes to existing functionality"

# Push to repository
git push origin fix/cms-rls-policies
```

---

## Sign-Off

When all tests pass and results are documented:

```
✅ Testing Complete - Ready to Merge
✅ Admin CMS Access - Verified Working
✅ Public Page Loading - Verified Working
✅ Security Enforcement - Verified Working
✅ RLS Policies - Verified Correct
```

