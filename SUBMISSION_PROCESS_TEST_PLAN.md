# Comprehensive Submission Process Test Plan

## Test Scenarios

### Scenario 1: Auto-Assignment of Evaluator (No Supervisor)
**Objective:** Verify evaluator is auto-assigned when applicant submits without supervisor selection.

**Setup:**
1. Create an evaluator account with:
   - Email: `evaluator.patent@test.edu`
   - Name: `Patent Evaluator`
   - Role: `evaluator`
   - Category Specialization: `patent`

2. Create an applicant account with:
   - Email: `applicant1@test.edu`
   - Name: `Test Applicant 1`

**Test Steps:**
1. Login as applicant
2. Create new submission:
   - Title: "AI Patent Test"
   - Category: **Patent** (must match evaluator specialization)
   - Abstract: "Testing auto-assignment"
   - Don't select any supervisor
3. Upload at least one document
4. Submit

**Expected Results:**
- ✅ IP record created with status: `submitted` → `waiting_evaluation`
- ✅ `current_stage`: "Waiting for Evaluation"
- ✅ `evaluator_id` set to Patent Evaluator's ID
- ✅ Evaluator receives notification
- ✅ Process tracking records creation

**Verification:**
```sql
SELECT status, current_stage, evaluator_id FROM ip_records 
WHERE title = 'AI Patent Test';
-- Should show: waiting_evaluation | Waiting for Evaluation | [evaluator_id]

SELECT COUNT(*) FROM evaluator_assignments 
WHERE ip_record_id = [record_id] AND evaluator_id = [evaluator_id];
-- Should return: 1
```

---

### Scenario 2: Supervisor Assignment and Auto-Evaluator Assignment
**Objective:** Verify evaluator is auto-assigned after supervisor approves.

**Setup:**
1. Create a supervisor account with:
   - Email: `supervisor1@test.edu`
   - Name: `Dr. Supervisor`
   - Role: `supervisor`

2. Use existing applicant and evaluator from Scenario 1

**Test Steps:**
1. Login as applicant
2. Create new submission:
   - Title: "Supervised Patent Test"
   - Category: **Patent**
   - Select Dr. Supervisor from dropdown
   - Submit with documents

3. Login as supervisor (Dr. Supervisor)
4. View pending submissions
5. Click "Approve"
6. Add remarks: "Looks promising for evaluation"
7. Submit

**Expected Results at Creation:**
- ✅ Status: `waiting_supervisor`
- ✅ `current_stage`: "Waiting for Supervisor Approval"
- ✅ `supervisor_id` set

**Expected Results After Supervisor Approval:**
- ✅ Status: `waiting_evaluation` (changed from waiting_supervisor)
- ✅ `current_stage`: "Approved by Supervisor - Waiting for Evaluation"
- ✅ `evaluator_id` now set to Patent Evaluator
- ✅ Process tracking entries created for both initial and evaluator assignment
- ✅ Emails sent to applicant and evaluator

**Verification:**
```sql
SELECT status, current_stage, supervisor_id, evaluator_id 
FROM ip_records 
WHERE title = 'Supervised Patent Test';
-- Should show: waiting_evaluation | Approved by Supervisor... | [supervisor_id] | [evaluator_id]
```

---

### Scenario 3: Evaluator Reviews Submission
**Objective:** Verify evaluator can see and review assigned submissions.

**Test Steps:**
1. Login as evaluator (Patent Evaluator)
2. Go to Evaluator Dashboard
3. Check "Evaluation Queue" - should see "Supervised Patent Test"
4. Click "View & Evaluate"
5. Review submission details
6. Score the submission:
   - Innovation: 8/10
   - Feasibility: 7/10
   - Market Potential: 8/10
   - Technical Merit: 9/10
7. Select decision: "Approve"
8. Add remarks: "Excellent technical approach"
9. Submit evaluation

**Expected Results:**
- ✅ Evaluation visible in queue (status = `waiting_evaluation`)
- ✅ Can view all submission details and documents
- ✅ Overall score calculated correctly: (8+7+8+9)/40 * 100 = 82.5%
- ✅ Grade auto-assigned based on score: "B+"
- ✅ Status updated: `evaluator_approved`
- ✅ `current_stage`: "Approved by Evaluator - Ready for Legal Filing"
- ✅ Applicant receives email notification

**Verification:**
```sql
SELECT status, current_stage FROM ip_records 
WHERE title = 'Supervised Patent Test';
-- Should show: evaluator_approved | Approved by Evaluator...

SELECT grade, score->>'overall' as overall_score FROM evaluations 
WHERE ip_record_id = [record_id];
-- Should show: B+ | 82.5
```

---

### Scenario 4: Applicant Resubmits After Supervisor Revision Request
**Objective:** Verify applicant can resubmit after revision request, and correct status transitions.

**Setup:**
Use Scenario 2 submission, but have supervisor request revision instead of approving.

**Test Steps:**
1. Login as supervisor
2. View the "Supervised Patent Test" submission
3. Select decision: "Request Revision"
4. Add remarks: "Please clarify the implementation details"
5. Submit

6. Login as applicant
7. Go to submission dashboard
8. Find "Supervised Patent Test"
9. Click "Edit Submission"
10. Update description with more details
11. Save changes

**Expected Results After Revision Request:**
- ✅ Status: `supervisor_revision`
- ✅ `current_stage`: "Revision Requested by Supervisor"
- ✅ Edit button appears (previously disabled for pending statuses)

**Expected Results After Resubmission:**
- ✅ Status: `waiting_supervisor` (back to supervisor queue)
- ✅ `current_stage`: "Resubmitted - Waiting for Supervisor"
- ✅ Details object updated with new description
- ✅ Process tracking entry created for resubmission
- ✅ Supervisor receives notification

**Verification:**
```sql
SELECT status, current_stage FROM ip_records 
WHERE title = 'Supervised Patent Test';
-- After revision request: supervisor_revision | Revision Requested...
-- After resubmission: waiting_supervisor | Resubmitted - Waiting...

SELECT action FROM process_tracking 
WHERE ip_record_id = [record_id] 
ORDER BY created_at DESC LIMIT 5;
-- Should include: submission_resubmitted, supervisor_revision_request
```

---

### Scenario 5: Admin Marks Submission as Complete
**Objective:** Verify admin can complete a submission and certificate is generated.

**Test Steps:**
1. Login as admin
2. Go to Assignment Management or view submission
3. Find approved submission (status = `evaluator_approved`)
4. Click "Mark as Completed"
5. System should generate certificate

**Expected Results:**
- ✅ Status: `ready_for_filing`
- ✅ `current_stage`: "Completed - Ready for IPO Philippines Filing"
- ✅ Certificate generated and stored
- ✅ Email sent to applicant with certificate link
- ✅ Process tracking entry created

---

### Scenario 6: Evaluator Cannot See Non-Assigned Records
**Objective:** Verify RLS policies prevent evaluators from seeing other records.

**Test Steps:**
1. Login as Patent Evaluator
2. Go to Evaluator Dashboard
3. Verify only records with `evaluator_id` = Patent Evaluator's ID are visible
4. Create another applicant and submit with different category (copyright)
5. Try to access that record directly via URL
6. Should get "Not Found" or no data

**Expected Results:**
- ✅ Patent records visible in queue
- ✅ Non-patent or non-assigned records not visible
- ✅ RLS policy blocks unauthorized access

---

### Scenario 7: Status Progression Chain
**Objective:** Verify complete status progression from creation to filing.

**Flow:**
1. Applicant submits (status: submitted)
2. → Supervisor approves (status: waiting_evaluation)
3. → Evaluator approves (status: evaluator_approved)
4. → Admin completes (status: ready_for_filing)

**Expected Journey:**
```
submitted 
  → waiting_supervisor (if supervisor assigned)
  → supervisor_approved (supervisor action)
  → waiting_evaluation (auto-assigned evaluator)
  → evaluator_approved (evaluator action)
  → ready_for_filing (admin action)
  → completed (certificate issued)
```

---

## Issues Fixed in This Release

### 1. Evaluator Visibility Fix
**Problem:** Evaluators couldn't see assigned records because status remained `submitted` instead of `waiting_evaluation`
**Solution:** Updated NewSubmissionPage and SupervisorDashboard to set status to `waiting_evaluation` when evaluator is auto-assigned
**Files:** `src/pages/NewSubmissionPage.tsx`, `src/pages/SupervisorDashboard.tsx`

### 2. SubmissionDetailPage Status Detection
**Problem:** Used imprecise `.includes('supervisor')` checks causing false positives (e.g., 'evaluator_approved' contains 'supervisor')
**Solution:** Changed to explicit status comparisons for specific statuses
**Files:** `src/pages/SubmissionDetailPage.tsx`

### 3. Details Object Merge
**Problem:** When applicant resubmitted, details object was replaced entirely, losing existing fields
**Solution:** Used object spread operator to preserve existing fields
**Files:** `src/pages/SubmissionDetailPage.tsx`

### 4. Missing Process Tracking
**Problem:** Applicant resubmission didn't create process_tracking entry
**Solution:** Added process_tracking insert when applicant resubmits
**Files:** `src/pages/SubmissionDetailPage.tsx`

### 5. Duplicate Status in Query
**Problem:** SupervisorDashboard history query had 'evaluator_approved' listed twice
**Solution:** Removed duplicate and fixed status array to include meaningful history statuses
**Files:** `src/pages/SupervisorDashboard.tsx`

---

## Manual Testing Checklist

- [ ] Scenario 1: Auto-assignment without supervisor
- [ ] Scenario 2: Supervisor assignment with auto-evaluator assignment
- [ ] Scenario 3: Evaluator can see and review submissions
- [ ] Scenario 4: Applicant resubmit after revision request
- [ ] Scenario 5: Admin marks submission complete
- [ ] Scenario 6: RLS policies prevent unauthorized access
- [ ] Scenario 7: Complete status progression chain

## Automated Testing (if available)

- [ ] All status transitions have process_tracking entries
- [ ] All status changes send notification emails
- [ ] RLS policies correctly filter records
- [ ] Foreign keys maintain referential integrity
- [ ] No duplicate entries in assignment tables
