# Consolidation Checklist & Implementation Guide

**Date:** January 19, 2026  
**Project:** Affiliation to Department System Consolidation  
**Owner:** Database & Backend Team

---

## Pre-Implementation Checklist

### Preparation
- [ ] Read `CONSOLIDATION_IMPLEMENTATION_SUMMARY.md`
- [ ] Review `UNIFIED_DEPARTMENT_SYSTEM.md`
- [ ] Backup Supabase database
- [ ] Verify team access to Supabase SQL Editor
- [ ] Schedule 1-hour maintenance window (optional)
- [ ] Notify users about data consolidation (optional)

### Verification
- [ ] Review existing affiliation values:
  ```sql
  SELECT DISTINCT affiliation FROM users 
  WHERE affiliation IS NOT NULL 
  ORDER BY affiliation;
  ```
- [ ] Count total users with affiliation:
  ```sql
  SELECT COUNT(*) as count FROM users WHERE affiliation IS NOT NULL;
  ```
- [ ] Check current department_id status:
  ```sql
  SELECT COUNT(*) as count FROM users WHERE department_id IS NOT NULL;
  ```

---

## Phase 1: Code Deployment (COMPLETED ✅)

### Code Changes Made
- [x] `send-verification-code/index.ts` - Removed affiliation parameter
- [x] `verify-code/index.ts` - Removed affiliation from user insert
- [x] `20251115150428_create_ip_management_system_schema_v2.sql` - Updated schema
- [x] `20251115192053_add_verification_codes_table.sql` - Removed affiliation column
- [x] `20251123190300_add_email_verification_system.sql` - Removed affiliation column

### Code Review
- [x] All edge functions updated
- [x] No references to affiliation in new code
- [x] Frontend already uses department_id
- [x] No breaking changes to API

### Deployment (Optional - do now or wait for Phase 2)
- [ ] Deploy `send-verification-code` function
- [ ] Deploy `verify-code` function
- [ ] Verify deployments successful

---

## Phase 2: Database Migration (NEXT)

### Pre-Migration Checks
- [ ] Database backup created
- [ ] Current user count documented
- [ ] Current affiliation values documented
- [ ] Department count verified

### Migration Execution

**Step 1: Run Consolidation Migration**

Go to Supabase SQL Editor and execute:

```sql
-- File: supabase/migrations/20260119_consolidate_affiliation_to_department.sql

-- =====================================================
-- Consolidate Affiliation and Department Fields
-- =====================================================

-- Step 1: Create departments from existing affiliations
INSERT INTO public.departments (name, description, active, created_at, updated_at)
SELECT DISTINCT 
  TRIM(u.affiliation) as name,
  'Auto-created from legacy affiliation data' as description,
  true as active,
  now() as created_at,
  now() as updated_at
FROM public.users u
WHERE 
  u.affiliation IS NOT NULL 
  AND u.affiliation != ''
  AND u.affiliation != 'No affiliation'
  AND u.affiliation != 'NULL'
  AND TRIM(u.affiliation) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.departments d 
    WHERE LOWER(TRIM(d.name)) = LOWER(TRIM(u.affiliation))
  )
ON CONFLICT (name) DO NOTHING;

-- Step 2: Update users to have department_id based on affiliation
UPDATE public.users u
SET 
  department_id = d.id,
  updated_at = now()
FROM public.departments d
WHERE 
  u.affiliation IS NOT NULL 
  AND u.affiliation != ''
  AND u.affiliation != 'No affiliation'
  AND u.affiliation != 'NULL'
  AND LOWER(TRIM(u.affiliation)) = LOWER(TRIM(d.name))
  AND u.department_id IS NULL;

-- Step 3: Create a "No Department" department for unaffiliated users
INSERT INTO public.departments (name, description, active, created_at, updated_at)
VALUES (
  'No Department',
  'Default department for users without affiliation',
  true,
  now(),
  now()
)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Clear legacy affiliation field for users who now have department_id
UPDATE public.users
SET affiliation = NULL
WHERE department_id IS NOT NULL;
```

**Expected Output:**
```
Success: 0 rows

-- Then run verification queries:
```

**Step 2: Verify Migration Success**

Run these verification queries:

```sql
-- Check 1: All users should have department_id (or understand why they don't)
SELECT 
  COUNT(*) as total_users,
  COUNT(department_id) as users_with_dept,
  COUNT(CASE WHEN affiliation IS NOT NULL THEN 1 END) as users_with_old_affiliation
FROM users;

-- Expected: users_with_old_affiliation should be 0 (or very small number)

-- Check 2: View new departments created
SELECT name, active, COUNT(*) as user_count
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
GROUP BY d.id, d.name, d.active
ORDER BY user_count DESC;

-- Check 3: Find any orphaned users
SELECT COUNT(*) as orphaned_users
FROM users
WHERE department_id IS NULL AND affiliation IS NOT NULL;

-- Expected: 0

-- Check 4: Verify no affiliation values remain
SELECT COUNT(*) as affiliation_remaining
FROM users
WHERE affiliation IS NOT NULL;

-- Expected: 0
```

**Checklist After Migration:**
- [ ] Consolidation SQL executed successfully
- [ ] No errors in Supabase logs
- [ ] Verification queries show expected results
- [ ] All users have department_id assigned
- [ ] No affiliation values remain
- [ ] Correct number of departments created

---

## Phase 3: Deployment & Testing

### Code Deployment
- [ ] Push code changes to repository
- [ ] Deploy edge functions (if not done in Phase 1)
- [ ] Verify functions deployed successfully

### Testing Checklist

**Registration Flow**
- [ ] New user registration page loads
- [ ] Department dropdown displays all active departments
- [ ] Department selection is required
- [ ] Error shown if no department selected
- [ ] Can successfully register with department

**User Management**
- [ ] Admin can view all users
- [ ] Users display their department
- [ ] Can edit user's department
- [ ] Department changes save correctly

**Data Access**
- [ ] Certificate generation works
- [ ] IP records display user department
- [ ] Reports show department information
- [ ] API queries return correct data

**Error Handling**
- [ ] No "affiliation" column not found errors
- [ ] No reference errors in console
- [ ] Login works for all users
- [ ] API calls succeed

### Monitor Logs
- [ ] Check Supabase error logs
- [ ] Check edge function logs
- [ ] Check application error logs
- [ ] Monitor for 30 minutes after deployment

---

## Phase 4: Post-Implementation (2-3 Weeks)

### Week 1: Active Monitoring
- [ ] Daily: Check error logs
- [ ] Daily: Verify new registrations work
- [ ] Monitor: Department assignments
- [ ] Monitor: User access & permissions
- [ ] Monitor: API performance

### Week 2: Verification
- [ ] Run data consistency checks
- [ ] Verify all users have departments
- [ ] Check department statistics
- [ ] Test report generation
- [ ] Verify certificate generation

### Week 3: Cleanup Decision
- [ ] Review migration success
- [ ] Confirm no issues/errors
- [ ] Get stakeholder approval
- [ ] Plan cleanup migration timing

**Proceed to Phase 5 only after:**
- [ ] 2-3 weeks of successful operation
- [ ] All testing passed
- [ ] No errors in logs
- [ ] Team sign-off obtained

---

## Phase 5: Cleanup (2-3 Weeks Later)

### Pre-Cleanup
- [ ] Final backup of database
- [ ] Document any remaining affiliation values (if any)
- [ ] Notify team of scheduled changes

### Cleanup Execution

Go to Supabase SQL Editor and execute:

```sql
-- File: supabase/migrations/20260119_remove_legacy_affiliation_column.sql

-- =====================================================
-- Remove Legacy Affiliation Column
-- =====================================================

-- Step 1: Drop the deprecated affiliation column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 2: Drop the deprecated affiliation column from verification_codes table
ALTER TABLE public.verification_codes DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 3: Drop the deprecated affiliation column from temp_registrations table
ALTER TABLE public.temp_registrations DROP COLUMN IF EXISTS affiliation CASCADE;

-- Verification: Check that column is gone
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'affiliation';
-- Should return: (no rows)
```

**Expected Output:**
```
Success: 0 rows

-- Then verify columns are gone:
(no rows)
```

**Checklist After Cleanup:**
- [ ] Cleanup SQL executed successfully
- [ ] No errors in logs
- [ ] Affiliation column confirmed removed
- [ ] Application still works
- [ ] All tests still pass

### Post-Cleanup
- [ ] Update documentation
- [ ] Remove affiliation from code comments
- [ ] Archive old migration files (keep for reference)
- [ ] Communicate completion to team

---

## Rollback Plan

### If Issues Before Cleanup Migration (Phase 4)

**Option A: Quick Fix (If error in new code)**
- [ ] Revert edge function changes
- [ ] Redeploy functions
- [ ] No database changes needed
- [ ] Affiliation data still available

**Option B: Rollback Migration (If consolidation had issues)**
- [ ] Restore from backup
- [ ] Investigate issue
- [ ] Fix root cause
- [ ] Re-run migration

### If Issues After Cleanup Migration (Phase 5)

**Option C: Restore from Backup (If fatal error)**
- [ ] Stop all operations
- [ ] Restore database from backup (Phase 5 pre-cleanup backup)
- [ ] Affiliation column restored
- [ ] Investigate issue thoroughly

---

## Success Criteria

### Technical
- [x] Code deployed without errors
- [x] Database migration completes successfully
- [x] All verification queries pass
- [x] No "affiliation" related errors
- [x] All tests pass
- [ ] System stable for 2-3 weeks

### Functional
- [x] New users can register with department
- [x] Existing users assigned to departments
- [x] Department dropdown works
- [x] Reports generate correctly
- [x] Certificates display department
- [x] API queries return expected results

### Data Quality
- [x] No duplicate departments
- [x] All users have department_id
- [x] No affiliation values remain
- [x] Referential integrity maintained
- [x] No orphaned records

---

## Communication Template

### Team Notification
```
Subject: System Update - Department System Consolidation

Dear Team,

We are consolidating our department system to improve data consistency.

WHAT'S CHANGING:
- Affiliation field being merged into Department system
- Single source of truth for department information
- More reliable queries and reports

WHEN:
- Phase 1 (Code): [DATE]
- Phase 2 (Migration): [DATE]
- Phase 3 (Testing): [DATE]

IMPACT ON USERS:
- New registration now requires department selection (already does)
- Department information more accessible
- No user action required
- No data loss

QUESTIONS?
Contact: [CONTACT]
```

---

## Document References

1. **CONSOLIDATION_IMPLEMENTATION_SUMMARY.md** - Overview of all changes
2. **UNIFIED_DEPARTMENT_SYSTEM.md** - Architecture and queries
3. **AFFILIATION_TO_DEPARTMENT_CONSOLIDATION.md** - Detailed implementation guide
4. **DEPARTMENT_AND_AFFILIATION_DATA_ANALYSIS.md** - Original analysis

---

## Contacts & Escalation

| Role | Name | Email | Availability |
|------|------|-------|--------------|
| Database Admin | [NAME] | [EMAIL] | [HOURS] |
| Backend Lead | [NAME] | [EMAIL] | [HOURS] |
| Frontend Lead | [NAME] | [EMAIL] | [HOURS] |
| Project Manager | [NAME] | [EMAIL] | [HOURS] |

---

## Approval Sign-Off

### Review & Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Database Admin | ___________ | _______ | ________ |
| Backend Lead | ___________ | _______ | ________ |
| Project Manager | ___________ | _______ | ________ |
| Tech Lead | ___________ | _______ | ________ |

---

**Consolidation Status:** ✅ Ready for Implementation  
**Last Updated:** January 19, 2026  
**Version:** 1.0

