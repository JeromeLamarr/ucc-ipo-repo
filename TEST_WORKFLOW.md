# Testing Supervisor Approval Workflow Fix

This document outlines how to manually test the supervisor approval → evaluator assignment workflow.

## Test Scenario

**Goal**: Verify that when a supervisor approves a submission, the evaluator can immediately see it in their dashboard.

### Prerequisites

1. Have the application running at http://localhost:5173
2. Have test accounts set up:
   - **Applicant**: Someone who can submit IP records
   - **Supervisor**: Someone who reviews and approves submissions (role='supervisor')
   - **Evaluator**: Someone who evaluates approved submissions (role='evaluator', category_specialization matches submission category)

### Test Steps

#### Step 1: Applicant Creates Submission
1. Login as applicant
2. Go to "New Submission" page
3. Fill in the form:
   - Title: "Test Patent 2024"
   - Category: "Software" (or any category)
   - Description: "Test submission to verify workflow"
4. Click "Submit"
5. Note the submission ID/title
6. Verify submission appears in applicant's dashboard with status="submitted"

#### Step 2: Verify Supervisor Can See It
1. Logout and login as supervisor
2. Go to "Supervisor Dashboard"
3. Verify the submission appears in "Pending Submissions" list
4. Status should be "submitted" or "waiting_supervisor"

#### Step 3: Supervisor Approves Submission
1. Click on the submission in supervisor dashboard
2. Review the details
3. Select "Approve" action
4. Add remarks: "Approved for evaluation"
5. Click "Submit Review"
6. **CRITICAL**: Check browser console for:
   - No errors during update
   - Log message: "Successfully updated record: ..."
   - Log message: "Assigned [category] submission to evaluator ID: ..."

#### Step 4: Verify Database State
**In Supabase SQL Editor**, run this query (replace SUBMISSION_ID):

```sql
SELECT 
  id,
  title,
  status,
  evaluator_id,
  current_stage,
  category
FROM ip_records
WHERE id = 'SUBMISSION_ID';
```

Expected results:
- ✅ `status` = 'waiting_evaluation'
- ✅ `evaluator_id` = (should have a UUID, not NULL)
- ✅ `current_stage` = 'Approved by Supervisor - Waiting for Evaluation'

If `evaluator_id` is NULL, the fix didn't work.

#### Step 5: Verify Evaluator Can See It
1. Logout and login as evaluator (must have category_specialization matching the submission category)
2. Go to "Evaluator Dashboard"
3. Check "Submissions to Evaluate" section
4. **Expected**: The submission should appear immediately
5. If it doesn't appear:
   - Check browser console for errors
   - Check if evaluator_id is NULL in database (see Step 4)
   - Verify evaluator's category_specialization matches submission category

#### Step 6: Evaluator Reviews Submission
1. Click on the submission in the list
2. Verify all details loaded correctly:
   - Title, description, category all match
   - Attachments/documents visible
   - Status shows "Waiting for Evaluation"
3. Select an action (Approve/Reject/Request Revision)
4. Add remarks
5. Click "Submit Evaluation"
6. Verify submission moves to next stage

### Success Criteria

✅ **All criteria must pass**:
1. Supervisor approval is successful (no errors in console)
2. Database shows status='waiting_evaluation' AND evaluator_id is NOT NULL
3. Evaluator sees submission immediately in dashboard (no race condition)
4. Evaluator can click into and review the submission
5. Evaluator evaluation flow works

### Failure Diagnosis

**Problem**: Evaluator still doesn't see submissions after supervisor approval

**Check these in order**:

1. **Database state** (see Step 4 query):
   - Is `evaluator_id` NULL? → Fix didn't apply
   - Is `status` still 'submitted' or 'waiting_supervisor'? → Status update failed
   - Is `status` = 'waiting_evaluation' but `evaluator_id` = NULL? → Race condition still exists

2. **Browser console errors**:
   - Check for Supabase errors during "Submit Review"
   - Check for permission/RLS policy errors
   - Check for evaluator not found errors

3. **Evaluator account issues**:
   - Verify evaluator role in database: `SELECT id, role, category_specialization FROM users WHERE email = 'evaluator@email'`
   - Verify category_specialization matches submission category exactly
   - Verify evaluator is not a supervisor (could have multiple roles)

4. **Query issues**:
   - Run evaluator's query manually in SQL Editor:
   ```sql
   SELECT 
     id, title, status, evaluator_id, category 
   FROM ip_records 
   WHERE evaluator_id = 'EVALUATOR_UUID'
     AND status IN ('waiting_evaluation', 'evaluator_revision')
   ORDER BY created_at DESC;
   ```
   - Should return the newly approved submission

### Test Data Cleanup

After testing, you may want to delete test records:

```sql
-- Delete test submission and related records
DELETE FROM activity_logs WHERE ip_record_id = 'SUBMISSION_ID';
DELETE FROM supervisor_assignments WHERE ip_record_id = 'SUBMISSION_ID';
DELETE FROM evaluator_assignments WHERE ip_record_id = 'SUBMISSION_ID';
DELETE FROM notifications WHERE payload->>'ip_record_id' = 'SUBMISSION_ID';
DELETE FROM ip_records WHERE id = 'SUBMISSION_ID';
```

---

## Automated Testing (Optional)

If you want to write an automated test, the key assertions are:

```typescript
// After supervisor calls handleSubmitReview with action='approve'
const updatedRecord = await supabase
  .from('ip_records')
  .select('status, evaluator_id')
  .eq('id', recordId)
  .single();

// Both must be true at SAME TIME:
assert(updatedRecord.data.status === 'waiting_evaluation', 
  'Status not updated');
assert(updatedRecord.data.evaluator_id !== null, 
  'evaluator_id is NULL - RACE CONDITION');

// Evaluator query should return the record:
const evaluatorRecords = await supabase
  .from('ip_records')
  .select('*')
  .eq('evaluator_id', evaluatorId)
  .in('status', ['waiting_evaluation', 'evaluator_revision']);

assert(evaluatorRecords.data.length > 0, 
  'Evaluator cannot see the approved submission');
```

---

## Troubleshooting Commands

### Check supervisor approval logs
```sql
SELECT * FROM activity_logs 
WHERE action = 'supervisor_approval' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check evaluator assignments
```sql
SELECT * FROM evaluator_assignments 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check notifications sent
```sql
SELECT * FROM notifications 
WHERE type = 'assignment' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check all records with NULL evaluator_id
```sql
SELECT id, title, status, category, evaluator_id 
FROM ip_records 
WHERE status = 'waiting_evaluation' AND evaluator_id IS NULL;
```

---

## Expected Behavior After Fix

```
┌─────────────────────────────────────────────────────────────┐
│ Supervisor Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│ Pending Submissions                                         │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Test Patent 2024 (Software)          [Approve]       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Supervisor clicks Approve + adds remarks                   │
│                                                             │
│ Database Update (ATOMIC):                                  │
│   UPDATE ip_records SET                                    │
│     status = 'waiting_evaluation',                         │
│     evaluator_id = 'eva-uuid',                 ✅          │
│     current_stage = '...'                                  │
│   WHERE id = '...';                                        │
│                                                             │
│ Success! No race condition window                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Evaluator Dashboard                                         │
├─────────────────────────────────────────────────────────────┤
│ Submissions to Evaluate                                     │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Test Patent 2024 (Software)   Status: Waiting        │ ✅│
│ │ Assigned: Just now                                   │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Evaluator can see submission immediately                   │
└─────────────────────────────────────────────────────────────┘
```

Good luck with testing! 🚀
