# RLS Policy Fix - Executive Summary

## The Problem (In One Sentence)
The CMS RLS policies query `users.id` instead of `users.auth_user_id`, so they never find the current user and deny all admin operations.

---

## What Was Wrong

```sql
-- ❌ BROKEN - Queries wrong column
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

**Why it fails:**
- `auth.uid()` returns a UUID from `auth.users` table
- Your `users` table stores this as `auth_user_id`, not `id`
- So `WHERE id = auth.uid()` finds NO ROWS
- Returns NULL, comparison fails, policy denies access

---

## The Fix

```sql
-- ✅ CORRECT - Uses the is_admin() function with proper references
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (is_admin());
```

The `is_admin()` function (already in your codebase) correctly queries:
```sql
SELECT role FROM users WHERE auth_user_id = auth.uid() -- ← Correct column!
```

---

## Why This Fix Works

**Column Mapping:**
- `auth.users.id` = UUID from Supabase Auth (returned by `auth.uid()`)
- `users.auth_user_id` = stores the same UUID
- `users.role` = stores the role ('admin', 'applicant', etc.)

**When an admin tries to create a page:**
1. Their `auth.uid()` returns their Supabase Auth ID (e.g., 'abc-123')
2. Policy calls `is_admin()` function
3. Function queries: `SELECT role FROM users WHERE auth_user_id = 'abc-123'`
4. Finds the users row, returns `role = 'admin'`
5. Policy succeeds, INSERT allowed ✓

---

## The SQL Fix (Copy-Paste Ready)

```sql
-- Drop broken policies
DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON site_settings;
DROP POLICY IF EXISTS "cms_pages_admin_insert" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_update" ON cms_pages;
DROP POLICY IF EXISTS "cms_pages_admin_delete" ON cms_pages;
DROP POLICY IF EXISTS "cms_sections_admin_insert" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_update" ON cms_sections;
DROP POLICY IF EXISTS "cms_sections_admin_delete" ON cms_sections;

-- Recreate with correct function-based check
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

---

## Security Maintained ✅

| Operation | Admin | Public | Applicant |
|-----------|-------|--------|-----------|
| SELECT published pages | ✓ | ✓ | ✓ |
| SELECT all pages | ✓ | ✗ | ✗ |
| INSERT page | ✓ | ✗ | ✗ |
| UPDATE page | ✓ | ✗ | ✗ |
| DELETE page | ✓ | ✗ | ✗ |

- ✅ Admins can now manage CMS
- ✅ Public can only view published pages
- ✅ Non-admins cannot modify anything
- ✅ No security weakened

---

## Verification

After applying the fix:

```sql
-- Test: Admin can create a page
INSERT INTO cms_pages (slug, title, is_published) 
VALUES ('test', 'Test Page', false);
-- Should succeed ✓

-- Test: Public can only see published pages
SELECT * FROM cms_pages;
-- Should only show is_published = true ✓

-- Test: Unauthenticated users see nothing
SELECT * FROM cms_pages;  -- As anonymous
-- Should return no rows ✓
```

---

## Files Referenced

- **Current broken migration:** `supabase/migrations/create_cms_tables.sql`
- **Existing is_admin() function:** `supabase/migrations/20251116061131_fix_users_table_infinite_recursion_v2.sql`
- **Users table schema:** `supabase/migrations/20251115150428_create_ip_management_system_schema_v2.sql`

---

