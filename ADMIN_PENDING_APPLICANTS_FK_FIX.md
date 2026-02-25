# Admin Pending Applicants - FK Join Fix

## Issue
The edge function was returning a 500 error:
```
"relationship was not found for 'users' and 'departments'"
```

Even though the FK constraint `users_department_id_fkey` exists in the database.

## Root Cause
PostgREST requires **explicit foreign key constraint names** when performing embedded joins, especially when multiple FK constraints exist between tables.

**Incorrect syntax:**
```javascript
.select(`
  id,
  email,
  full_name,
  department_id,
  created_at,
  departments(name)  // ❌ Ambiguous - PostgREST can't find the relationship
`)
```

## Solution
Use the **explicit FK constraint name** with an alias:

```javascript
.select(`
  id,
  email,
  full_name,
  department_id,
  created_at,
  department:departments!users_department_id_fkey(name)  // ✅ Explicit FK reference
`)
```

### Syntax Breakdown
- `department:` - Alias for the joined data
- `departments` - Target table name
- `!users_department_id_fkey` - Explicit FK constraint name
- `(name)` - Columns to select from departments table

## Changes Made

### 1. Edge Function Query (get-pending-applicants/index.ts)

**Before:**
```javascript
.select(`
  id,
  email,
  full_name,
  department_id,
  created_at,
  departments(name)
`)
```

**After:**
```javascript
.select(`
  id,
  email,
  full_name,
  department_id,
  created_at,
  department:departments!users_department_id_fkey(name)
`)
```

### 2. Data Transformation

**Before:**
```javascript
department_name: user.departments?.name || 'N/A',
```

**After:**
```javascript
department_name: user.department?.name || 'N/A',
```

### 3. Enhanced Error Logging

Added full error object logging:
```javascript
console.error('[get-pending-applicants] Query error:', {
  message: fetchError.message,
  details: fetchError.details,
  hint: fetchError.hint,
  code: fetchError.code,
  full_error: JSON.stringify(fetchError, null, 2),  // ✅ Full error details
});
```

## Verification

### Foreign Key Constraint Check
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'users'
  AND kcu.column_name = 'department_id';
```

**Result:**
- Constraint: `users_department_id_fkey`
- Source: `users.department_id`
- Target: `departments.id`
- ✅ Confirmed FK exists

### Test Query (SQL)
```sql
SELECT
  u.id,
  u.email,
  u.full_name,
  u.department_id,
  u.created_at,
  d.name as department_name
FROM users u
LEFT JOIN departments d ON d.id = u.department_id
WHERE u.role = 'applicant'
  AND u.is_approved = false
  AND u.rejected_at IS NULL;
```

**Result:** ✅ Returns 1 pending applicant with department name

## Expected Behavior After Fix

### Edge Function Response
```json
{
  "success": true,
  "applicants": [
    {
      "id": "15e48291-2c74-4e7f-a61e-64cf62dfa605",
      "email": "jeromelamarr090494@icloud.com",
      "full_name": "jermaine cole",
      "department_id": "58aaeba6-c490-4799-b5ae-2c9371cd3999",
      "created_at": "2026-02-25T02:36:31.307608+00:00",
      "department_name": "Computer studies Department"
    }
  ],
  "count": 1
}
```

### Console Logs
```
[get-pending-applicants] Request received
[get-pending-applicants] User authenticated: c1647e70-3b8e-4762-835c-cdceff23985f
[get-pending-applicants] Admin verified, fetching pending applicants...
[get-pending-applicants] Found 1 pending applicants
[get-pending-applicants] Raw data: [{ ... }]
```

### Frontend Display
- ✅ Widget shows count: **1**
- ✅ Applicant card displays:
  - Name: jermaine cole
  - Email: jeromelamarr090494@icloud.com
  - Department: **Computer studies Department** ← Fixed!
  - Date/time submitted

## Why This Happens

PostgREST embedded resource selection requires explicit FK constraint names when:
1. Multiple FK constraints exist between tables
2. The relationship is ambiguous
3. Table has been altered and PostgREST cache needs refresh

### Related FK Constraints on users table
```
users_department_id_fkey → departments.id
fk_users_department_id → departments.id  (duplicate/legacy?)
```

Using the explicit constraint name removes ambiguity.

## Alternative Approaches (Not Used)

### Approach 1: No Join (Simpler but less efficient)
```javascript
// Fetch users only
const { data: users } = await serviceClient
  .from('users')
  .select('id, email, full_name, department_id, created_at')
  .eq('role', 'applicant')
  .eq('is_approved', false)
  .is('rejected_at', null);

// Fetch department names separately
const deptIds = users.map(u => u.department_id).filter(Boolean);
const { data: depts } = await serviceClient
  .from('departments')
  .select('id, name')
  .in('id', deptIds);

// Merge manually
```
**Not chosen:** More code, multiple queries

### Approach 2: Raw SQL via execute
```javascript
const { data } = await serviceClient.rpc('get_pending_applicants');
```
**Not chosen:** Requires creating stored procedure

## Deployment Status

- ✅ Edge function updated with explicit FK constraint
- ✅ Enhanced error logging added
- ✅ Edge function redeployed successfully
- ✅ Ready for testing

## Testing

1. Login as admin: `admin@ucc-ipo.com`
2. Go to Admin Dashboard
3. Check "Pending Applicants" widget
4. **Expected:** Shows 1 pending applicant with department name
5. **Console:** No errors, shows success logs

## Reference

PostgREST documentation on Resource Embedding:
https://postgrest.org/en/stable/references/api/resource_embedding.html#specifying-the-foreign-key

Key quote:
> "If there are multiple foreign keys between two tables, you need to specify which one to use by adding the foreign key constraint name"

---

**Fixed:** 2026-02-25
**Status:** ✅ DEPLOYED - FK constraint explicitly referenced
**Priority:** HIGH - Critical fix for admin functionality
