# Applicant Approval Workflow - Bug Fix Deployment Checklist

## 📋 PRE-DEPLOYMENT (Before applying fixes)

### Database Audit
- [ ] **Backup Supabase database** via [dashboard.supabase.com](https://dashboard.supabase.com)
  - Settings → Backups → Create backup
- [ ] **Check current state of problematic user:**
  ```sql
  SELECT id, email, role, is_approved, created_at 
  FROM users 
  WHERE id = '67750368-eb29-4454-8618-0d618777439a';
  ```
  - Expected current state: `is_approved = TRUE` (bug)
- [ ] **Count existing applicants:**
  ```sql
  SELECT is_approved, COUNT(*) FROM users WHERE role='applicant' GROUP BY is_approved;
  ```
  - This will be your baseline

### Browser/Client Audit
- [ ] **Clear browser cache** for ucc-ipo.com
  - DevTools → Application → Clear storage
- [ ] **Note any test applicant accounts** in production with is_approved=TRUE
  - These will remain TRUE (backward compatible, no breaking changes)

---

## 🚀 DEPLOYMENT STEPS (In order, minimal risk)

### Step 1: Deploy Database Migration
```bash
# From project root (c:\Users\delag\Desktop\ucc ipo\project)
# This applies the new migration file: 20260225_fix_applicant_approval_defaults.sql

supabase db push

# Expected output:
# Applying migration: supabase/migrations/20260225_fix_applicant_approval_defaults.sql
# ✓ Migration completed successfully
```

**What this does:**
- Changes column default from `TRUE` to `FALSE`
- Updates `handle_verified_user()` trigger to explicitly set `is_approved=FALSE` for applicants
- Updates the DO block to handle existing unprocessed auth users

**Impact:**
- ✅ Non-breaking: Existing approved applicants remain `is_approved=TRUE`
- ✅ Forward-looking: All NEW applicants will be created with `is_approved=FALSE`

### Step 2: Deploy Frontend Code

Choose your shell and copy the exact command:

#### **PowerShell (Windows - Recommended for your environment)**
```powershell
# From project root in PowerShell

# Build first
npm run build

# Check if build succeeded, then deploy
if ($LASTEXITCODE -eq 0) { npm run deploy } else { Write-Host "Build failed. Fix errors above before deploying." -ForegroundColor Red }
```

**Alternative PowerShell (more verbose, easier to debug):**
```powershell
npm run build
$buildResult = $LASTEXITCODE

if ($buildResult -eq 0) {
  Write-Host "✓ Build successful. Starting deployment..." -ForegroundColor Green
  npm run deploy
} else {
  Write-Host "✗ Build failed. Cannot proceed with deployment." -ForegroundColor Red
  exit 1
}
```

#### **CMD (Command Prompt)**
```cmd
REM From project root in Command Prompt
npm run build && npm run deploy
```

#### **Bash / Git Bash / WSL**
```bash
# From project root in Bash
npm run build && npm run deploy
```

---

**What this does:**
- ProtectedRoute now includes `location.pathname !== '/pending-approval'` check
- Prevents infinite redirect loop when unapproved applicant visits /pending-approval

**Expected output:**
```
✓ Build successful
✓ 0 errors
✓ Deployment completed
```

**Testing locally first (optional):**

#### **PowerShell:**
```powershell
npm run dev

# In browser:
# 1. Create new applicant account
# 2. Login and verify /pending-approval renders (NOT blank screen)
# 3. Press F12, check Console tab - no red errors
```

#### **CMD or Bash:**
```cmd
npm run dev
REM Then test in browser as above
```

### Step 3: Verify Database State
Run SQL verification queries (see VERIFICATION_SCRIPT.sql):

```sql
-- Check 1: Verify column default changed
SELECT column_default FROM information_schema.columns 
WHERE table_name='users' AND column_name='is_approved' AND table_schema='public';
-- Expected: false

-- Check 2: Verify new applicants get is_approved=FALSE
SELECT role, is_approved, COUNT(*) FROM users 
WHERE role='applicant' GROUP BY role, is_approved;
-- Expected: Some with false (created after migration)

-- Check 3: No NULL values
SELECT COUNT(*) FROM users WHERE is_approved IS NULL;
-- Expected: 0
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### Manual Testing (5-10 minutes)

#### Test Case 1: New Applicant Registration
```
1. Navigate to: ucc-ipo.com/register
2. Fill in form with NEW email (e.g., test-2026-02-25@example.com)
3. Submit → should go to email verification page
4. Click link in verification email
5. Expected result:
   ✅ Redirect to /pending-approval
   ✅ Page shows "Account Under Review" message
   ✅ NO blank white screen
   ✅ Buttons visible: "Back to Home", "Log Out"
6. Try accessing /dashboard:
   ✅ Should redirect back to /pending-approval
```

#### Test Case 2: Approved Applicant Access
```
Using ADMIN account:
1. Go to /dashboard → "Pending Applicants" section
2. Find the test applicant from Test Case 1
3. Click "Approve" button
4. Verify success message: "Applicant approved. Confirmation email sent"
5. Check email for approval notification

Using TEST APPLICANT account:
1. Log out (if still logged in)
2. Log back in with test applicant credentials
3. Expected result:
   ✅ Redirected to /dashboard (NOT /pending-approval)
   ✅ Can now submit IP records
   ✅ Database shows: is_approved=TRUE, approved_at=[timestamp], approved_by=[admin-id]
```

#### Test Case 3: Blank Screen Investigation (if encountered)
If you see a blank white page on /pending-approval:
1. Open browser DevTools: **F12**
2. Go to **Console** tab
3. Look for any red error messages
4. Report errors with screenshot to development team
5. **Temporary workaround:** Clear browser cache and restart browser

### Database Verification (Run all from Supabase SQL Editor)

```sql
-- Verification 1: Check the test applicant created in Test Case 1
SELECT id, email, role, is_approved, created_at, approved_at
FROM users 
WHERE email = 'test-2026-02-25@example.com';
-- Expected: is_approved=FALSE initially, then TRUE after approval

-- Verification 2: Confirm no applicants have is_approved=NULL
SELECT COUNT(*) as orphaned_records
FROM users 
WHERE role='applicant' AND is_approved IS NULL;
-- Expected: 0 (all applicants have explicit TRUE or FALSE)

-- Verification 3: Verify RLS prevents unapproved applicants from submitting
-- This is automatic - the RLS policies enforce it at DB level
-- Query: Check RLS function includes is_approved check
SELECT pg_get_functiondef(oid) FROM pg_proc 
WHERE proname='is_approved_applicant_or_privileged';
-- Expected: Should show the is_approved check in the logic
```

---

## 🔄 ROLLBACK PLAN (If major issues)

### If needing to rollback:
```bash
# Rollback the migration
supabase db push --remote-only

# Then manually reset the trigger (if needed):
# Run the original handle_verified_user() function from:
# supabase/migrations/20251212_auto_create_user_on_email_verified.sql
```

### Data integrity after rollback:
- ✅ Any applicants created while fix was active will retain `is_approved=FALSE`
- ✅ No data loss
- ✅ Can re-apply fix after resolution

---

## 📊 MONITORING (After deployment)

### What to watch for (24 hours post-deployment):

1. **New applicant registrations**
   - Check Supabase logs: Settings → Logs → Postgres logs
   - Filter: `handle_verified_user`
   - Should see new applicants being created with is_approved=FALSE

2. **Admin approval actions**
   - Check edge function logs:
     ```bash
     supabase functions logs approve-applicant --tail
     ```
   - Should see approvals being processed without errors

3. **Frontend errors**
   - Monitor browser error tracking (if using Sentry/similar)
   - Search for: `/pending-approval` or `ProtectedRoute`
   - Should be no new errors

4. **Email notifications**
   - Verify approval emails are being sent:
     ```bash
     supabase functions logs send-approval-email --tail
     ```

---

## 📝 SIGN-OFF

- [ ] Database migration applied successfully
- [ ] Frontend code deployed
- [ ] Test Case 1 (new applicant) passed
- [ ] Test Case 2 (approval workflow) passed
- [ ] Test Case 3 (no blank screen) passed
- [ ] All Verification SQL queries passed
- [ ] No errors in browser console
- [ ] No errors in function logs

**Deployment Status:** ______________________ (Date/Time)

**Deployed By:** ________________________________

**Verified By:** _________________________________

---

## 🆘 TROUBLESHOOTING

### Issue: Still seeing blank page on /pending-approval

**Root cause:** Cache or stale JavaScript

**Fix:**
```bash
# 1. Clear browser cache
#    DevTools → Application → Clear storage

# 2. Hard refresh
#    Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 3. Check console for errors
#    F12 → Console tab → look for red errors

# 4. Verify migration applied
#    Supabase Dashboard → SQL Editor → run:
#    SELECT column_default FROM information_schema.columns 
#    WHERE table_name='users' AND column_name='is_approved';
#    Should show: false
```

### Issue: New applicant created with is_approved=TRUE (fix didn't work)

**Root cause:** Trigger didn't apply or migration failed silently

**Fix:**
```bash
# 1. Check migration status
supabase db pull

# 2. Verify function was updated
supabase db diff

# 3. Re-apply migration
supabase db push --force-push

# 4. Check function definition
SELECT pg_get_functiondef(oid) FROM pg_proc 
WHERE proname='handle_verified_user';
# Should include: is_approved_val := CASE WHEN...
```

### Issue: Admin can't find pending applicants

**Root cause:** Pending applicants list query broken

**Fix:**
```bash
# Verify pending applicants index exists
SELECT * FROM information_schema.statistics 
WHERE table_name='users' AND column_name='is_approved';

# Manually query pending applicants
SELECT id, email, role, is_approved, created_at 
FROM users 
WHERE role='applicant' AND is_approved=FALSE 
ORDER BY created_at;
```

---

## 📚 RELATED DOCUMENTATION

- Architecture: [APPROVAL_WORKFLOW_UX_EMAIL_IMPLEMENTATION.md](../APPROVAL_WORKFLOW_UX_EMAIL_IMPLEMENTATION.md)
- Implementation: [APPLICANT_APPROVAL_WORKFLOW_IMPLEMENTATION.md](../APPLICANT_APPROVAL_WORKFLOW_IMPLEMENTATION.md)
- SQL Verification: [VERIFICATION_SCRIPT.sql](../VERIFICATION_SCRIPT.sql)
- Root Cause Analysis: This document's PRE-DEPLOYMENT section
