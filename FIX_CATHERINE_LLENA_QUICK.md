# Fix Catherine Llena's Department Data - Step by Step

## The Issue (Visual)

```
BEFORE (Broken):
┌─────────────────────────────────────────────────────────┐
│ Catherine Llena (Supervisor)                            │
├─────────────────────────────────────────────────────────┤
│ • Email: jeromelamarr0409@gmail.com                     │
│ • Role: supervisor                                      │
│ • Department ID: 58aaeba6-c490-4799-b5ae-2c9371cd3999  │
│ • Affiliation: "Enter your affiliation" ❌ WRONG!      │
│ • UI Shows: "No affiliation" ❌ WRONG!                 │
└─────────────────────────────────────────────────────────┘

AFTER (Fixed):
┌─────────────────────────────────────────────────────────┐
│ Catherine Llena (Supervisor)                            │
├─────────────────────────────────────────────────────────┤
│ • Email: jeromelamarr0409@gmail.com                     │
│ • Role: supervisor                                      │
│ • Department ID: 58aaeba6-c490-4799-b5ae-2c9371cd3999  │
│ • Affiliation: NULL ✅ CORRECT!                        │
│ • UI Shows: "Computer studies Department" ✅ CORRECT!  │
└─────────────────────────────────────────────────────────┘
```

---

## How to Fix (Copy & Paste)

### Option 1: Quick Fix - Just Catherine Llena

Go to **Supabase → SQL Editor** and run this:

```sql
-- Clear placeholder affiliation for Catherine Llena
UPDATE public.users
SET affiliation = NULL
WHERE email = 'jeromelamarr0409@gmail.com';

-- Verify it's fixed
SELECT email, full_name, role, department_id, affiliation 
FROM public.users 
WHERE email = 'jeromelamarr0409@gmail.com';
```

**Expected Result:**
```
email: jeromelamarr0409@gmail.com
full_name: Catherine Llena
role: supervisor
department_id: 58aaeba6-c490-4799-b5ae-2c9371cd3999
affiliation: NULL ✅
```

---

### Option 2: Fix ALL Users with Placeholder Affiliation

If other users have the same issue, run this comprehensive fix:

```sql
-- Step 1: See how many users are affected
SELECT COUNT(*) as affected_count, role
FROM public.users
WHERE affiliation LIKE 'Enter your%'
   OR affiliation = ''
   OR affiliation = 'Placeholder'
GROUP BY role;

-- Step 2: Fix all placeholder affiliation values
UPDATE public.users
SET affiliation = NULL
WHERE affiliation LIKE 'Enter your%'
   OR affiliation = ''
   OR affiliation = 'Placeholder'
   OR affiliation = 'NULL';

-- Step 3: Verify all users are now clean
SELECT 
  full_name,
  role,
  department_id,
  d.name as department_name,
  affiliation,
  COUNT(*) as count
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
GROUP BY full_name, role, department_id, d.name, affiliation
ORDER BY role, full_name;
```

---

## Verification Checklist

Run these queries to verify everything is fixed:

### ✅ Check Catherine Llena's Record
```sql
SELECT * FROM public.users 
WHERE email = 'jeromelamarr0409@gmail.com';
```

**Should show:**
- `affiliation` = NULL or empty
- `department_id` = valid UUID
- `role` = supervisor

### ✅ Check All Supervisors
```sql
SELECT 
  email,
  full_name,
  role,
  d.name as department_name,
  affiliation
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE role IN ('supervisor', 'evaluator', 'admin')
ORDER BY email;
```

**Should show:**
- All `affiliation` values = NULL (or empty/clean)
- All have `department_name` filled
- No "Enter your..." placeholder text

### ✅ Find Any Remaining Issues
```sql
SELECT 
  email,
  full_name,
  role,
  affiliation,
  department_id
FROM public.users
WHERE (affiliation LIKE 'Enter your%' OR affiliation LIKE 'Placeholder%')
  AND role IN ('supervisor', 'evaluator', 'admin');
```

**Should return:** 0 rows (no results)

---

## After the Fix

### What Changes in the UI
```
BEFORE:
┌────────────────────────────────────────┐
│ Select Supervisor (Optional)           │
├────────────────────────────────────────┤
│ Catherine Llena - No affiliation ❌   │
│ [Dropdown open]                        │
└────────────────────────────────────────┘

AFTER:
┌────────────────────────────────────────┐
│ Select Supervisor (Optional)           │
├────────────────────────────────────────┤
│ Catherine Llena - Computer studies ... ✅│
│ [Dropdown open]                        │
└────────────────────────────────────────┘
```

---

## Troubleshooting

### If affiliation still shows placeholder text
**Solution:** Make sure the WHERE clause matches exactly. Check current value:

```sql
SELECT DISTINCT affiliation 
FROM public.users 
WHERE role = 'supervisor';
```

Then use that exact value in the UPDATE WHERE clause.

### If department name still doesn't show
**Solution:** Verify department_id exists in departments table:

```sql
SELECT d.id, d.name 
FROM public.departments d
WHERE id = '58aaeba6-c490-4799-b5ae-2c9371cd3999';
```

If no results, the department_id is invalid and needs to be corrected.

### If you accidentally cleared important data
**Solution:** Restore from backup or rollback:

```sql
-- Undo the last update
UPDATE public.users
SET affiliation = 'Enter your affiliation'
WHERE email = 'jeromelamarr0409@gmail.com'
AND role = 'supervisor';
```

---

## Root Cause Analysis

**Why did this happen?**

1. During the consolidation migration, placeholder values in the `affiliation` field were not cleaned up
2. Some supervisors/evaluators had never set their affiliation, leaving placeholder text
3. After consolidation, these fields should have been cleared to use only `department_id`
4. The UI was trying to display affiliation instead of the department name

**Prevention for future:**

1. Add validation to prevent placeholder text being saved
2. Use migration cleanup to remove all placeholder values
3. Update frontend to clear affiliation when editing users

---

## Summary

### To Fix Catherine Llena:

**Run this one query:**
```sql
UPDATE public.users
SET affiliation = NULL
WHERE email = 'jeromelamarr0409@gmail.com';
```

**Then verify:**
```sql
SELECT * FROM public.users WHERE email = 'jeromelamarr0409@gmail.com';
```

**Expected result:** `affiliation = NULL`, department shows correctly

---

**Time Required:** 1-2 minutes  
**Risk Level:** 🟢 LOW (just clearing bad data)  
**Reversible:** Yes (can restore if needed)

✅ **Ready to fix!**
