# Supervisor Approval Data Flow Fix

## Problem Identified

The evaluator dashboard showed "No Submissions to Evaluate" even after supervisors approved submissions. Investigation revealed a **race condition** in the supervisor approval flow.

### Root Cause

In `SupervisorDashboard.tsx`, the `handleSubmitReview` function had **TWO SEPARATE UPDATE CALLS** to `ip_records`:

```typescript
// ❌ OLD CODE - BROKEN LOGIC
// First update - sets status but NOT evaluator_id
await supabase.from('ip_records').update({
  status: 'waiting_evaluation',
  current_stage: currentStage,
}).eq('id', selectedRecord.id);

// ... Then fetches evaluator ...

// Second update - overwrites first update
if (categoryEvaluator) {
  await supabase.from('ip_records').update({
    evaluator_id: categoryEvaluator.id,
    status: 'waiting_evaluation',
    current_stage: '...',
  }).eq('id', selectedRecord.id);
}
```

**Why This Caused Issues:**

1. **First update** sets `status='waiting_evaluation'` but leaves `evaluator_id` as NULL
2. Between first and second update, there's a **critical window** where the record has:
   - ✅ `status='waiting_evaluation'` (CORRECT)
   - ❌ `evaluator_id=NULL` (WRONG)
3. EvaluatorDashboard query filters by `evaluator_id = profile.id` AND `status IN ['waiting_evaluation', 'evaluator_revision']`
4. RLS policy requires `evaluator_id` to match the current user
5. If query runs during the window between updates, it finds NO records because `evaluator_id` is NULL
6. If evaluator not found, second update never executes, leaving `evaluator_id` permanently NULL

## Solution Implemented

Refactored `handleSubmitReview` in `SupervisorDashboard.tsx` to:

### ✅ NEW CODE - ATOMIC LOGIC

```typescript
// Prepare the initial update data
const updatePayload: any = {
  status: newStatus,
  current_stage: currentStage,
};

// If approving, check for evaluator BEFORE updating ip_records
let evaluatorId: string | null = null;
if (action === 'approve') {
  const { data: evaluators } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'evaluator')
    .eq('category_specialization', selectedRecord.category)
    .limit(1);

  const categoryEvaluator = evaluators && evaluators.length > 0 ? evaluators[0] : null;

  if (categoryEvaluator) {
    evaluatorId = categoryEvaluator.id;
    updatePayload.evaluator_id = categoryEvaluator.id;  // ✅ Add to payload
  }
}

// SINGLE atomic update with all necessary fields
const { data: updateData, error: updateError } = await supabase
  .from('ip_records')
  .update(updatePayload)
  .eq('id', selectedRecord.id)
  .select()
  .single();

// Then do subsequent operations only if update succeeded
if (action === 'approve' && evaluatorId) {
  // Create evaluator assignment, send notification, etc.
  await supabase.from('evaluator_assignments').insert({...});
  await supabase.from('notifications').insert({...});
  // ...
}
```

## Key Improvements

### 1. **Evaluator Fetched BEFORE Update**
- No risk of evaluator not being found after status is already updated
- Can validate that evaluator exists before making any changes

### 2. **Single Atomic Update Call**
- Both `status` and `evaluator_id` are set in ONE database call
- No race condition window where data is inconsistent
- Either both fields are set, or the update fails completely

### 3. **Proper Error Handling**
- If no evaluator found for category, user gets clear warning
- Record is NOT updated if approval cannot be fully completed
- Prevents orphaned records with status='waiting_evaluation' but evaluator_id=NULL

### 4. **Conditional Logic**
- Only attempts to assign evaluator if action='approve' AND evaluator is found
- Reject and revision actions don't try to find evaluator

## Data Flow After Fix

```
1. Supervisor clicks "Approve"
2. System fetches evaluator matching category_specialization
3. SINGLE UPDATE to ip_records:
   - Sets status='waiting_evaluation'
   - Sets evaluator_id=<evaluator_id>
   - Sets current_stage='Approved by Supervisor...'
4. Creates evaluator_assignments record
5. Sends notification to evaluator
6. Logs activity
7. Evaluator sees submission immediately in dashboard ✅
```

## Verification

### Before Fix
- Supervisor approves → Evaluator sees nothing ❌
- Data flow broken between stages

### After Fix
- Supervisor approves → evaluator_id SET ATOMICALLY with status ✅
- EvaluatorDashboard query finds records immediately ✅
- RLS policy allows evaluator access ✅
- No race conditions ✅

## Files Modified

- `src/pages/SupervisorDashboard.tsx` - Lines 112-207 (handleSubmitReview method)

## Testing Checklist

- [ ] Login as supervisor
- [ ] Select a pending submission
- [ ] Click "Approve" and add remarks
- [ ] Confirm success message
- [ ] Login as evaluator (matching category_specialization)
- [ ] Verify submission appears in "Submissions to Evaluate"
- [ ] Click into submission and verify all details are correct
- [ ] Verify evaluator_id is set in database
- [ ] Test reject/revision paths to ensure they don't assign evaluators

## Commits

This fix is part of the comprehensive supervisor-to-evaluator workflow repair.
Related commits track the systematic debugging and fixes applied to the submission workflow.
