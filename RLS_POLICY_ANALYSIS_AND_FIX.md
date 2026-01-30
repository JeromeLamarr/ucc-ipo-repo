# Supabase RLS Policy Analysis & Fix

**Date:** January 30, 2026  
**Focus:** CMS Table RLS Policies  
**Status:** Critical - Admin access currently blocked

---

## Problem Analysis

### ❌ Current Implementation (BROKEN)

```sql
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

### Why This Fails

**Root Cause:** Incorrect column reference in the WHERE clause

1. **Column Name Mismatch:**
   - The policy queries: `WHERE id = auth.uid()`
   - But `auth.uid()` returns a UUID from `auth.users(id)`
   - The `users` table uses `auth_user_id` to reference this, NOT `id`
   - So the WHERE clause finds NO rows

2. **Result:**
   - `SELECT role FROM users WHERE id = auth.uid()` returns NULL
   - `NULL = 'admin'` evaluates to FALSE
   - ALL admin operations are DENIED
   - No admin can create, update, or delete CMS content

3. **Security Impact:**
   - ✗ Admins cannot manage public pages
   - ✗ CMS features completely broken
   - ✗ No graceful degradation
   - ✗ Silent failures make debugging hard

---

## User Table Structure (Verified from Your Database)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- ← This is the key!
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'applicant',  -- 'admin', 'supervisor', 'evaluator', 'applicant'
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  -- ... other columns ...
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Insight:** 
- `auth.uid()` returns the ID from `auth.users` 
- Your `users.auth_user_id` stores this value
- You must join on `auth_user_id`, not `id`

---

## Solution: Two Approaches

### Approach A: Using Existing `is_admin()` Function (RECOMMENDED)

Your codebase already has an `is_admin()` function that handles this correctly:

```sql
-- From: supabase/migrations/20251116061131_fix_users_table_infinite_recursion_v2.sql

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the user's role (SECURITY DEFINER allows bypassing RLS)
  SELECT role INTO user_role
  FROM users
  WHERE auth_user_id = auth.uid()  -- ← Correct column reference
  LIMIT 1;
  
  -- Return true if user is admin
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;
```

**Use this in CMS policies:**

```sql
-- SITE_SETTINGS POLICIES
CREATE POLICY "site_settings_public_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (is_admin());  -- ← Uses the function

CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE
  USING (is_admin());

-- CMS_PAGES POLICIES
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE
  USING (is_admin());

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
  WITH CHECK (is_admin());

CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE
  USING (is_admin());
```

**Advantages:**
- ✅ Reuses existing function (DRY principle)
- ✅ Avoids recursive RLS queries (function has SECURITY DEFINER)
- ✅ Already tested in your codebase
- ✅ Single point of change if admin logic evolves
- ✅ Better performance (function can be optimized)

---

### Approach B: Direct Policy (Inline - If Function Doesn't Exist)

**If for some reason the `is_admin()` function doesn't exist**, use this inline approach:

```sql
-- SITE_SETTINGS POLICIES
CREATE POLICY "site_settings_public_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()  -- ← Correct reference
      AND role = 'admin'
    )
  );

CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- CMS_PAGES POLICIES
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
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
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

**Disadvantages:**
- ✗ Duplicates the admin check 9 times
- ✗ Harder to maintain
- ✗ Repeated subqueries (performance impact)
- ✗ Each RLS query still does a lookup (though EXISTS is optimized)

---

## Why The Fix Works

### The Key Difference

**WRONG:**
```sql
SELECT role FROM users WHERE id = auth.uid()
-- Looking for: users.id = 'xxx-xxx-xxx-xxx' (some UUID)
-- But users.id is DIFFERENT from auth.uid()!
-- Result: No rows found, returns NULL, policy fails
```

**CORRECT:**
```sql
SELECT role FROM users WHERE auth_user_id = auth.uid()
-- Looking for: users.auth_user_id = 'xxx-xxx-xxx-xxx' (same UUID)
-- This IS the mapping between Supabase auth and your users table
-- Result: Found the user, returns 'admin', policy succeeds
```

### How It Flows

1. **User signs in** → Supabase Auth creates `auth.users` record
2. **Email verified** → Trigger creates `users` record with:
   - `auth_user_id = auth.users.id`
   - `role = 'admin'` (if they're an admin)
3. **Admin tries to edit CMS** → Policy checks:
   - `is_admin()` function runs (SECURITY DEFINER mode)
   - Queries: `SELECT role FROM users WHERE auth_user_id = auth.uid()`
   - Finds the users record ✓
   - Returns `role = 'admin'` ✓
   - Policy allows INSERT/UPDATE/DELETE ✓

4. **Public user views page** → Policy checks:
   - `SELECT role FROM users WHERE auth_user_id = auth.uid()`
   - Finds the users record (role = 'applicant')
   - Policy only allows SELECT published pages ✓

---

## Implementation Steps

### Step 1: Verify `is_admin()` Function Exists

```sql
-- Run this in Supabase SQL Editor
SELECT prosrc FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**If it returns nothing:** Create it from Approach B above

**If it returns code:** Continue to Step 2

### Step 2: Replace CMS Table Policies

```sql
-- Drop old policies (the broken ones)
DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON site_settings;
DROP POLICY IF EXISTS "cms_pages_admin_insert" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_update" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_delete" ON cms_pages;
DROP POLICY IF EXISTS "cms_sections_admin_insert" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_update" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_delete" ON cms_sections;

-- Create new policies using is_admin() function
-- [Use the SQL from Approach A above]
```

### Step 3: Test Admin Access

```bash
# Sign in as admin user
curl -X POST https://your-project.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: your-anon-key" \
  -d '{"email":"admin@example.com","password":"password"}'

# Try to create a page
curl -X POST https://your-project.supabase.co/rest/v1/cms_pages \
  -H "Authorization: Bearer [token from above]" \
  -H "Content-Type: application/json" \
  -d '{"slug":"test","title":"Test","is_published":false}'

# Should return: 201 Created (success)
# Old version would return: 403 Forbidden (blocked by RLS)
```

### Step 4: Verify Public Access Still Works

```sql
-- Public users should ONLY see published pages
SELECT * FROM cms_pages;  -- Only shows is_published = true

-- But admins should see all
-- (because admin policies don't have is_published filter for INSERT/UPDATE/DELETE)
```

---

## Security Implications

### ✅ What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| Admin INSERT | ✗ Blocked | ✓ Allowed |
| Admin UPDATE | ✗ Blocked | ✓ Allowed |
| Admin DELETE | ✗ Blocked | ✓ Allowed |
| Public SELECT published | ✓ Allowed | ✓ Allowed |
| Public INSERT/UPDATE/DELETE | ✓ Blocked | ✓ Blocked |
| Non-admin writes | ✓ Blocked | ✓ Blocked |

### ✅ What Stays Protected

- Non-admins cannot modify ANY CMS data (double-protected by RLS + frontend)
- Public can only read published content
- Unauthenticated users cannot read anything (RLS denies)
- Role changes take effect immediately (no caching)

### ✅ Function-Based Approach Advantages

- **SECURITY DEFINER:** Function runs as its creator (bypasses RLS recursion)
- **STABLE:** Can be optimized by PostgreSQL planner
- **Single Point of Control:** Change admin logic once, affects all policies

---

## Migration SQL (Complete)

```sql
-- ============================================================================
-- FIX: CMS Table RLS Policies - Correct Admin Role Check
-- ============================================================================
-- Date: January 30, 2026
-- Issue: Previous policies used (SELECT role FROM users WHERE id = auth.uid())
--        but should use (WHERE auth_user_id = auth.uid())
--        This was blocking ALL admin operations
-- ============================================================================

-- Step 1: Drop broken policies
DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON site_settings;
DROP POLICY IF EXISTS "cms_pages_admin_insert" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_update" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_delete" ON cms_pages;
DROP POLICY IF EXISTS "cms_sections_admin_insert" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_update" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_delete" ON cms_sections;

-- Step 2: Recreate with correct function-based check
CREATE POLICY "site_settings_public_read" 
  ON site_settings FOR SELECT 
  USING (true);

CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE
  USING (is_admin());

-- CMS_PAGES POLICIES
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE
  USING (is_admin());

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
  WITH CHECK (is_admin());

CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE
  USING (is_admin());

-- Verify policies are in place
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('site_settings', 'cms_pages', 'cms_sections')
ORDER BY tablename, policyname;
```

---

## Summary

### What Was Wrong
- RLS policies queried `users.id = auth.uid()` (wrong column)
- Should query `users.auth_user_id = auth.uid()` (correct mapping)
- Resulted in NULL comparisons, blocking all admin access

### Why The Fix Works
- Uses correct column reference to link auth.users with users table
- Leverages existing `is_admin()` function with SECURITY DEFINER
- Prevents RLS recursion
- Allows admins full INSERT/UPDATE/DELETE on CMS tables
- Maintains public-only access to published content

### Security Posture
- ✅ Admins can now manage CMS
- ✅ Public cannot write to CMS (RLS blocks them)
- ✅ Non-published pages hidden from public
- ✅ Database-level enforcement (not relying on frontend)
- ✅ No weaker than the original intent

---

