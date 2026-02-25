# Testing Guide: Admin Pending Applicants Widget

## Quick Test (2 minutes)

### Step 1: Login as Admin
1. Go to `/login`
2. Login with admin credentials:
   - Email: `admin@ucc-ipo.com`
   - Password: [your admin password]

### Step 2: Open Admin Dashboard
1. Navigate to `/dashboard` (Admin Dashboard)
2. Open browser DevTools (F12)
3. Go to **Console** tab

### Step 3: Check Widget
Look at the "Pending Applicants" widget (yellow card with clock icon)

**Expected Results:**
- ✅ Shows count badge: **1** (or actual number of pending applicants)
- ✅ No "Failed to load pending applicants" error
- ✅ Shows applicant card with:
  - Name: "jermaine cole"
  - Email: "jeromelamarr090494@icloud.com"
  - Department: "Computer studies Department"
  - Days waiting: "X days ago"
  - Approve/Reject buttons

**Console Logs Should Show:**
```
[AdminPendingApplicants] Fetching pending applicants via edge function...
[AdminPendingApplicants] User: admin@ucc-ipo.com | Role: admin
[AdminPendingApplicants] Edge function response status: 200
[AdminPendingApplicants] Success! Found: 1 pending applicants
[AdminPendingApplicants] Applicants: [{ ... }]
```

### Step 4: Test Actions

#### Approve Action
1. Click **Approve** button on the applicant card
2. ✅ Applicant disappears from list
3. ✅ Count updates to 0
4. ✅ Shows success message

#### Reject Action (Optional)
1. Click **Reject** button
2. Enter rejection reason (optional)
3. Click **Confirm Rejection**
4. ✅ Applicant disappears from list
5. ✅ Count updates

---

## If You See Errors

### Error: "Failed to load pending applicants"
**Check Console for:**
- Look for `[AdminPendingApplicants] ERROR:` messages
- Note the specific error message
- Share the full console output

### Error: "Authentication required"
**Solution:** Your session expired, refresh page and login again

### Error: "Admin access required"
**Check:**
1. You're logged in as admin user
2. Run this SQL to verify:
   ```sql
   SELECT email, role FROM users WHERE email = 'admin@ucc-ipo.com';
   -- Should show role='admin'
   ```

### Error: Network error / 500 status
**Check Edge Function Logs:**
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → `get-pending-applicants`
3. Click "Logs"
4. Look for error messages starting with `[get-pending-applicants]`

---

## Detailed Diagnostic Checks

### Check 1: Pending Applicants Exist
```sql
SELECT
  id,
  email,
  full_name,
  department_id,
  is_verified,
  is_approved,
  rejected_at
FROM users
WHERE role = 'applicant'
  AND is_approved = false
  AND rejected_at IS NULL;
```

**Expected:** At least 1 row returned

### Check 2: Edge Function Deployed
```bash
# Via Supabase CLI (if available)
supabase functions list

# Look for: get-pending-applicants [ACTIVE]
```

### Check 3: Admin User Exists
```sql
SELECT id, email, role, is_verified, is_approved
FROM users
WHERE role = 'admin';
```

**Expected:** admin@ucc-ipo.com with role='admin'

### Check 4: Test Edge Function Directly
```bash
# Using curl (replace with your project URL and token)
curl -X POST \
  https://[your-project].supabase.co/functions/v1/get-pending-applicants \
  -H "Authorization: Bearer [your-access-token]" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "success": true,
#   "applicants": [...],
#   "count": 1
# }
```

---

## Success Criteria

All of the following must be true:
- ✅ Widget shows correct count of pending applicants
- ✅ Widget displays applicant details (name, email, department)
- ✅ No error messages in UI
- ✅ Console shows successful fetch logs
- ✅ Approve/Reject actions work correctly

---

## Rollback (If Needed)

If the fix causes issues, you can rollback:

### 1. Revert Component to Direct Query
```javascript
// In src/components/AdminPendingApplicants.tsx
// Replace edge function call with:
const { data, error } = await supabase
  .from('users')
  .select('id, email, full_name, department_id, created_at')
  .eq('role', 'applicant')
  .eq('is_approved', false)
  .is('rejected_at', null)
  .order('created_at', { ascending: true });
```

### 2. Delete Edge Function
```bash
# Via Supabase CLI
supabase functions delete get-pending-applicants
```

---

## Report Results

After testing, report:

**✅ SUCCESS:**
- Widget works correctly
- Shows X pending applicants
- All actions work
- Console logs look good

**❌ FAILURE:**
- Error message: [copy exact message]
- Console logs: [copy relevant logs]
- Edge function logs: [if available]
- Screenshot of widget

---

**Last Updated:** 2026-02-25
**Edge Function:** get-pending-applicants
**Status:** Deployed and Ready
