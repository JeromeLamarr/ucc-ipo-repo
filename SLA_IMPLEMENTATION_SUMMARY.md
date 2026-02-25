# SLA Workflow Implementation Summary

**Date:** February 25, 2026  
**Implementation:** Time-frame/SLA deadlines for existing workflow  
**Status:** ✅ Complete - Ready for deployment and testing

---

## 📋 Overview

This implementation adds **SLA (Service Level Agreement) deadline tracking** to the existing IP workflow WITHOUT changing core business logic, statuses, or table structure.

**Key Principle:** Existing workflow continues unchanged. SLA tracking runs parallel.

---

## 🏗️ Architecture

### New Database Tables

#### 1. `workflow_sla_policies`
Stores configurable SLA settings per stage
```
Columns:
- stage (UNIQUE): supervisor_review, evaluation, revision_requested, materials_requested, certificate_issued
- duration_days: Base deadline (e.g., 7 days for supervisor_review)  
- grace_days: Additional time after due_at before OVERDUE status (e.g., 2 days)
- max_extensions: How many times a stage can be extended (0 = never)
- extension_days: Days added per extension
- allow_extensions: Boolean to enable/disable extensions
- is_active: Soft delete flag
```

**Current Defaults:**
- **SUPERVISOR_REVIEW:** 7 days + 2 day grace, up to 2 extensions
- **EVALUATION:** 10 days + 2 day grace, up to 2 extensions
- **REVISION_REQUESTED:** 14 days + 3 day grace, up to 3 extensions (applicant stage)
- **MATERIALS_REQUESTED:** 7 days + 2 day grace, up to 2 extensions (applicant stage)
- **CERTIFICATE_ISSUED:** 3 days + 0 grace, no extensions (admin/system stage)

#### 2. `workflow_stage_instances`
Tracks each time a record enters a stage
```
Columns:
- ip_record_id: Foreign key to ip_records
- stage: Which workflow stage this tracks
- assigned_user_id: Who owns this stage (supervisor, evaluator, or applicant)
- started_at: When the record entered this stage
- due_at: Calculated deadline (started_at + policy.duration_days)
- completed_at: When work on this stage finished (NULL while ACTIVE)
- status: ACTIVE | COMPLETED | OVERDUE | EXPIRED
  - ACTIVE: In progress, within deadline
  - COMPLETED: Finished, moved to next stage
  - OVERDUE: Past due_at, but within grace period
  - EXPIRED: Past due_at + grace_days (only for applicant stages)
- extensions_used: Count of granted extensions (0 initially)
- extended_until: Updated due_at if extended (NULL if not extended)
- notified_at: When overdue notification was last sent (prevents spam)
- notes: Admin notes about the stage
```

### New Edge Function

#### `check-overdue-stages`
Monitors ACTIVE stages and updates status when deadlines pass
- **Triggers:** Can be scheduled (hourly/daily) or invoked manually
- **Logic:**
  1. Find all ACTIVE stages with due_at < now()
  2. Mark as OVERDUE
  3. For applicant stages: if past grace_days, mark as EXPIRED
  4. Send notifications (rate-limited: max once per 24 hours per stage)
  5. Log all actions
- **Output:** JSON summary with counts (marked_overdue, marked_expired, notifications_sent)

### Helper Functions (SQL)

#### `get_sla_policy(stage)`
Retrieves active SLA policy for a stage

#### `close_stage_instance(record_id, status)`
Marks the ACTIVE stage instance as COMPLETED. Called when workflow transitions.

#### `create_stage_instance(record_id, stage, assigned_user_id)`
Creates a new ACTIVE stage instance with calculated due_at. Called when workflow enters a new stage.

### View

#### `current_stage_instance`
Shows the latest stage instance per record with calculated remaining/overdue days

---

## 🔗 Workflow Integration Points

### 1. **Supervisor Assignment** (AssignmentManagementPage)
When admin assigns supervisor to a record:
```typescript
// Existing code updates ip_records.supervisor_id
// NEW: Create supervisor_review stage instance
supabase.rpc('create_stage_instance', {
  p_record_id: recordId,
  p_stage: 'supervisor_review',
  p_assigned_user_id: supervisorId,
});
```

###  2. **Supervisor Action** (SupervisorDashboard)
When supervisor makes a decision (approve/reject/revision):
```typescript
// Existing code updates ip_records.status to waiting_evaluation | rejected | supervisor_revision
// NEW: 
// 1. Close supervisor_review stage instance
supabase.rpc('close_stage_instance', { p_record_id: recordId });
// 2. Create next stage based on decision
if (action === 'approve') {
  supabase.rpc('create_stage_instance', {
    p_record_id: recordId,
    p_stage: 'evaluation',
    p_assigned_user_id: evaluatorId,
  });
} else if (action === 'revision') {
  supabase.rpc('create_stage_instance', {
    p_record_id: recordId,
    p_stage: 'revision_requested',
    p_assigned_user_id: applicantId,
  });
}
```

### 3. **Evaluator Action** (EvaluatorDashboard)
When evaluator makes a decision (approve/reject/revision):
```typescript
// Existing code updates ip_records.status to evaluator_approved | rejected | evaluator_revision
// NEW:
// 1. Close evaluation stage instance
supabase.rpc('close_stage_instance', { p_record_id: recordId });
// 2. Create next stage
if (decision === 'approved') {
  supabase.rpc('create_stage_instance', {
    p_record_id: recordId,
    p_stage: 'materials_requested',
    p_assigned_user_id: applicantId,
  });
} else if (decision === 'revision') {
  supabase.rpc('create_stage_instance', {
    p_record_id: recordId,
    p_stage: 'revision_requested',
    p_assigned_user_id: applicantId,
  });
}
```

---

## 🎨 UI Updates

### ProcessTrackingWizard Component
Enhanced to display deadline info:

```typescript
interface ProcessStep {
  // Existing fields...
  stage: string;
  label: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  
  // NEW fields:
  dueDate?: string;           // "Feb 25, 2026"
  remainingDays?: number;     // Positive = days left, Negative = days overdue
  slaStatus?: 'on-track' | 'due-soon' | 'overdue' | 'expired';
}
```

**UI Elements Added:**
- **Status Badge:** Colored pill next to step name
  - Green: "On Track" (> 2 days remaining)
  - Yellow: "Due Soon" (≤ 2 days remaining)
  - Red: "Overdue" (past due_at, within grace)
  - Red: "Deadline Expired" (past grace period)
- **Deadline Info Box:** Shows due date and remaining/overdue days
  - Example: "Due: Feb 25, 2026 • 3 days remaining"
  - Example: "Due: Feb 20, 2026 • 2 days overdue"

---

## 📊 Data Flow Example

### Complete workflow with SLA tracking:

1. **Applicant submits IP record** (status='submitted')
   - No stage instance yet (applicant doesn't own an ownable stage in supervisor workflow)

2. **Admin assigns supervisor** (AssignmentManagementPage)
   - ip_records.supervisor_id = supervisor1
   - ✨ NEW: workflow_stage_instances created:
     - stage='supervisor_review', assigned_user_id=supervisor1, due_at=now+7d, status='ACTIVE'

3. **Supervisor reviews and approves** (SupervisorDashboard)
   - ip_records.status = 'waiting_evaluation', evaluator_id = evaluator1
   - ✨ NEW:
     - Close supervisor_review stage: completed_at=now, status='COMPLETED'
     - Create evaluation stage: stage='evaluation', assigned_user_id=evaluator1, due_at=now+10d

4. **Check Overdue** (scheduled or manual)
   - check-overdue-stages runs
   - Finds evaluation stage: due_at was 10 days ago, now overdue
   - UPDATE workflow_stage_instances SET status='OVERDUE', notified_at=now
   - Send notification to evaluator

5. **Evaluator reviews and approves** (EvaluatorDashboard)
   - ip_records.status = 'evaluator_approved'
   - ✨ NEW:
     - Close evaluation stage: status='COMPLETED'
     - Create materials_requested stage: assigned_user_id=applicant_id, due_at=now+7d

6. **Applicant sees ProcessTrackingWizard**
   - Current step: "Academic Presentation Materials"
   - Badge: "On Track" (green)
   - Deadline: "Due: Mar 04, 2026 • 7 days remaining"

---

## ✅ Key Design Principles

### 1. **Non-Breaking**
- No changes to existing ip_records columns (except inserts keep working)
- No changes to existing workflow statuses
- Existing code paths untouched
- SLA tracking is additive, not replacing

### 2. **Graceful Degradation**
- If SLA function fails, workflow continues (try/catch wraps all rpc calls)
- If notification fails, stage still closes/opens
- Future edits to SLA policies don't affect past records

### 3. **Minimal Coupling**
- SLA logic isolated in new tables/functions
- UI uses query results; no complex calculations in components
- Edge function is self-contained (can run independently)

### 4. **Auditability**
- Every stage transition logged in workflow_stage_instances
- Completion times tracked (completed_at)
- Extensions counted (extensions_used)
- Admin notes available (notes field)

---

## 🚀 Deployment Checklist

- [ ] **Run migrations:**
  ```bash
  supabase migration up 20260225_add_sla_workflow_tables.sql
  supabase migration up 20260225_seed_sla_policies.sql
  ```

- [ ] **Deploy edge function:**
  ```bash
  supabase functions deploy check-overdue-stages
  ```

- [ ] **Update React component:**
  - ProcessTrackingWizard.tsx (already updated)

- [ ] **Update page components:**
  - AssignmentManagementPage.tsx (already updated)
  - SupervisorDashboard.tsx (already updated)
  - EvaluatorDashboard.tsx (already updated)

- [ ] **Test end-to-end:**
  - See `SLA_TESTING_CHECKLIST.md` for detailed test scenarios

- [ ] **Set up scheduler (optional but recommended):**
  - Use cloud provider cron (AWS EventBridge, Google Cloud Scheduler, Vercel Cron, etc.)
  - Call `check-overdue-stages` function hourly or daily
  - Or set up Supabase scheduled functions when that becomes available

---

## 📝 Configuration

### Editing SLA Policies

Currently via SQL (admin can use Supabase dashboard):

```sql
-- Example: Increase supervisor review deadline to 10 days
UPDATE workflow_sla_policies
SET duration_days = 10
WHERE stage = 'supervisor_review' AND is_active = TRUE;

-- Example: Disable extensions for materials
UPDATE workflow_sla_policies
SET allow_extensions = FALSE
WHERE stage = 'materials_requested' AND is_active = TRUE;
```

**Future Enhancement:** Create admin UI for this (/admin/sla-policies or similar)

---

## 🔍 Monitoring & Maintenance

### Weekly Check
```sql
-- Active stages approaching deadline
SELECT 
  ir.title,
  wsi.stage,
  wsi.due_at,
  EXTRACT(DAY FROM (wsi.due_at - now()))::int as days_left,
  u.full_name as assigned_to
FROM workflow_stage_instances wsi
JOIN ip_records ir ON ir.id = wsi.ip_record_id
JOIN users u ON u.id = wsi.assigned_user_id
WHERE wsi.status = 'ACTIVE'
  AND wsi.due_at < now() + INTERVAL '7 days'
ORDER BY wsi.due_at;
```

### Monthly Metrics
```sql
-- SLA compliance rate
SELECT 
  wsi.stage,
  COUNT(*) as total,
  COUNT(CASE WHEN wsi.status = 'COMPLETED' AND 
    wsi.completed_at <= wsi.extended_until OR wsi.completed_at <= wsi.due_at
    THEN 1 END) as on_time,
  ROUND(100.0 * COUNT(CASE WHEN wsi.status = 'COMPLETED' AND 
    wsi.completed_at <= wsi.extended_until OR wsi.completed_at <= wsi.due_at
    THEN 1 END) / NULLIF(COUNT(*), 0), 1) as compliance_pct
FROM workflow_stage_instances wsi
WHERE wsi.created_at > now() - INTERVAL '30 days'
GROUP BY wsi.stage;
```

---

## 🎓 Known Limitations

1. **Extensions:** Infrastructure ready (max_extensions, extension_days fields), but UI/API to request/grant extensions not implemented
2. **Escalations:** No auto-escalation when stage overdue 2+ days (feature ready for implementation)
3. **SLA Policy Admin UI:** Policies currently seed-only; must edit via SQL
4. **Bulk Operations:** Admin status changes don't automatically create stage instances
5. **Performance:** check-overdue-stages iterates one-by-one; could be optimized for thousands of records

---

## 📞 Support & Questions

For issues or questions about the implementation:

1. Review `SLA_TESTING_CHECKLIST.md` for test scenarios
2. Check verification queries in the testing checklist
3. Run diagnostic query in "Monitoring & Maintenance" section above
4. Review function logs in Supabase dashboard

---

## 📄 Files Modified/Created

| File | Type | Change |
|------|------|--------|
| `20260225_add_sla_workflow_tables.sql` | Migration | **NEW** - Tables, types, helpers, views |
| `20260225_seed_sla_policies.sql` | Migration | **NEW** - Default SLA policy data |
| `check-overdue-stages/index.ts` | Edge Function | **NEW** - Overdue checking logic |
| `AssignmentManagementPage.tsx` | Component | **MODIFIED** - Added SLA tracking on supervisor assign |
| `SupervisorDashboard.tsx` | Component | **MODIFIED** - Added SLA tracking on approval/revision/reject |
| `EvaluatorDashboard.tsx` | Component | **MODIFIED** - Added SLA tracking on decision |
| `ProcessTrackingWizard.tsx` | Component | **MODIFIED** - Added deadline display UI |
| `SLA_TESTING_CHECKLIST.md` | Documentation | **NEW** - Test scenarios and troubleshooting |

---

**Ready for QA and UAT. See SLA_TESTING_CHECKLIST.md to begin testing.**

