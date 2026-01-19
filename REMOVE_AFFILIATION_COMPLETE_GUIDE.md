# Complete Removal of Affiliation Column - Full Database Cleanup

**Status:** Ready to implement (Phase 2 of consolidation)  
**Scope:** Permanently remove affiliation from database  
**Timeline:** After 2-3 weeks of successful consolidation  
**Risk Level:** LOW if Phase 1 is verified complete  

---

## What This Does

### Removes affiliation column from:
- ✅ `users` table (main table)
- ✅ `verification_codes` table (registration flow)
- ✅ `temp_registrations` table (temporary storage)

### Result:
- **Before:** Mixed system with both affiliation and department_id
- **After:** Pure department_id system - single source of truth

---

## Impact Analysis

### Database Changes

#### BEFORE (Current State)
```
users table:
├─ affiliation (TEXT) - Legacy field, being phased out
├─ department_id (UUID FK) - New field, now in use
├─ email (TEXT UNIQUE)
├─ full_name (TEXT)
└─ ... other fields

verification_codes:
├─ affiliation (TEXT) - Not used anymore
├─ full_name (TEXT)
└─ ... other fields

temp_registrations:
├─ affiliation (VARCHAR) - Not used anymore
├─ full_name (VARCHAR)
└─ ... other fields
```

#### AFTER (After Cleanup)
```
users table:
├─ department_id (UUID FK) - Only department field! ✅
├─ email (TEXT UNIQUE)
├─ full_name (TEXT)
└─ ... other fields

verification_codes:
├─ full_name (TEXT) - Clean
└─ ... other fields

temp_registrations:
├─ full_name (VARCHAR) - Clean
└─ ... other fields
```

---

## SQL Cleanup Script

### Complete Removal (Copy & Paste)

```sql
-- =====================================================
-- PHASE 2: Remove Legacy Affiliation Column Completely
-- =====================================================

-- Step 1: Backup current state (optional but recommended)
-- SELECT * INTO affiliation_backup FROM users WHERE affiliation IS NOT NULL;

-- Step 2: Drop affiliation from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 3: Drop affiliation from verification_codes table
ALTER TABLE public.verification_codes DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 4: Drop affiliation from temp_registrations table
ALTER TABLE public.temp_registrations DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 5: Verify columns are removed
SELECT 
  column_name
FROM information_schema.columns 
WHERE table_name IN ('users', 'verification_codes', 'temp_registrations')
  AND column_name = 'affiliation';
-- Should return: 0 rows (affiliation column gone!)

-- Step 6: Final audit - confirm all tables clean
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('users', 'verification_codes', 'temp_registrations')
GROUP BY table_name
ORDER BY table_name;
```

---

## Pre-Cleanup Verification Checklist

**Before running the cleanup, verify:**

```sql
-- 1. Verify all users have department_id
SELECT COUNT(*) as users_without_dept
FROM users
WHERE department_id IS NULL;
-- Should return: 0

-- 2. Verify no code is still querying affiliation
SELECT COUNT(*) as orphaned_affiliation_values
FROM users
WHERE affiliation IS NOT NULL 
  AND affiliation != ''
  AND affiliation != 'NULL';
-- Should return: 0

-- 3. Verify consolidation migration was successful
SELECT 
  COUNT(*) as total_users,
  COUNT(department_id) as with_dept_id,
  COUNT(affiliation) as with_affiliation
FROM users;
-- Should show: with_affiliation = 0 (or very small number)

-- 4. Check no foreign keys reference affiliation
SELECT constraint_name, table_name, column_name
FROM information_schema.constraint_column_usage
WHERE column_name = 'affiliation';
-- Should return: 0 rows
```

---

## Application Code Impact

### Code to Update

**TypeScript/JavaScript files to check:**

```typescript
// ❌ These queries will BREAK after cleanup:
supabase
  .from('users')
  .select('affiliation')  // ❌ Column won't exist!
  
supabase
  .from('verification_codes')
  .select('affiliation')  // ❌ Column won't exist!

// ✅ These queries will continue to work:
supabase
  .from('users')
  .select('department_id')  // ✅ Still exists
  
supabase
  .from('users')
  .select('*, departments(name)')  // ✅ Better - shows department name
```

### Files to Check for affiliation References

```bash
# Search for any remaining affiliation references
grep -r "affiliation" src/
grep -r "affiliation" supabase/functions/
```

**Expected Results:**
- Should find 0 references in current code
- Any found are in comments or documentation only

---

## Step-by-Step Implementation

### Week 1-3: Consolidation Phase (Already Done ✅)

```sql
-- Run consolidation migration
-- 20260119_consolidate_affiliation_to_department.sql
```

### Week 3: Pre-Cleanup Verification

Run the verification checklist above to ensure:
- ✅ All users have department_id
- ✅ No affiliation values remaining
- ✅ No code references affiliation
- ✅ No foreign keys reference affiliation

### Week 3+: Cleanup Phase

1. **Schedule maintenance window** (optional)
2. **Run cleanup migration:**

```sql
-- In Supabase SQL Editor, run:
ALTER TABLE public.users DROP COLUMN IF EXISTS affiliation CASCADE;
ALTER TABLE public.verification_codes DROP COLUMN IF EXISTS affiliation CASCADE;
ALTER TABLE public.temp_registrations DROP COLUMN IF EXISTS affiliation CASCADE;
```

3. **Verify cleanup successful:**

```sql
SELECT * FROM users LIMIT 1;  -- Affiliation column gone ✅
```

4. **Update documentation**
5. **Communicate changes to team**

---

## Benefits of Complete Removal

| Benefit | Impact |
|---------|--------|
| **Cleaner Schema** | No deprecated columns, less confusion |
| **Storage Efficiency** | Remove unused TEXT columns (minor) |
| **Query Performance** | Fewer columns to scan (micro optimization) |
| **Maintenance** | No legacy code to support |
| **Documentation** | Clear: department_id is THE system |
| **Migration Path** | Total consolidation complete |

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Code references affiliation | Low | High | Pre-scan codebase |
| Backup needed for audits | Low | Medium | Create backup before cleanup |
| Foreign keys break | Very Low | Critical | Verify no FKs reference column |
| Rollback needed | Very Low | Medium | Keep backup, full DB restore available |

**Overall Risk:** 🟢 **LOW** (with proper verification)

---

## Rollback Plan

### If issues found after cleanup:

**Option 1: Restore from backup (best)**
```bash
# Restore database from backup taken before cleanup
# All data restored, column restored
```

**Option 2: Recreate column manually (if needed)**
```sql
-- Recreate the column (if absolutely necessary)
ALTER TABLE public.users 
ADD COLUMN affiliation TEXT;

ALTER TABLE public.verification_codes 
ADD COLUMN affiliation TEXT;

ALTER TABLE public.temp_registrations 
ADD COLUMN affiliation VARCHAR(255);

-- Restore data from backup
-- Would need separate backup table for this
```

---

## What Gets Deleted

### users table
```
Removed columns:
- affiliation (TEXT)

Kept columns:
- id, auth_user_id, email, role, full_name
- department_id ← Only department field now!
- is_verified, verification_token, temp_password
- last_login_at, profile_data, created_at, updated_at
```

### verification_codes table
```
Removed columns:
- affiliation (TEXT)

Kept columns:
- id, email, code, full_name
- password_hash, expires_at, verified, created_at
```

### temp_registrations table
```
Removed columns:
- affiliation (VARCHAR)

Kept columns:
- id, auth_user_id, email, full_name
- created_at, expires_at
```

---

## Verification After Cleanup

### Query 1: Confirm columns are gone
```sql
SELECT COUNT(*) as affiliation_columns_found
FROM information_schema.columns 
WHERE column_name = 'affiliation'
  AND table_name IN ('users', 'verification_codes', 'temp_registrations');
-- Expected: 0 rows
```

### Query 2: Verify tables still have all needed columns
```sql
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('users', 'verification_codes', 'temp_registrations')
GROUP BY table_name;

-- Expected:
-- users: ~15 columns (one less than before)
-- verification_codes: ~8 columns (one less)
-- temp_registrations: ~6 columns (one less)
```

### Query 3: Verify department_id is intact
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(department_id) as with_dept,
  COUNT(CASE WHEN department_id IS NOT NULL THEN 1 END) as dept_not_null
FROM public.users;

-- Expected: all should show same count
```

---

## Timeline & Dependencies

```
NOW (Phase 1)
├─ Consolidation migration runs ✅
├─ All users mapped to departments ✅
└─ Affiliation data cleared ✅

WEEK 1-2 (Monitoring)
├─ System stable ✅
├─ No errors in logs ✅
└─ Tests passing ✅

WEEK 3 (Cleanup Window)
├─ Pre-cleanup verification ✅
├─ Backup created ✅
├─ Maintenance window scheduled ✅
├─ Cleanup migration runs ✅
└─ Post-cleanup verification ✅

WEEK 3+ (Post-Cleanup)
├─ Monitor for issues
├─ Update documentation
├─ Communicate to team
└─ Close consolidation project
```

---

## Decision: Keep or Remove?

### Keep affiliation column if:
- ❌ Legacy code still uses it (unlikely with our updates)
- ❌ External integrations depend on it
- ❌ Audit requirements mandate it
- ❌ You want easy rollback option

### Remove affiliation column if:
- ✅ Code fully updated (it is)
- ✅ No external dependencies
- ✅ Want clean, consolidated system
- ✅ Ready to commit to department_id

**Recommendation:** ✅ **REMOVE** - It's clean, safe, and completes consolidation

---

## Summary

### Current State (Phase 1 Complete)
- Users have department_id ✅
- Affiliation field cleared ✅
- System functioning correctly ✅
- Database has both columns (for safety)

### After Cleanup (Phase 2)
- Users have department_id ✅
- Affiliation column REMOVED
- System cleaner, simpler ✅
- No legacy code to maintain

---

## Recommended Approach

1. **Week 1-3:** Monitor consolidation (Phase 1)
2. **Week 3:** Run cleanup migration (Phase 2)
3. **Result:** Pure department_id system

**This is the recommended path.**

---

## Implementation Checklist

- [ ] Verify consolidation (Phase 1) successful
- [ ] Wait 2-3 weeks for monitoring
- [ ] Run pre-cleanup verification queries
- [ ] Create database backup
- [ ] Schedule cleanup window
- [ ] Run cleanup migration
- [ ] Verify columns removed
- [ ] Update documentation
- [ ] Communicate to team
- [ ] Close consolidation project ✅

---

**Status:** Ready for Phase 2 whenever you decide  
**Time to Execute:** ~5 minutes  
**Risk:** 🟢 LOW

