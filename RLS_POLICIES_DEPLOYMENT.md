# RLS Policy Deployment Instructions

## Status: ⏳ READY TO APPLY

This document provides step-by-step instructions for applying the RLS (Row Level Security) policy fixes to your Supabase database.

---

## Prerequisites

✅ All code changes deployed
✅ Validation utilities in place
✅ All microservices updated
⏳ **RLS policies need to be applied** ← **YOU ARE HERE**

---

## What These Policies Do

### Document Access (ip_documents)
| Role | Can Do | Condition |
|------|--------|-----------|
| Applicant | View their own documents | `uploader_id = current_user` |
| Applicant | Upload documents | `uploader_id = current_user` |
| Supervisor | View documents | Record assigned to them as supervisor |
| Evaluator | View documents | Record assigned to them as evaluator |
| Admin | View all documents | User has admin role |

### Tracking History (process_tracking)
| Role | Can Do | Condition |
|------|--------|-----------|
| Applicant | View their tracking | Record belongs to them |
| Supervisor | View tracking | Record assigned to them as supervisor |
| Evaluator | View tracking | Record assigned to them as evaluator |
| Admin | View all tracking | User has admin role |
| Admin/Supervisor | Insert tracking | User is admin or supervisor |

---

## Application Steps

### Option 1: Manual SQL Execution (Recommended for First-Time)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in left sidebar
   - Click **New Query** button

3. **Copy and Paste the SQL**
   - Navigate to: `supabase/migrations/20251126_fix_rls_policies_for_document_tracking_visibility.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor

4. **Execute the Query**
   - Click **Run** button (or Ctrl+Enter)
   - Expected result: `Query executed successfully` ✅

5. **Verify Execution**
   - You should see no errors
   - Check Table Editor → ip_documents → Policies tab
   - Should show 5 policies for ip_documents
   - Check Table Editor → process_tracking → Policies tab
   - Should show 5 policies for process_tracking

### Option 2: Supabase CLI (For Automated Deployment)

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Run Migrations**
   ```bash
   supabase db push
   ```

---

## Post-Application Verification

### Step 1: Check Policies Are Applied

1. Open Supabase Dashboard
2. Go to **Table Editor**
3. Click on **ip_documents** table
4. Click **Policies** tab
5. Verify 5 policies exist:
   - ✅ Applicants view own documents
   - ✅ Applicants upload documents
   - ✅ Supervisors view documents
   - ✅ Evaluators view documents
   - ✅ Admins view all documents

6. Click on **process_tracking** table
7. Click **Policies** tab
8. Verify 5 policies exist:
   - ✅ Applicants view their tracking
   - ✅ Supervisors view tracking
   - ✅ Evaluators view tracking
   - ✅ Admins view all tracking
   - ✅ Admins and supervisors insert tracking

### Step 2: Test as Different Users

#### Test as Applicant
1. Log in as applicant user
2. Go to Dashboard → View your submissions
3. Click on a submission
4. ✅ Should see **Documents section** with your uploaded files
5. ✅ Should see **Process Tracking** timeline

#### Test as Supervisor
1. Log in as supervisor user
2. Go to Supervisor Dashboard
3. Open an assigned submission
4. ✅ Should see **Documents** for the submission
5. ✅ Should see **Process Tracking** timeline
6. ✅ Should be able to **review and approve**
7. ✅ Should see **remarks** field
8. ✅ Should be able to **add evaluation**

#### Test as Evaluator
1. Log in as evaluator user
2. Go to Evaluator Dashboard
3. Open an assigned submission
4. ✅ Should see **Documents** for the submission
5. ✅ Should see **Process Tracking** timeline
6. ✅ Should be able to **enter scores**
7. ✅ Should be able to **make decision**

#### Test as Admin
1. Log in as admin user
2. Go to Admin Dashboard
3. Open any submission
4. ✅ Should see **all documents** regardless of ownership
5. ✅ Should see **all process tracking**
6. ✅ Should be able to **generate certificate**
7. ✅ Should be able to **access all records**

### Step 3: Test Email Notifications

1. As supervisor, approve a submission
   - ✅ Applicant should receive **approval email**
   
2. As evaluator, submit evaluation
   - ✅ Applicant should receive **evaluation email**
   
3. As admin, complete a submission
   - ✅ Applicant should receive **completion email**

### Step 4: Check Console for Errors

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Submit an evaluation
4. ✅ Should be **no errors**
5. ✅ Should see success messages
6. ✅ Should see network requests succeed

---

## Common Issues & Fixes

### Issue: "Policy does not exist" error

**Cause**: Policy name is different or not applied correctly

**Fix**:
1. Go to SQL Editor in Supabase
2. Run this query to see all policies:
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename IN ('ip_documents', 'process_tracking')
   ORDER BY tablename, policyname;
   ```
3. If policies are missing, re-run the migration SQL

### Issue: "Permission denied" when viewing documents

**Cause**: RLS policies not applied or user not assigned to record

**Fix**:
1. Verify policies are applied (see Post-Application Verification)
2. Check that user is properly assigned as supervisor/evaluator
3. Check `ip_records` table that `supervisor_id` or `evaluator_id` is set

### Issue: "Failed to fetch documents"

**Cause**: Database query timeout or connection issue

**Fix**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check Supabase dashboard for database status
3. Check console for specific error message
4. If still fails, check that `users` table `auth_user_id` is correctly set

### Issue: Process tracking not showing

**Cause**: No process_tracking entries or RLS not applied

**Fix**:
1. Verify RLS policies are applied
2. Check that `process_tracking` table has entries for the record
3. Verify `ip_record_id` matches the record you're viewing

---

## Rollback Plan (If Issues Occur)

If you need to revert these changes:

1. Open Supabase SQL Editor
2. Run this query to remove all policies:
   ```sql
   -- Drop document policies
   DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
   DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
   DROP POLICY IF EXISTS "Supervisors view documents" ON ip_documents;
   DROP POLICY IF EXISTS "Evaluators view documents" ON ip_documents;
   DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;

   -- Drop tracking policies
   DROP POLICY IF EXISTS "Applicants view their tracking" ON process_tracking;
   DROP POLICY IF EXISTS "Supervisors view tracking" ON process_tracking;
   DROP POLICY IF EXISTS "Evaluators view tracking" ON process_tracking;
   DROP POLICY IF EXISTS "Admins view all tracking" ON process_tracking;
   DROP POLICY IF EXISTS "Admins and supervisors insert tracking" ON process_tracking;
   ```

3. After rollback, policies will need to be recreated before deployment

---

## Expected Results After Application

### Functionality Restored ✅
- ✅ Supervisors can view documents on assigned submissions
- ✅ Supervisors can see process tracking history
- ✅ Evaluators can view documents on assigned submissions
- ✅ Evaluators can see process tracking history
- ✅ Admins can view all documents and tracking
- ✅ Applicants see their own documents and tracking

### Emails Working ✅
- ✅ Emails send on supervisor approval
- ✅ Emails send on evaluator decision
- ✅ Emails send on admin completion
- ✅ No more silent failures

### Validation Working ✅
- ✅ Document uploads validated
- ✅ Evaluation scores validated
- ✅ Certificate generation authorized
- ✅ Clear error messages

---

## Performance Notes

These RLS policies use efficient subqueries with proper indexing:
- `ip_records.id` is indexed
- `ip_records.supervisor_id` is indexed
- `ip_records.evaluator_id` is indexed
- `ip_records.applicant_id` is indexed
- `users.auth_user_id` is indexed

Expected query time: < 100ms for most operations

---

## Support

If you encounter issues:

1. Check this document's "Common Issues & Fixes" section
2. Check browser console for error messages
3. Check Supabase dashboard for database errors
4. Verify all users have correct `role` values (supervisor, evaluator, admin, applicant)
5. Verify all assignments have correct `supervisor_id`, `evaluator_id` set

---

## Checklist

- [ ] Read this entire document
- [ ] Copy SQL from migration file
- [ ] Open Supabase SQL Editor
- [ ] Paste SQL and execute
- [ ] Verify policies are created (5 for each table)
- [ ] Test as applicant user
- [ ] Test as supervisor user
- [ ] Test as evaluator user
- [ ] Test as admin user
- [ ] Check console for errors
- [ ] Verify emails send
- [ ] ✅ **Done!**

---

**Status**: Ready for application
**Date**: November 26, 2025
**Estimated Time**: 5 minutes to apply + 10 minutes to verify
**Risk Level**: Low (non-breaking, permission-only changes)
