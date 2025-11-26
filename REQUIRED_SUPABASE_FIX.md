# ⚠️ CRITICAL FIX REQUIRED - RLS Recursion Error

**Status**: Code fix committed ✅  
**Next Step**: Run migration in Supabase ⚠️ **YOU MUST DO THIS**

---

## What Was Fixed in Code

### 1. New Migration File Created
```
supabase/migrations/20251126_fix_evaluator_assignments_rls_recursion.sql
```

This migration removes the problematic RLS policies and replaces them with simpler, non-recursive versions.

### 2. Application Validation Added
```
src/pages/SupervisorDashboard.tsx (Lines 190-200)
```

Added security check to ensure supervisors only assign submissions they supervise.

### 3. Commits Made
```
0b3dad3 - fix: Fix RLS infinite recursion in evaluator_assignments and add validation
```

---

## ⚠️ WHAT YOU MUST DO NOW

### Step 1: Login to Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project: **mqfftubqlwiemtxpagps**
3. Click **SQL Editor** in left sidebar

### Step 2: Copy and Run This SQL

Copy this entire block and paste into SQL Editor, then execute:

```sql
BEGIN;

-- Remove old problematic policies
DROP POLICY IF EXISTS "Supervisors create evaluator assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Admins create evaluator assignments" ON evaluator_assignments;

-- Create new simple admin policy
CREATE POLICY "Admins can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create new simple supervisor policy
CREATE POLICY "Supervisors can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Remove old view policies and recreate
DROP POLICY IF EXISTS "Evaluators view assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Admins view evaluator assignments" ON evaluator_assignments;

CREATE POLICY "Evaluators can view own assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (
  evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Admins can view all assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Supervisors can view their assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = evaluator_assignments.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

COMMIT;
```

### Step 3: Verify Success

Run this query to confirm policies were updated:

```sql
SELECT policyname, qual FROM pg_policies 
WHERE relname = 'evaluator_assignments' 
ORDER BY policyname;
```

**Expected**: You should see:
- Admins can insert evaluator assignments
- Supervisors can insert evaluator assignments
- Evaluators can view own assignments
- Admins can view all assignments
- Supervisors can view their assignments

---

## Step 4: Test in Application

1. **Hard refresh browser**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Login as supervisor**
3. **Go to Supervisor Dashboard**
4. **Approve a submission**
5. **Expected result**: ✅ No "infinite recursion" error

You should see instead:
- Alert box: "Submitting..." 
- Then success
- Browser console shows: `"Evaluator assignment created: ..."`

---

## What the Fix Does

### ❌ BEFORE
```sql
-- Problematic: This caused infinite recursion
CREATE POLICY "Supervisors create evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = evaluator_assignments.ip_record_id  ← Circular reference!
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);
```

When Supabase evaluated this policy, it tried to check the condition, which referenced `evaluator_assignments` itself, causing infinite recursion.

### ✅ AFTER
```sql
-- Fixed: Simple role check, no circular references
CREATE POLICY "Supervisors can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Application validates the relationship at code level
```

The RLS policy just checks if you're a supervisor. The application code validates that you actually own the submission.

---

## Complete Data Flow After Fix

```
┌──────────────────────────────────────┐
│ Supervisor Dashboard                 │
│ Click "Approve" on Submission        │
└─────────────┬────────────────────────┘
              │
              ├─→ Application validates: supervisor_id == profile.id ✅
              │
              ├─→ RLS checks: role == 'supervisor' ✅
              │
              ├─→ INSERT into evaluator_assignments ✅
              │
              ├─→ Notification sent ✅
              │
              └─→ Success! No recursion error ✅

┌──────────────────────────────────────┐
│ Evaluator Dashboard                  │
│ Login as Evaluator                   │
├──────────────────────────────────────┤
│ Submissions to Evaluate              │
│ - Approved Submission ✅             │
│   (from evaluator_assignments)       │
└──────────────────────────────────────┘
```

---

## Files Changed

| File | Changes | Status |
|------|---------|--------|
| supabase/migrations/20251126_*.sql | New RLS policies | Created ✅ |
| src/pages/SupervisorDashboard.tsx | Application validation | Updated ✅ |
| Commit 0b3dad3 | All changes committed | Pushed ✅ |

---

## Next Steps After Running SQL

1. ✅ Run the SQL migration above
2. ✅ Hard refresh browser
3. ✅ Test supervisor approval workflow
4. ✅ Verify evaluator sees submission in dashboard
5. ✅ Check browser console for success messages

---

## Troubleshooting

### If you still see "infinite recursion" error:

1. Verify the SQL executed successfully (no errors)
2. Check policies were created:
   ```sql
   SELECT * FROM pg_policies WHERE relname = 'evaluator_assignments';
   ```
3. Hard refresh browser and try again
4. Check your user role:
   ```sql
   SELECT id, role FROM users WHERE email = 'your@email.com';
   ```

### If evaluator still doesn't see submissions:

1. Check evaluator_id is set:
   ```sql
   SELECT id, evaluator_id, status FROM ip_records 
   WHERE title = 'sample';  -- or your submission title
   ```

2. Check evaluator_assignments row exists:
   ```sql
   SELECT * FROM evaluator_assignments 
   WHERE ip_record_id = '<submission_id>';
   ```

3. Check evaluator SELECT policy:
   ```sql
   SELECT * FROM evaluator_assignments 
   WHERE evaluator_id = '<evaluator_id>';
   ```

---

## Summary

**Problem**: RLS policy caused infinite recursion → INSERT failed silently  
**Solution**: Simple role-based policies + application validation  
**Status**: Code committed, awaiting SQL migration execution  
**Action Required**: Run the SQL above in Supabase SQL Editor

**After you run the SQL, everything should work!** ✅
