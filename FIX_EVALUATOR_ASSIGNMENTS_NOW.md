# 🚨 CRITICAL: Fix Evaluator Assignments NOW

## The Problem

✅ Table exists: `evaluator_assignments` (confirmed in schema)  
✅ Code fix deployed: Application validation added  
❌ **Missing**: RLS policies in database haven't been updated  
❌ **Result**: INSERT still fails with "infinite recursion" error

## The Fix

**Copy this SQL and run it in Supabase SQL Editor RIGHT NOW:**

```sql
BEGIN;

-- Step 1: Remove the old problematic policies
DROP POLICY IF EXISTS "Supervisors create evaluator assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Admins create evaluator assignments" ON evaluator_assignments;

-- Step 2: Create simple role-based policies (no recursion)
CREATE POLICY "Admins can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Supervisors can insert evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'supervisor'
  )
);

-- Step 3: Remove old SELECT policies
DROP POLICY IF EXISTS "Evaluators view assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Admins view evaluator assignments" ON evaluator_assignments;

-- Step 4: Create new SELECT policies
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

## Steps to Execute

1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** on left
4. **New Query**
5. Paste the SQL above
6. Click **RUN**
7. Should see: `Query executed successfully` with no errors

## Verify It Worked

After running SQL, execute this query:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'evaluator_assignments'
ORDER BY policyname;
```

**Expected to see 5 policies:**
1. Admins can insert evaluator assignments
2. Admins can view all assignments
3. Evaluators can view own assignments
4. Supervisors can insert evaluator assignments
5. Supervisors can view their assignments

---

## Then Test

1. Hard refresh browser: **Ctrl+Shift+R**
2. Login as **Supervisor**
3. Go to **Supervisor Dashboard**
4. Click **Approve** on a submission
5. Should see: ✅ Success (no recursion error)
6. Check browser console (F12):
   - Should see: `"Evaluator assignment created: ..."`

---

## Why This Works

| Policy | Purpose | Recursion Risk? |
|--------|---------|-----------------|
| ❌ OLD: Check `WHERE ip_records.id = evaluator_assignments.ip_record_id` | Validate relationship | ⚠️ YES - Circular reference |
| ✅ NEW: Check `WHERE role = 'supervisor'` | Check user role | ✅ NO - Direct user table |

The new policy:
- ✅ Checks if user is a supervisor (simple query)
- ✅ Application code validates submission ownership
- ✅ No circular references
- ✅ No infinite recursion

---

## What's Deployed

| Component | Status | Location |
|-----------|--------|----------|
| New migration file | ✅ Ready | `supabase/migrations/20251126_fix_evaluator_assignments_rls_recursion.sql` |
| Application validation | ✅ Deployed | `src/pages/SupervisorDashboard.tsx` |
| Code pushed to GitHub | ✅ Done | Commit `0b3dad3` |
| Database SQL executed | ❌ **PENDING** | **YOU MUST RUN THIS** |

---

## Expected Result After Fix

```
Supervisor approves submission
    ↓
Application validates: supervisor owns this submission ✅
    ↓
RLS policy checks: user is supervisor ✅
    ↓
INSERT into evaluator_assignments ✅
    ↓
Send notification to evaluator ✅
    ↓
Evaluator sees assignment in dashboard ✅
```

---

**⚠️ THIS IS BLOCKING YOUR WORKFLOW**

Nothing will work until you run this SQL in Supabase. The evaluator_assignments table will remain empty.

**DO IT NOW** 👇
