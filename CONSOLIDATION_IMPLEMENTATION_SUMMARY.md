# Consolidation Summary - Affiliation to Department System

**Completed:** January 19, 2026  
**Status:** ✅ Code Updates Complete - Ready for Database Migration

---

## Quick Summary

✅ **Removed affiliation field from:**
- Edge function: `send-verification-code` 
- Edge function: `verify-code`
- Database migration: `verification_codes` table schema
- Database migration: `temp_registrations` table schema
- Database migration: users table schema

✅ **Created migration scripts for:**
- Consolidation: Creates departments from affiliations and assigns users
- Cleanup: Removes deprecated affiliation columns (Phase 2)

✅ **No changes needed to:**
- `RegisterPage.tsx` - Already uses `department_id`
- `UserManagement.tsx` - Already uses `department_id`
- `register-user` edge function - Already uses `department_id`

---

## Files Changed

### 1. Edge Functions (TypeScript)

#### `supabase/functions/send-verification-code/index.ts`
**Changes:**
- Removed `affiliation?: string;` from `SendCodeRequest` interface
- Removed `affiliation` parameter from function destructuring
- Removed `affiliation: affiliation || null,` from database insert

**Before:**
```typescript
interface SendCodeRequest {
  email: string;
  fullName: string;
  password: string;
  affiliation?: string;  // ❌ REMOVED
}
```

**After:**
```typescript
interface SendCodeRequest {
  email: string;
  fullName: string;
  password: string;
}
```

---

#### `supabase/functions/verify-code/index.ts`
**Changes:**
- Removed `affiliation: verificationData.affiliation,` from users.insert()

**Before:**
```typescript
const { error: profileError } = await supabase.from("users").insert({
  auth_user_id: authData.user.id,
  email: verificationData.email,
  full_name: verificationData.full_name,
  affiliation: verificationData.affiliation,  // ❌ REMOVED
  role: "applicant",
  is_verified: true,
});
```

**After:**
```typescript
const { error: profileError } = await supabase.from("users").insert({
  auth_user_id: authData.user.id,
  email: verificationData.email,
  full_name: verificationData.full_name,
  role: "applicant",
  is_verified: true,
});
```

---

### 2. Database Migrations (SQL)

#### `supabase/migrations/20251115150428_create_ip_management_system_schema_v2.sql`
**Changes:**
- Replaced `affiliation TEXT,` with `department_id UUID REFERENCES departments(id) ON DELETE SET NULL,`
- Added `CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);`

**Before:**
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'applicant',
  full_name TEXT NOT NULL,
  affiliation TEXT,  -- ❌ OLD FIELD
  is_verified BOOLEAN DEFAULT false,
  ...
);
```

**After:**
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'applicant',
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,  -- ✅ NEW FIELD
  is_verified BOOLEAN DEFAULT false,
  ...
);
```

---

#### `supabase/migrations/20251115192053_add_verification_codes_table.sql`
**Changes:**
- Removed `affiliation text,` from verification_codes table
- Updated documentation to remove affiliation references

**Before:**
```sql
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  full_name text NOT NULL,
  affiliation text,  -- ❌ REMOVED
  password_hash text NOT NULL,
  ...
);
```

**After:**
```sql
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  ...
);
```

---

#### `supabase/migrations/20251123190300_add_email_verification_system.sql`
**Changes:**
- Removed `affiliation VARCHAR(255),` from temp_registrations table

**Before:**
```sql
CREATE TABLE IF NOT EXISTS temp_registrations (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  affiliation VARCHAR(255),  -- ❌ REMOVED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ...
);
```

**After:**
```sql
CREATE TABLE IF NOT EXISTS temp_registrations (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ...
);
```

---

### 3. New Migration Files (Created)

#### `supabase/migrations/20260119_consolidate_affiliation_to_department.sql`
**Purpose:** Migrates existing affiliation data to department_id system
**What it does:**
1. Creates new departments from existing unique affiliations
2. Maps all users with affiliation to their corresponding department
3. Assigns unaffiliated users to "No Department" (optional)
4. Clears affiliation field for migrated users

**Key SQL:**
```sql
-- Create departments from affiliations
INSERT INTO public.departments (name, description, active, created_at, updated_at)
SELECT DISTINCT TRIM(u.affiliation) as name, ...
FROM public.users u
WHERE u.affiliation IS NOT NULL AND u.affiliation != '';

-- Update users with department_id
UPDATE public.users u
SET department_id = d.id, updated_at = now()
FROM public.departments d
WHERE LOWER(TRIM(u.affiliation)) = LOWER(TRIM(d.name))
AND u.department_id IS NULL;
```

---

#### `supabase/migrations/20260119_remove_legacy_affiliation_column.sql`
**Purpose:** Removes deprecated affiliation columns (Phase 2 - run later)
**What it does:**
1. Drops affiliation column from users table
2. Drops affiliation column from verification_codes table
3. Drops affiliation column from temp_registrations table

**When to run:** After verifying Phase 1 migration was successful (2-3 weeks later)

---

## Data Flow Changes

### Before Consolidation
```
Registration Form
├─ department (UI selector) → departmentId parameter
├─ affiliation (free text) → Optional UI field → affiliation field
└─ Both stored separately, creating confusion
```

### After Consolidation
```
Registration Form
└─ Department (UI selector) → departmentId parameter
   └─ Stored in users.department_id
   └─ References departments table
   └─ Single source of truth
```

---

## Implementation Steps

### Step 1: Deploy Code Changes (Already Done ✅)
- Edge functions updated
- Schema migrations updated
- No frontend changes needed

### Step 2: Run Database Migration (Next)
Execute in Supabase SQL Editor:
```sql
-- Run: supabase/migrations/20260119_consolidate_affiliation_to_department.sql
```

### Step 3: Verify Migration Success
```sql
SELECT COUNT(*) as total_users, 
       COUNT(department_id) as with_department,
       COUNT(affiliation) as with_old_affiliation
FROM users;
-- Should show: with_affiliation = 0, with_department = total_users (or close)
```

### Step 4: Monitor for 2-3 Weeks
- Verify all registrations work
- Confirm no errors in application
- Check department queries

### Step 5: Run Cleanup (Optional)
```sql
-- Run: supabase/migrations/20260119_remove_legacy_affiliation_column.sql
```

---

## Benefits of Consolidation

| Aspect | Before | After |
|--------|--------|-------|
| Data Storage | Dual system (text + UUID) | Single system (UUID) |
| Consistency | Mixed sources | Unified source |
| Querying | Complex JOINs | Direct foreign key |
| Maintenance | Two fields to update | One field |
| Reporting | Manual mapping | Structured queries |
| Scalability | Limited | Unlimited |
| Data Integrity | Weak | Strong (referential) |

---

## Breaking Changes

⚠️ **Important:** These changes are NOT backward compatible with old code

### If Your Code References Affiliation
**Old Query (Won't Work):**
```typescript
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('affiliation', 'Engineering');
// Error: column "affiliation" does not exist
```

**New Query:**
```typescript
const { data } = await supabase
  .from('users')
  .select('*, departments(name)')
  .eq('departments.name', 'Engineering');
```

---

## Verification Checklist

- [ ] Edge functions deploy without errors
- [ ] New users can register with department
- [ ] Consolidation migration completes successfully
- [ ] Database queries return expected results
- [ ] Certificate generation still works
- [ ] No "affiliation" errors in logs
- [ ] Department dropdown displays correctly
- [ ] Existing users display their department

---

## Rollback Information

**Before Cleanup Migration:**
- Affiliation column still exists
- Can safely revert if needed
- No data loss

**After Cleanup Migration:**
- Affiliation column permanently removed
- Would need database restore to recover
- Ensure 2-3 week verification period first

---

## Next Steps

1. ✅ Review code changes (completed)
2. 📋 Run consolidation migration (20260119_consolidate_affiliation_to_department.sql)
3. ✓ Verify results
4. 📊 Monitor for 2-3 weeks
5. 🗑️ Run cleanup migration (20260119_remove_legacy_affiliation_column.sql)
6. 📝 Update any external documentation

---

**Status:** Ready for database migration  
**Risk:** Low (with backup)  
**Rollback:** Possible until cleanup migration runs

