# Affiliation to Department Consolidation - Implementation Guide

**Date:** January 19, 2026  
**Status:** Ready for Implementation  
**Priority:** High (fixes data inconsistency)

---

## Overview

This guide consolidates the legacy `affiliation` field into the unified `department_id` system. The system previously had:
- ❌ **Legacy:** `users.affiliation` (TEXT, free-form)
- ✅ **New:** `users.department_id` (UUID, structured reference)

This caused data inconsistency and mixed-up data fetching. Now everything flows through the `departments` table.

---

## What Changed

### 1. **Database Schema Updates**

**Files Modified:**
- `supabase/migrations/20251115150428_create_ip_management_system_schema_v2.sql` - Updated users table definition
- `supabase/migrations/20251115192053_add_verification_codes_table.sql` - Removed affiliation from verification_codes
- `supabase/migrations/20251123190300_add_email_verification_system.sql` - Removed affiliation from temp_registrations

**Changes:**
```sql
-- OLD: affiliation TEXT
-- NEW: department_id UUID REFERENCES departments(id)

ALTER TABLE users MODIFY department_id UUID NOT NULL DEFAULT (SELECT id FROM departments WHERE name = 'No Department');
```

### 2. **Edge Functions Updated**

**Files Modified:**
- `supabase/functions/send-verification-code/index.ts` - Removed affiliation field
- `supabase/functions/verify-code/index.ts` - Removed affiliation field

**Changes:**
```typescript
// BEFORE
interface SendCodeRequest {
  email: string;
  fullName: string;
  password: string;
  affiliation?: string;  // ❌ REMOVED
}

// AFTER
interface SendCodeRequest {
  email: string;
  fullName: string;
  password: string;
}
```

### 3. **Existing Code - No Changes Needed**

These already use `department_id`:
- ✅ `src/pages/RegisterPage.tsx` - Already using department_id
- ✅ `src/pages/UserManagement.tsx` - Already using department_id  
- ✅ `supabase/functions/register-user/index.ts` - Already using department_id

---

## Migration Steps

### Phase 1: Prepare (Before applying migrations)

1. **Backup your database**
   ```bash
   # If using Supabase, export your data first
   ```

2. **Review existing data**
   ```sql
   -- Check for unique affiliations in your database
   SELECT DISTINCT affiliation FROM users 
   WHERE affiliation IS NOT NULL 
   ORDER BY affiliation;
   
   -- Count users by affiliation
   SELECT affiliation, COUNT(*) as count 
   FROM users 
   WHERE affiliation IS NOT NULL 
   GROUP BY affiliation 
   ORDER BY count DESC;
   ```

### Phase 2: Run Migrations (In Order)

**Migration 1:** Consolidate affiliation to departments
```sql
-- File: supabase/migrations/20260119_consolidate_affiliation_to_department.sql
-- This will:
-- 1. Create departments from all existing affiliations
-- 2. Map users to their new department_id
-- 3. Clear the affiliation field
```

**Commands to run (in Supabase SQL Editor):**

1. Run consolidation migration:
```sql
-- Execute: supabase/migrations/20260119_consolidate_affiliation_to_department.sql
-- Verify with:
SELECT COUNT(*) as users_with_department FROM users WHERE department_id IS NOT NULL;
SELECT COUNT(*) as departments FROM departments;
```

2. Verify the migration:
```sql
-- Check for any orphaned users
SELECT COUNT(*) as users_without_department 
FROM users 
WHERE department_id IS NULL;

-- View new departments (should match unique old affiliations)
SELECT name, COUNT(*) as user_count 
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
GROUP BY d.id, d.name
ORDER BY user_count DESC;
```

3. (Optional) Run cleanup to remove column:
```sql
-- File: supabase/migrations/20260119_remove_legacy_affiliation_column.sql
-- This removes the affiliation column AFTER verifying all data is migrated
-- Only run after confirming Phase 2 is complete
```

### Phase 3: Deploy Code Changes

1. **Update TypeScript files:**
   - ✅ `send-verification-code/index.ts` - Already updated
   - ✅ `verify-code/index.ts` - Already updated
   - ✅ Schema migrations - Already updated

2. **Restart Edge Functions:**
   ```bash
   # If using Supabase CLI:
   supabase functions deploy send-verification-code
   supabase functions deploy verify-code
   ```

3. **No frontend changes needed:**
   - ✅ RegisterPage already uses department_id
   - ✅ UserManagement already uses department_id

---

## Data Flow After Consolidation

### Registration Flow (Simplified)
```
User Registration Form
    ↓
Select Department (required) ← departments table
    ↓
register-user edge function
    ↓
Create user with department_id
    ↓
users table (department_id filled, affiliation = NULL)
```

### Querying Users by Department
```sql
-- NEW (correct way)
SELECT u.*, d.name as department_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE d.name = 'Engineering';

-- OLD (won't work anymore)
SELECT * FROM users WHERE affiliation = 'Engineering'; -- No affiliation field!
```

### IP Records by Department
```sql
-- Get records grouped by department
SELECT 
  d.name,
  COUNT(ip.id) as record_count
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
LEFT JOIN ip_records ip ON u.id = ip.applicant_id
GROUP BY d.id, d.name
ORDER BY record_count DESC;
```

---

## Rollback Plan (If Needed)

If you need to rollback, Supabase migrations are versioned. However:

1. **Before cleanup (Phase 2, step 3):**
   - Affiliation data still exists
   - Can re-migrate if needed

2. **After cleanup (Phase 2, step 3):**
   - Affiliation column is gone
   - Would need to restore from backup

**Recommendation:** Keep the affiliation column for 2-3 weeks before running the cleanup migration.

---

## Database Queries

### Get Department Statistics
```sql
SELECT 
  d.id,
  d.name,
  COUNT(u.id) as user_count,
  COUNT(DISTINCT ip.id) as ip_record_count,
  COUNT(CASE WHEN u.role = 'applicant' THEN 1 END) as applicant_count
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
LEFT JOIN ip_records ip ON u.id = ip.applicant_id
WHERE d.active = true
GROUP BY d.id, d.name
ORDER BY user_count DESC;
```

### Find Users Without Department
```sql
SELECT id, email, full_name, department_id 
FROM users 
WHERE department_id IS NULL
LIMIT 20;
```

### Verify Migration Success
```sql
-- Should return 0
SELECT COUNT(*) as orphaned_users 
FROM users 
WHERE department_id IS NULL;

-- Should return 0
SELECT COUNT(*) as affiliation_values 
FROM users 
WHERE affiliation IS NOT NULL;
```

---

## Troubleshooting

### Issue: "users.affiliation" column not found
**Solution:** The cleanup migration (Phase 2, step 3) has already run. This is expected. Update your queries to use `department_id` instead.

### Issue: Some users show "No Department"
**Solution:** These users had no affiliation. You can:
1. Leave them in "No Department"
2. Manually assign them a department
3. Query them: `SELECT * FROM users WHERE department_id = (SELECT id FROM departments WHERE name = 'No Department')`

### Issue: Duplicate department names created
**Solution:** The migration includes deduplication logic. If duplicates exist:
```sql
-- Merge duplicate departments
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE name = 'Engineering' LIMIT 1)
WHERE department_id IN (SELECT id FROM departments WHERE name = 'Engineering');

-- Delete duplicates
DELETE FROM departments 
WHERE name = 'Engineering' 
AND id NOT IN (SELECT id FROM departments WHERE name = 'Engineering' LIMIT 1);
```

---

## Testing Checklist

- [ ] Database backup created
- [ ] Consolidation migration runs successfully
- [ ] All users have department_id assigned (or clearly understand why they don't)
- [ ] No affiliation values remain in users table
- [ ] Edge functions deploy successfully
- [ ] New user registration selects department
- [ ] Existing users can view their department
- [ ] Department queries return correct results
- [ ] No application errors in browser console
- [ ] Certificate generation still works (uses department data)

---

## Files Modified Summary

### Database Migrations
- ✅ `20251115150428_create_ip_management_system_schema_v2.sql` - Updated users table
- ✅ `20251115192053_add_verification_codes_table.sql` - Removed affiliation
- ✅ `20251123190300_add_email_verification_system.sql` - Removed affiliation
- ✨ `20260119_consolidate_affiliation_to_department.sql` - NEW: Consolidation logic
- ✨ `20260119_remove_legacy_affiliation_column.sql` - NEW: Cleanup (run later)

### Edge Functions
- ✅ `send-verification-code/index.ts` - Removed affiliation parameter
- ✅ `verify-code/index.ts` - Removed affiliation from insert

### Frontend (No changes needed)
- ✅ `RegisterPage.tsx` - Already using department_id
- ✅ `UserManagement.tsx` - Already using department_id

---

## Post-Implementation

### Day 1
- Monitor for errors
- Verify new registrations include department
- Check department queries work

### Week 1
- Monitor error logs
- Verify data consistency
- Test certificate generation

### Week 2
- Run verification queries
- Confirm no code references affiliation
- Plan cleanup migration timing

### Week 2-3
- Execute cleanup migration (Phase 2, step 3)
- This permanently removes affiliation column
- Update documentation

---

## Related Documentation

- [DEPARTMENT_AND_AFFILIATION_DATA_ANALYSIS.md](DEPARTMENT_AND_AFFILIATION_DATA_ANALYSIS.md) - Original analysis
- Supabase Migrations: `supabase/migrations/`
- Edge Functions: `supabase/functions/`

---

**Status:** Ready to implement  
**Estimated Time:** 15-30 minutes  
**Risk Level:** Low (with backup)

