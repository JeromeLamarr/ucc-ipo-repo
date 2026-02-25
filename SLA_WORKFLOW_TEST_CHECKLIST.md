# SLA Workflow Implementation - Test Checklist

## Overview
This checklist verifies that SLA (Service Level Agreement) tracking has been properly integrated across all workflow stages.

**Date:** 2026-02-25
**Status:** ✅ Implementation Complete - Ready for Testing

---

## Prerequisites

### Database
- ✅ `workflow_sla_policies` table exists with all 5 stages
- ✅ `workflow_stage_instances` table exists
- ✅ Helper functions exist: `create_stage_instance`, `close_stage_instance`, `get_sla_policy`
- ✅ RLS policies configured for `workflow_sla_policies`
- ✅ Edge function `check-overdue-stages` deployed

### Test Users
Ensure you have test accounts for:
- [ ] **Admin** (to manage SLA policies and view all stages)
- [ ] **Applicant** (to submit and resubmit)
- [ ] **Supervisor** (to review and request revisions)
- [ ] **Evaluator** (to evaluate and approve)

---

## Test Scenario 1: Initial Submission → Supervisor Review

### Steps
1. **Login as Applicant**
2. **Create New Submission**
   - Go to `/dashboard/submit`
   - Fill in all required fields
   - Select a supervisor
   - Submit the form

### Expected Results
- [ ] Submission created with status `waiting_supervisor`
- [ ] SQL check: New row in `workflow_stage_instances`
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<new_record_id>'
  AND stage = 'supervisor_review'
  AND status = 'ACTIVE';
  ```
- [ ] `assigned_user_id` = supervisor's user ID
- [ ] `due_at` = `started_at` + SLA duration_days (default 1 day)
- [ ] Console logs show: `"Created initial SLA stage instance"`

---

## Test Scenario 2: Supervisor Approval → Evaluation

### Steps
1. **Login as Supervisor**
2. **Navigate to Review Queue**
3. **Select a Submission**
4. **Click Approve** and provide remarks

### Expected Results
- [ ] Status changes to `waiting_evaluation`
- [ ] SQL check: Previous stage closed
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage = 'supervisor_review'
  AND status = 'COMPLETED';
  ```
- [ ] SQL check: New evaluation stage created
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage = 'evaluation'
  AND status = 'ACTIVE';
  ```
- [ ] `assigned_user_id` = evaluator's user ID
- [ ] `due_at` = started_at + 10 days (default evaluation SLA)
- [ ] Console logs show: `"Closed supervisor_review stage instance"` and `"Created evaluation stage instance"`

---

## Test Scenario 3: Supervisor Requests Revision

### Steps
1. **Login as Supervisor**
2. **Select a Submission**
3. **Click "Request Revision"** and provide feedback

### Expected Results
- [ ] Status changes to `supervisor_revision`
- [ ] SQL check: supervisor_review stage closed (COMPLETED)
- [ ] SQL check: New revision_requested stage created
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage = 'revision_requested'
  AND status = 'ACTIVE';
  ```
- [ ] `assigned_user_id` = applicant's user ID
- [ ] `due_at` = started_at + 14 days (default revision SLA)
- [ ] `grace_days` = 3 (applicant stage)
- [ ] Console logs show SLA stage creation

---

## Test Scenario 4: Applicant Resubmits After Revision

### Steps
1. **Login as Applicant**
2. **Open Submission in Revision Status**
3. **Click "Edit Submission"**
4. **Make Changes and Click "Resubmit"**

### Expected Results
- [ ] Status changes back to `waiting_supervisor` or `waiting_evaluation`
- [ ] SQL check: revision_requested stage closed (COMPLETED)
- [ ] SQL check: New stage created (supervisor_review or evaluation)
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage IN ('supervisor_review', 'evaluation')
  AND status = 'ACTIVE'
  ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Correct `assigned_user_id` based on workflow path
- [ ] Console logs show: `"Closed revision stage instance"` and `"Created <next> stage instance"`

---

## Test Scenario 5: Evaluator Approval → Materials Requested

### Steps
1. **Login as Evaluator**
2. **Navigate to Evaluations**
3. **Select a Submission**
4. **Provide Evaluation and Click "Approve"**

### Expected Results
- [ ] Status changes to materials workflow stage
- [ ] SQL check: evaluation stage closed (COMPLETED)
- [ ] SQL check: materials_requested stage created
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage = 'materials_requested'
  AND status = 'ACTIVE';
  ```
- [ ] `assigned_user_id` = applicant's user ID
- [ ] `due_at` = started_at + 7 days (default materials SLA)
- [ ] `grace_days` = 2
- [ ] Console logs show SLA tracking

---

## Test Scenario 6: Applicant Submits Materials

### Steps
1. **Login as Applicant**
2. **Open Submission Requiring Materials**
3. **Upload Poster and Paper Files**
4. **Click "Submit Materials"**

### Expected Results
- [ ] Materials submission successful
- [ ] SQL check: materials_requested stage closed (COMPLETED)
- [ ] SQL check: certificate_issued stage created
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage = 'certificate_issued'
  AND status = 'ACTIVE';
  ```
- [ ] `assigned_user_id` can be NULL or admin user
- [ ] `due_at` = started_at + 3 days (default certificate SLA)
- [ ] Edge function logs show: `"Created certificate_issued stage instance"`

---

## Test Scenario 7: Admin Marks Completion

### Steps
1. **Login as Admin**
2. **Navigate to All Records** (`/dashboard/records`)
3. **Select an Approved Submission**
4. **Click "Mark as Completed"**

### Expected Results
- [ ] Status changes to `ready_for_filing`
- [ ] SQL check: certificate_issued stage closed (COMPLETED)
  ```sql
  SELECT * FROM workflow_stage_instances
  WHERE ip_record_id = '<record_id>'
  AND stage = 'certificate_issued'
  AND status = 'COMPLETED';
  ```
- [ ] `completed_at` timestamp set
- [ ] Console logs show: `"Closed certificate_issued stage instance"`
- [ ] No new stage instances created (workflow complete)

---

## Test Scenario 8: Admin SLA Policy Management

### Steps
1. **Login as Admin**
2. **Navigate to** `/dashboard/sla-policies`
3. **View All SLA Policies**

### Expected Results
- [ ] Page loads without errors
- [ ] Shows 5 SLA policies:
  - supervisor_review
  - evaluation
  - revision_requested
  - materials_requested
  - certificate_issued
- [ ] Each policy displays:
  - Duration (days)
  - Grace Period (days)
  - Allow Extensions checkbox
  - Max Extensions (if enabled)
  - Extension Days (if enabled)
- [ ] Save button present for each policy

### Modify a Policy
4. **Change "evaluation" duration from 10 to 12 days**
5. **Click Save**

### Expected Results
- [ ] Success message displays: `"✓ SLA policy for 'Evaluation' updated successfully!"`
- [ ] SQL check: Policy updated
  ```sql
  SELECT duration_days FROM workflow_sla_policies
  WHERE stage = 'evaluation';
  -- Should return 12
  ```
- [ ] Blue info box visible explaining changes only affect NEW stages

---

## Test Scenario 9: Non-Admin Cannot Modify SLA Policies

### Steps
1. **Login as Applicant/Supervisor/Evaluator**
2. **Manually navigate to** `/dashboard/sla-policies`

### Expected Results
- [ ] Page shows "Access Denied" message
- [ ] Message states: "Only administrators can manage SLA policies"
- [ ] Red alert box with lock icon
- [ ] No form fields visible

---

## Test Scenario 10: ProcessTrackingWizard Shows SLA Info

### Steps
1. **Login as Applicant**
2. **Open Any Active Submission**
3. **View Process Tracking Section**

### Expected Results
- [ ] Process tracking wizard displays
- [ ] For each ACTIVE or COMPLETED stage, shows:
  - [ ] Stage name
  - [ ] Due date (formatted)
  - [ ] Days remaining (if ACTIVE)
  - [ ] "Overdue by X days" (if OVERDUE)
  - [ ] Red "EXPIRED" badge (if EXPIRED)
  - [ ] Visual indicator (color-coded based on status)
- [ ] Completed stages show completion date
- [ ] Console logs show fetched SLA policies and stage instances

---

## Test Scenario 11: Overdue Detection (Manual Trigger)

### Steps
1. **Create a test submission with short SLA duration**
2. **Wait for due date to pass** (or manually update `due_at` in database)
3. **Trigger overdue checker**:
   ```bash
   # Via Supabase Dashboard or curl
   curl -X POST https://[project].supabase.co/functions/v1/check-overdue-stages \
     -H "Authorization: Bearer [anon-key]"
   ```

### Expected Results
- [ ] Edge function executes successfully
- [ ] SQL check: Stage marked as OVERDUE
  ```sql
  SELECT status FROM workflow_stage_instances
  WHERE id = '<stage_instance_id>';
  -- Should return 'OVERDUE'
  ```
- [ ] Notification created in `notifications` table
- [ ] Email sent to assigned user (if configured)
- [ ] `notified_at` timestamp updated
- [ ] Console logs show: `"Marked stage <id> as OVERDUE"`

---

## Test Scenario 12: Grace Period Expiration (Applicant Stages)

### Steps
1. **Create revision_requested stage with past due_at**
2. **Wait until `due_at + grace_days` passes**
3. **Trigger overdue checker**

### Expected Results
- [ ] Stage marked as EXPIRED (not just OVERDUE)
- [ ] SQL check:
  ```sql
  SELECT status FROM workflow_stage_instances
  WHERE stage = 'revision_requested'
  AND ip_record_id = '<record_id>';
  -- Should return 'EXPIRED'
  ```
- [ ] EXPIRED notification sent with urgent messaging
- [ ] Email includes consequence: "submission may be closed/incomplete"
- [ ] Console logs show: `"Marked stage <id> as EXPIRED"`

---

## Verification Queries

### Check All Active Stage Instances
```sql
SELECT
  wsi.stage,
  wsi.status,
  wsi.started_at,
  wsi.due_at,
  wsi.assigned_user_id,
  ir.title,
  ir.reference_number,
  u.full_name as assigned_to
FROM workflow_stage_instances wsi
JOIN ip_records ir ON ir.id = wsi.ip_record_id
LEFT JOIN users u ON u.id = wsi.assigned_user_id
WHERE wsi.status = 'ACTIVE'
ORDER BY wsi.created_at DESC;
```

### Check SLA Policies
```sql
SELECT
  stage,
  duration_days,
  grace_days,
  allow_extensions,
  max_extensions,
  extension_days,
  is_active
FROM workflow_sla_policies
ORDER BY stage;
```

### Check Stage History for a Record
```sql
SELECT
  stage,
  status,
  started_at,
  due_at,
  completed_at,
  EXTRACT(DAY FROM (completed_at - started_at)) as days_taken
FROM workflow_stage_instances
WHERE ip_record_id = '<record_id>'
ORDER BY created_at ASC;
```

---

## Success Criteria

All of the following must be TRUE:

- ✅ All 12 test scenarios pass without errors
- ✅ SLA stage instances created at each workflow transition
- ✅ Previous stages properly closed before creating new ones
- ✅ ProcessTrackingWizard displays SLA deadlines correctly
- ✅ Admin can modify SLA policies via UI
- ✅ Non-admins cannot modify SLA policies
- ✅ Overdue detection works for both supervisor/evaluator stages
- ✅ EXPIRED detection works for applicant stages with grace periods
- ✅ Workflow continues even if SLA tracking fails (non-critical)
- ✅ Console logs show SLA operations in try/catch blocks
- ✅ Build completes without TypeScript errors

---

## Known Limitations

1. **SLA changes only affect NEW stages** - Existing active stages keep their original deadlines
2. **Manual date adjustment needed for testing** - Use SQL to backdate `due_at` for overdue testing
3. **Overdue checker requires cron job** - Set up Supabase cron or manual trigger for production
4. **Extensions not yet implemented in UI** - Extension functionality exists in schema but no UI yet

---

## Rollback Plan

If issues are found:

1. **Database rollback**: SLA tracking tables are separate; main workflow unaffected
2. **Code rollback**: All SLA calls are in try/catch blocks marked "non-critical"
3. **Disable RLS**: If RLS causes issues, temporarily disable on `workflow_sla_policies`:
   ```sql
   ALTER TABLE workflow_sla_policies DISABLE ROW LEVEL SECURITY;
   ```
4. **Remove SLA calls**: Comment out SLA tracking sections (marked with `// SLA TRACKING:`)

---

## Files Modified

### Frontend
- `src/pages/NewSubmissionPage.tsx` (initial submission)
- `src/pages/SubmissionDetailPage.tsx` (resubmission after revision)
- `src/components/CompletionButton.tsx` (completion/certificate stage)
- `src/pages/AdminSLAManagement.tsx` (NEW - admin UI)
- `src/App.tsx` (added route for `/dashboard/sla-policies`)

### Backend
- `supabase/functions/submit-presentation-materials/index.ts` (materials submission)
- `supabase/functions/check-overdue-stages/index.ts` (already existed, working)

### Database
- New migration: `add_rls_workflow_sla_policies.sql`

### Already Working (No Changes)
- `src/pages/SupervisorDashboard.tsx` (SLA already integrated)
- `src/pages/EvaluatorDashboard.tsx` (SLA already integrated)
- `src/components/ProcessTrackingWizard.tsx` (SLA display already working)

---

**Last Updated:** 2026-02-25
**Implementation Status:** ✅ COMPLETE - Ready for QA Testing
**Next Step:** Execute test scenarios 1-12 in order
