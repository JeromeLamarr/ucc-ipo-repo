# 🚀 Quick Fix Instructions

## Issues Resolved ✅

1. **"Failed to complete submission: fetchRecord is not defined"** → FIXED
2. **"Failed to generate certificate: Missing required fields"** → FIXED  
3. **Documents not showing for Supervisor/Evaluator** → Code FIXED (RLS pending)
4. **History gone for Supervisor/Evaluator** → Code FIXED (RLS pending)
5. **Button accessibility error** → FIXED

---

## What You Need To Do NOW

### Step 1: Apply RLS Migration in Supabase

1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy this SQL and run it:

```sql
BEGIN;

-- Drop old policies
DROP POLICY IF EXISTS "Applicants view own documents" ON ip_documents;
DROP POLICY IF EXISTS "Applicants upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view all documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins view tracking" ON process_tracking;
DROP POLICY IF EXISTS "Applicants view tracking" ON process_tracking;

-- New ip_documents policies
CREATE POLICY "Applicants view own documents" ON ip_documents
FOR SELECT TO authenticated
USING (uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Applicants upload documents" ON ip_documents
FOR INSERT TO authenticated
WITH CHECK (uploader_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Supervisors view documents" ON ip_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = ip_documents.ip_record_id
  AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

CREATE POLICY "Evaluators view documents" ON ip_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = ip_documents.ip_record_id
  AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

CREATE POLICY "Admins view all documents" ON ip_documents
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

-- New process_tracking policies
CREATE POLICY "Applicants view their tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = process_tracking.ip_record_id
  AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

CREATE POLICY "Supervisors view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = process_tracking.ip_record_id
  AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

CREATE POLICY "Evaluators view tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ip_records
  WHERE ip_records.id = process_tracking.ip_record_id
  AND ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
));

CREATE POLICY "Admins view all tracking" ON process_tracking
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins and supervisors insert tracking" ON process_tracking
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = auth.uid() 
  AND role IN ('admin', 'supervisor')
));

COMMIT;
```

**Expected Result**: `Query executed successfully` ✅

### Step 2: Test Everything

1. **Hard refresh browser**: Ctrl+Shift+R
2. **Test as Supervisor**:
   - Go to Supervisor Dashboard
   - Open submission → should see **documents now** ✅
   - Should see **process history timeline** ✅
   - Approve submission → works with no errors ✅

3. **Test as Evaluator**:
   - Go to Evaluator Dashboard
   - Open submission → should see **documents** ✅
   - Should see **process history** ✅
   - Submit evaluation → works ✅

4. **Test as Admin**:
   - Open submission
   - Click "Generate Certificate" → should work ✅
   - No more "Missing required fields" error ✅

---

## What Was Fixed

### Code Level (Already Done ✅)
- ✅ Fixed function name error (`fetchRecord` → `fetchSubmissionDetails`)
- ✅ Fixed certificate payload (camelCase → snake_case)
- ✅ Added history display component
- ✅ Added role-based document filtering
- ✅ Fixed button accessibility

### Database Level (You Need To Apply 👇)
- ⏳ Apply RLS policies for documents visibility
- ⏳ Apply RLS policies for history visibility

---

## Status

**Code**: ✅ Committed and pushed to GitHub (commit `e83bfdf`)  
**Database**: ⏳ Waiting for you to run the SQL

**After you run the SQL**: Everything will work! 🎉
