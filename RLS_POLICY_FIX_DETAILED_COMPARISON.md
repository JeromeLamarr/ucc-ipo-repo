# RLS Policy Fix - Side-by-Side Comparison

## The Complete Picture

### Your Users Table Structure (Verified)

```
users table:
  ├─ id (UUID PRIMARY KEY)                    ← Your internal ID
  ├─ auth_user_id (UUID REFERENCES auth.users(id))  ← Links to Supabase Auth!
  ├─ email (TEXT)
  ├─ role (user_role enum: 'admin', 'applicant', 'supervisor', 'evaluator')
  └─ ... other columns ...
```

### The Auth Flow

```
1. User signs up with email
   └─> Supabase Auth creates: auth.users { id: 'abc-123-xxx', email: '...' }

2. User verifies email
   └─> Your trigger creates: users { auth_user_id: 'abc-123-xxx', role: 'applicant' }

3. Admin gives user admin role
   └─> UPDATE users SET role = 'admin' WHERE auth_user_id = 'abc-123-xxx'

4. User makes request to CMS API
   └─> auth.uid() returns: 'abc-123-xxx'
       └─> RLS policy must check: WHERE auth_user_id = 'abc-123-xxx'
```

---

## The Problem: Before

### ❌ Broken Policy

```sql
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

### What Happens When Admin Tries to Create a Page:

```
1. Admin calls: INSERT INTO cms_pages (slug, title) VALUES ('about', 'About')
2. RLS policy checks: WHERE id = auth.uid()
3. Admin's auth.uid() = 'abc-123-xxx'
4. Query: SELECT role FROM users WHERE id = 'abc-123-xxx'
   ├─ Looking for: users.id = 'abc-123-xxx'
   ├─ But users.id is something like: '12345678-abcd-ef01-2345-6789abcdef01'
   └─ Result: NO ROWS FOUND ✗
5. Comparison: NULL = 'admin' → FALSE
6. Result: INSERT DENIED 🚫
```

### What Actually Exists in Database:

```
auth.users table:
  id: 'abc-123-xxx'          ← auth.uid() returns THIS
  email: 'admin@example.com'

users table:
  id: '12345678-abcd-...'    ← But query looks for THIS (wrong!)
  auth_user_id: 'abc-123-xxx' ← Should look for THIS (correct!)
  role: 'admin'
```

---

## The Solution: After

### ✅ Fixed Policy

```sql
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (is_admin());
```

Where `is_admin()` is:

```sql
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
  SELECT role INTO user_role
  FROM users
  WHERE auth_user_id = auth.uid()  -- ← CORRECT COLUMN!
  LIMIT 1;
  
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;
```

### What Happens When Admin Tries to Create a Page:

```
1. Admin calls: INSERT INTO cms_pages (slug, title) VALUES ('about', 'About')
2. RLS policy checks: is_admin()
3. Function queries: WHERE auth_user_id = auth.uid()
4. Admin's auth.uid() = 'abc-123-xxx'
5. Query: SELECT role FROM users WHERE auth_user_id = 'abc-123-xxx'
   ├─ Looking for: users.auth_user_id = 'abc-123-xxx'
   ├─ FOUND IT! ✓
   └─ Result: role = 'admin'
6. Function returns: true
7. Policy evaluation: true ✓
8. Result: INSERT ALLOWED 🎉
```

### What Actually Exists in Database:

```
auth.users table:
  id: 'abc-123-xxx'          ← auth.uid() returns THIS

users table:
  id: '12345678-abcd-...'    ← Not used for lookup
  auth_user_id: 'abc-123-xxx' ← MATCHES! ✓
  role: 'admin'
```

---

## All Broken vs Fixed Policies

### SITE_SETTINGS Table

**BEFORE (❌ Broken):**
```sql
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    -- ❌ queries users.id (wrong column)
  );
```

**AFTER (✅ Fixed):**
```sql
CREATE POLICY "site_settings_admin_insert" 
  ON site_settings FOR INSERT
  WITH CHECK (is_admin());
  -- ✅ uses is_admin() function with correct auth_user_id column
```

---

### CMS_PAGES Table (Admin Insert)

**BEFORE (❌ Broken):**
```sql
CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    -- ❌ queries users.id (wrong column)
  );
```

**AFTER (✅ Fixed):**
```sql
CREATE POLICY "cms_pages_admin_insert" 
  ON cms_pages FOR INSERT
  WITH CHECK (is_admin());
  -- ✅ uses is_admin() function with correct auth_user_id column
```

---

### CMS_PAGES Table (Public Read)

**BEFORE & AFTER (✅ No Change - This One Was Right):**
```sql
CREATE POLICY "cms_pages_published_read" 
  ON cms_pages FOR SELECT
  USING (is_published = true);
  -- ✅ This one doesn't need auth check, just checks is_published flag
```

---

### CMS_SECTIONS Table (Admin Insert)

**BEFORE (❌ Broken):**
```sql
CREATE POLICY "cms_sections_admin_insert" 
  ON cms_sections FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    -- ❌ queries users.id (wrong column)
  );
```

**AFTER (✅ Fixed):**
```sql
CREATE POLICY "cms_sections_admin_insert" 
  ON cms_sections FOR INSERT
  WITH CHECK (is_admin());
  -- ✅ uses is_admin() function with correct auth_user_id column
```

---

## Impact Summary

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Admin creates CMS page | ❌ DENIED (403) | ✅ ALLOWED |
| Admin updates CMS page | ❌ DENIED (403) | ✅ ALLOWED |
| Admin deletes CMS page | ❌ DENIED (403) | ✅ ALLOWED |
| Admin creates section | ❌ DENIED (403) | ✅ ALLOWED |
| Admin updates section | ❌ DENIED (403) | ✅ ALLOWED |
| Admin deletes section | ❌ DENIED (403) | ✅ ALLOWED |
| Public reads published page | ✅ ALLOWED | ✅ ALLOWED |
| Public reads unpublished page | ✅ DENIED | ✅ DENIED |
| Public tries to create page | ✅ DENIED | ✅ DENIED |
| Non-admin reads published page | ✅ ALLOWED | ✅ ALLOWED |
| Non-admin creates page | ✅ DENIED | ✅ DENIED |

---

## Test Case: Before vs After

### Test Setup
```sql
-- Admin user in database
INSERT INTO users (auth_user_id, email, role) 
VALUES ('abc-123', 'admin@example.com', 'admin');

-- Set the admin's auth context
-- (Simulating: admin signs in, Supabase sets auth.uid() = 'abc-123')
```

### Admin Creates Page - BEFORE FIX

```
Step 1: Admin calls API endpoint (with auth token)
Step 2: Auth context set: auth.uid() = 'abc-123'
Step 3: Supabase executes INSERT
Step 4: RLS policy triggers
   Policy checks: (SELECT role FROM users WHERE id = 'abc-123') = 'admin'
   ├─ Query executed: SELECT role FROM users WHERE id = 'abc-123'
   ├─ Result: NO ROWS (because users.id ≠ 'abc-123')
   ├─ role value: NULL
   └─ Comparison: NULL = 'admin' → FALSE
Step 5: Policy DENIES insert
Result: ERROR 403 - Insufficient permissions

admin@example.com: Unable to create CMS pages 😞
CMS System: Completely broken ❌
```

### Admin Creates Page - AFTER FIX

```
Step 1: Admin calls API endpoint (with auth token)
Step 2: Auth context set: auth.uid() = 'abc-123'
Step 3: Supabase executes INSERT
Step 4: RLS policy triggers
   Policy checks: is_admin()
   ├─ Function executes:
      SELECT role INTO user_role 
      FROM users 
      WHERE auth_user_id = 'abc-123'
   ├─ Result: FOUND (users.auth_user_id = 'abc-123')
   ├─ role value: 'admin'
   └─ Function returns: true
Step 5: Policy ALLOWS insert
Result: SUCCESS 201 - Page created

admin@example.com: CMS page created! ✓
CMS System: Fully operational! ✅
```

---

## Why This Fix Is Secure

### 1. Column Reference Correct
- ✓ Matches auth.users.id with users.auth_user_id
- ✓ No data leaks through wrong columns

### 2. Role Check Authoritative
- ✓ Queries the source of truth (users.role)
- ✓ No hardcoding, no assumptions

### 3. Function-Based Approach
- ✓ SECURITY DEFINER prevents RLS recursion
- ✓ Single point of change for admin logic
- ✓ Can be audited centrally

### 4. Public Access Unchanged
- ✓ Public still only sees published pages
- ✓ Unpublished pages remain hidden
- ✓ Non-admins cannot write (separate policy)

### 5. Backwards Compatible
- ✓ Existing data structures unchanged
- ✓ Only the policy logic corrected
- ✓ No schema migration needed

---

