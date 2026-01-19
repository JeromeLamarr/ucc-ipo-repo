# Fix Supervisor Department Data - Catherine Llena Issue

**Issue:** Catherine Llena (Supervisor) has mixed up affiliation and department data  
**Root Cause:** Placeholder text in affiliation field instead of NULL; consolidation didn't clean up old data  
**Solution:** Clear placeholder values and ensure department_id is the only source of truth

---

## The Problem

### What You See
```
Catherine Llena
- Role: Supervisor
- Email: jeromelamarr0409@gmail.com
- Department: Computer studies Department (shown in UI)
- Affiliation: "No affiliation" (shown in supervisor selector)

Database Record:
- department_id: 58aaeba6-c490-4799-b5ae-2c9371cd3999 ✅ Set
- affiliation: "Enter your affiliation" ❌ Placeholder text (should be NULL)
```

### Why It's Wrong
After our consolidation, the system should work like this:
- `affiliation` should be NULL (legacy field, being phased out)
- `department_id` should point to the correct department
- UI should show department name, not placeholder text

### Current State ❌
- `affiliation` has placeholder text → UI shows "No affiliation"
- `department_id` is set → but UI doesn't show it correctly
- **Result:** Confusion in supervisor selector

---

## Fix for Catherine Llena

### Quick Fix (Single User)
Run in Supabase SQL Editor:

```sql
-- Fix Catherine Llena's record
UPDATE public.users
SET 
  affiliation = NULL,
  updated_at = now()
WHERE 
  email = 'jeromelamarr0409@gmail.com'
  AND full_name = 'Catherine Llena'
  AND role = 'supervisor';

-- Verify
SELECT id, email, full_name, role, department_id, affiliation
FROM public.users
WHERE email = 'jeromelamarr0409@gmail.com';
```

**Expected Result:**
```
affiliation: NULL ✅
department_id: 58aaeba6-c490-4799-b5ae-2c9371cd3999 ✅
```

---

## Fix ALL Supervisors/Evaluators/Admins

### Comprehensive Fix
Since this issue likely affects multiple users, run this audit first:

```sql
-- Step 1: Audit - Find all users with placeholder affiliation
SELECT 
  id,
  email,
  full_name,
  role,
  affiliation,
  department_id,
  CASE 
    WHEN affiliation LIKE 'Enter your%' THEN 'PLACEHOLDER - needs fix'
    WHEN affiliation IS NOT NULL AND affiliation != '' THEN 'Has text - check if needed'
    WHEN affiliation IS NULL AND department_id IS NOT NULL THEN 'CORRECT'
    ELSE 'UNKNOWN'
  END as status
FROM public.users
WHERE role IN ('supervisor', 'evaluator', 'admin', 'applicant')
ORDER BY status;
```

### Then Run the Fix

```sql
-- Step 2: Clear ALL placeholder affiliation values
UPDATE public.users
SET 
  affiliation = NULL,
  updated_at = now()
WHERE 
  affiliation LIKE 'Enter your%'
  OR affiliation LIKE 'Placeholder%'
  OR affiliation = ''
  OR affiliation = 'NULL'
  OR affiliation = 'None';

-- Step 3: Verify all supervisors have clean data
SELECT 
  id,
  email,
  full_name,
  role,
  d.name as department_name,
  affiliation,
  is_verified
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE role IN ('supervisor', 'evaluator', 'admin')
ORDER BY role, email;
```

---

## Verification

### Before Fix
```sql
SELECT 
  full_name,
  role,
  affiliation,
  department_id
FROM public.users
WHERE email = 'jeromelamarr0409@gmail.com';

-- Result:
-- Catherine Llena | supervisor | "Enter your affiliation" ❌ | 58aaeba6-c490...
```

### After Fix
```sql
SELECT 
  full_name,
  role,
  affiliation,
  d.name as department_name
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE email = 'jeromelamarr0409@gmail.com';

-- Result:
-- Catherine Llena | supervisor | NULL ✅ | Computer studies Department ✅
```

---

## Why This Happened

1. **Before Consolidation:** System had both `affiliation` and `department_id` fields
2. **Migration:** Moved affiliation values to `department_id`, but didn't clean placeholder values
3. **Result:** Some records retained placeholder text in affiliation field
4. **Solution:** Clear affiliation field completely (consolidation is complete)

---

## Prevention

### Update Frontend to Prevent This
When editing a supervisor/evaluator/admin, ensure:

```typescript
// Before submitting:
if (user.role === 'supervisor' || user.role === 'evaluator' || user.role === 'admin') {
  // Clear affiliation placeholder
  user.affiliation = null;  // ✅ Always NULL
  
  // Ensure department_id is set
  if (!user.department_id) {
    throw new Error('Department is required');
  }
}
```

### SQL Trigger to Auto-Clean (Optional)
```sql
CREATE OR REPLACE TRIGGER auto_clean_placeholder_affiliation
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION clean_placeholder_affiliation();

CREATE OR REPLACE FUNCTION clean_placeholder_affiliation()
RETURNS TRIGGER AS $$
BEGIN
  -- Clear placeholder text
  IF NEW.affiliation LIKE 'Enter your%' OR NEW.affiliation LIKE 'Placeholder%' THEN
    NEW.affiliation := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Steps

### Step 1: Backup (Always!)
```sql
-- Create backup of current state
SELECT * FROM public.users WHERE role IN ('supervisor', 'evaluator', 'admin')
INTO OUTFILE '/backup/supervisors_before_fix.csv';
```

### Step 2: Run Audit
```sql
-- See what needs fixing
SELECT * FROM public.users 
WHERE affiliation LIKE 'Enter your%' 
OR affiliation LIKE 'Placeholder%';
```

### Step 3: Apply Fix
```sql
-- Clear placeholder values
UPDATE public.users
SET affiliation = NULL
WHERE affiliation LIKE 'Enter your%'
   OR affiliation LIKE 'Placeholder%'
   OR affiliation = ''
   OR affiliation = 'NULL';
```

### Step 4: Verify
```sql
-- Check supervisor is now correct
SELECT full_name, role, department_id, affiliation 
FROM public.users 
WHERE role = 'supervisor'
ORDER BY email;
```

### Step 5: Monitor
- Check if UI now shows correct department
- Verify supervisor selector displays proper names
- Ensure no errors in application logs

---

## Expected Outcome

### Before
- UI shows: "Catherine Llena - No affiliation" (confusing!)
- Database has: placeholder text in affiliation

### After
- UI shows: "Catherine Llena - Computer studies Department" (clear!)
- Database has: NULL affiliation, department_id set correctly

---

## Quick Reference

| Field | Before | After | Status |
|-------|--------|-------|--------|
| `affiliation` | "Enter your affiliation" | NULL | ✅ Fixed |
| `department_id` | 58aaeba6-... | 58aaeba6-... | ✅ Unchanged |
| Department Name | (not shown) | Computer studies Department | ✅ Shows correctly |
| UI Display | "No affiliation" | Department name | ✅ Correct |

---

## Questions & Answers

**Q: Will this break anything?**  
A: No. The consolidation made `affiliation` obsolete. Clearing it finalizes that transition.

**Q: Should we delete the affiliation column?**  
A: Not yet. Keep it for 2-3 weeks in case rollback needed. Then run cleanup migration.

**Q: Will users lose their department assignment?**  
A: No. Department info is in `department_id`, not `affiliation`. This only clears junk data.

**Q: How do I know if other users have this issue?**  
A: Run the audit query provided - it will show all affected records.

---

**Status:** Ready to implement  
**Risk Level:** 🟢 LOW (cleanup only, no data loss)  
**Time Required:** 2-5 minutes
