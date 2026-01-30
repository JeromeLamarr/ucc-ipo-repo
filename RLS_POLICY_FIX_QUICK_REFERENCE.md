# RLS Policy Fix - Quick Reference Guide

---

## TL;DR

**Problem:** CMS RLS policies query the wrong column, blocking all admin access.

**Solution:** Use the `is_admin()` function instead of inline SQL.

**Impact:** Admins can now manage CMS content.

---

## The Bug in One Picture

```
┌─────────────────┐                    ┌─────────────────┐
│  auth.users     │                    │  users          │
├─────────────────┤                    ├─────────────────┤
│ id: abc-123-xxx │                    │ id: xyz-789-...│ ← WRONG!
│ email: ...      │                    │ auth_user_id:   │
└─────────────────┘                    │ abc-123-xxx ✓   │
       ▲                                │ role: admin     │
       │                                └─────────────────┘
       │
   auth.uid()                         ✅ Should use auth_user_id
   returns this                       ❌ Was using id

┌─ Policy tries to match:
│  WHERE id = auth.uid()              ← Queries users.id (WRONG)
│  WHERE auth_user_id = auth.uid()    ← Should query this (CORRECT)
```

---

## Files to Review

| Document | Purpose | Read First |
|----------|---------|-----------|
| `RLS_POLICY_FIX_SUMMARY.md` | One-page overview of the fix | ⭐ START HERE |
| `RLS_POLICY_ANALYSIS_AND_FIX.md` | Detailed technical analysis | For understanding |
| `RLS_POLICY_FIX_DETAILED_COMPARISON.md` | Side-by-side before/after | For context |
| `CORRECTED_CMS_TABLES_MIGRATION.sql` | Ready-to-deploy SQL | To fix the database |

---

## Quick Fix (Copy-Paste)

### In Supabase SQL Editor:

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

-- Recreate with is_admin() function
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "site_settings_admin_update" 
  ON site_settings FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "site_settings_admin_delete" 
  ON site_settings FOR DELETE USING (is_admin());

CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT USING (is_published = true);
CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "cms_pages_admin_update" 
  ON cms_pages FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "cms_pages_admin_delete" 
  ON cms_pages FOR DELETE USING (is_admin());

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
  ON cms_sections FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "cms_sections_admin_update" 
  ON cms_sections FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "cms_sections_admin_delete" 
  ON cms_sections FOR DELETE USING (is_admin());
```

---

## What This Fixes

| Scenario | Before | After |
|----------|--------|-------|
| Admin creates page | ❌ 403 Error | ✅ Works |
| Admin edits page | ❌ 403 Error | ✅ Works |
| Admin deletes page | ❌ 403 Error | ✅ Works |
| Admin creates section | ❌ 403 Error | ✅ Works |
| Admin edits section | ❌ 403 Error | ✅ Works |
| Admin deletes section | ❌ 403 Error | ✅ Works |
| Public views published page | ✅ Works | ✅ Works |
| Non-admin creates page | ✅ 403 Blocked | ✅ 403 Blocked |

---

## Why It Works

### The Auth Flow
1. User signs up → Supabase Auth creates `auth.users` record
2. Email verified → Trigger creates `users` record with:
   - `auth_user_id = auth.users.id` ← Linking column
   - `role = 'admin'`
3. Admin API call → `auth.uid()` returns the auth.users ID
4. RLS policy checks `is_admin()` function
5. Function queries: `SELECT role FROM users WHERE auth_user_id = auth.uid()`
6. Finds the users record, returns true, policy allows operation

---

## Security Check ✅

- ✓ Admins can now manage CMS
- ✓ Public can only view published pages
- ✓ Non-admins cannot write to CMS (RLS blocks them)
- ✓ Database-level enforcement (not relying on frontend)
- ✓ No security weakened from original design

---

## After You Apply This Fix

### Test 1: Admin Can Create Page
```sql
INSERT INTO cms_pages (slug, title, is_published) 
VALUES ('test', 'Test Page', true);
-- Should succeed ✓
```

### Test 2: Public Can See Published Pages
```sql
-- As anonymous user:
SELECT * FROM cms_pages;
-- Should only show is_published = true ✓
```

### Test 3: Non-Admin Cannot Write
```sql
-- As non-admin authenticated user:
INSERT INTO cms_pages (slug, title) VALUES ('hack', 'Hacked');
-- Should be blocked by RLS ✓
```

---

## Questions?

- **How does `is_admin()` work?** → See: `supabase/migrations/20251116061131_fix_users_table_infinite_recursion_v2.sql`
- **Why use a function?** → Prevents RLS recursion, centralizes admin logic
- **What if the function doesn't exist?** → Use Approach B from `RLS_POLICY_ANALYSIS_AND_FIX.md`
- **Do I need to change the schema?** → No, only the RLS policies change

---

