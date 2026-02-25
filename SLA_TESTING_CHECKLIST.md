# SLA Workflow Implementation - End-to-End Testing Checklist

**Date:** 2026-02-25  
**Implementation:** Time-frame/SLA deadlines for existing workflow  
**Status:** Ready for testing  

---

## ✅ Deliverables Implemented

- [x] **Database Migration 1:** `20260225_add_sla_workflow_tables.sql` - Creates `workflow_sla_policies` and `workflow_stage_instances` tables
- [x] **Database Migration 2:** `20260225_seed_sla_policies.sql` - Seeds default SLA policies for each stage
- [x] **Edge Function:** `check-overdue-stages/index.ts` - Monitors and updates overdue/expired stages
- [x] **AssignmentManagementPage:** SLA tracking hook when supervisor is assigned
- [x] **SupervisorDashboard:** SLA tracking hook for approval/revision/reject actions
- [x] **EvaluatorDashboard:** SLA tracking hook for evaluation decision actions
- [x] **ProcessTrackingWizard:** UI displays deadline info, remaining days, status badges

---

## 🧪 Test Scenarios

### Scenario 1: Create & Assign for Supervisor Review
**Objective:** Verify supervisor_review stage instance is created when supervisor is assigned

1. **Setup:**
   - Admin logs in to AssignmentManagementPage
   - Select a submitted record (status = 'submitted')
   - Assign supervisor to the record

2. **Expected:**
   - Record status → `waiting_supervisor`
   - Workflow stage instance created: stage='supervisor_review', status='ACTIVE', assigned_user_id=supervisor_id
   - Due date calculated: now + 7 days (per SLA policy)
   - Grace days set: 2 days
   - Supervisor receives notification

3. **Verification:**
   ```sql
   SELECT * FROM workflow_stage_instances 
   WHERE ip_record_id = '<record-id>' AND stage = 'supervisor_review' 
   ORDER BY created_at DESC LIMIT 1;
   -- Should have: status='ACTIVE', due_at ~7 days from now
   ```

---

### Scenario 2: Supervisor Approves (supervisor_review → evaluation)
**Objective:** Verify stage transitions work and SLA tracking closes/opens correctly

1. **Setup:**
   - Supervisor logs into SupervisorDashboard
   - Opens a record in waiting_supervisor status
   - Submits approval with remarks

2. **Expected:**
   - Record status → `waiting_evaluation`
   - supervisor_review stage instance: status='COMPLETED', completed_at=now
   - evaluation stage instance created: status='ACTIVE', assigned_user_id=evaluator_id
   - Due date: now + 10 days
   - Evaluator receives notification
   - Applicant receives approval notification

3. **Verification:**
   ```sql
   SELECT id, stage, status, completed_at, due_at FROM workflow_stage_instances 
   WHERE ip_record_id = '<record-id>' 
   ORDER BY created_at DESC LIMIT 2;
   -- First (supervisor_review): status='COMPLETED', completed_at IS NOT NULL
   -- Second (evaluation): status='ACTIVE', due_at ~10 days from now
   ```

---

### Scenario 3: Supervisor Requests Revision
**Objective:** Verify revision_requested stage is created with correct SLA

1. **Setup:**
   - Supervisor logs into SupervisorDashboard
   - Opens a record in waiting_supervisor status
   - Selects "Revision" action with remarks

2. **Expected:**
   - Record status → `supervisor_revision`
   - supervisor_review stage closed: status='COMPLETED'
   - revision_requested stage created: status='ACTIVE', assigned_user_id=applicant_id
   - Due date: now + 14 days (longest SLA for revision stages)
   - Applicant receives revision request notification

3. **Verification:**
   ```sql
   SELECT stage, status, assigned_user_id FROM workflow_stage_instances 
   WHERE ip_record_id = '<record-id>' 
   ORDER BY created_at DESC LIMIT 1;
   -- Should be: stage='revision_requested', status='ACTIVE', assigned_user_id=applicant_id
   ```

---

### Scenario 4: Check Overdue Stages
**Objective:** Verify check-overdue-stages function correctly marks stages as OVERDUE/EXPIRED

1. **Setup:**
   - Manually update a workflow_stage_instances record to test overdue:
     ```sql
     UPDATE workflow_stage_instances 
     SET due_at = now() - INTERVAL '1 day', updated_at = now()
     WHERE id = '<stage-instance-id>' AND status = 'ACTIVE';
     ```

2. **Run check-overdue-stages:**
   - Via CLI: `supabase functions invoke check-overdue-stages`
   - Or setup as scheduled function

3. **Expected:**
   - Stage status → `OVERDUE`
   - notified_at set to current timestamp
   - Notification created in notifications table
   - Email sent (check logs)

4. **Verification:**
   ```sql
   SELECT id, stage, status, notified_at FROM workflow_stage_instances 
   WHERE id = '<stage-instance-id>';
   -- Should have: status='OVERDUE', notified_at IS NOT NULL
   
   SELECT * FROM notifications 
   WHERE payload->>'ip_record_id' = '<record-id>' AND type = 'overdue_stage'
   ORDER BY created_at DESC LIMIT 1;
   -- Should exist and recent
   ```

---

### Scenario 5: Applicant Stage Expires (Grace Period)
**Objective:** Verify applicant stages (revision_requested, materials_requested) expire after grace period

1. **Setup:**
   - Manually create a revision_requested stage older than due_at + grace_days:
     ```sql
     UPDATE workflow_stage_instances 
     SET due_at = now() - INTERVAL '17 days', updated_at = now()
     WHERE stage = 'revision_requested' AND status = 'ACTIVE';
     -- 14 days SLA + 3 days grace = 17 days total
     ```

2. **Run check-overdue-stages:**
   - Via CLI or scheduled function

3. **Expected:**
   - Stage status → `EXPIRED`
   - notified_at set
   - Applicant receives "deadline expired" notification
   - Record is still IN WORKFLOW but marked as expired for tracking

4. **Verification:**
   ```sql
   SELECT id, stage, status FROM workflow_stage_instances 
   WHERE stage = 'revision_requested' AND status = 'EXPIRED' LIMIT 1;
   -- Should exist
   ```

---

### Scenario 6: ProcessTrackingWizard UI Display
**Objective:** Verify UI shows SLA deadline information correctly

1. **Setup:**
   - Applicant or manager logs in
   - Opens a record detail page with ProcessTrackingWizard component
   - Record should be in an ACTIVE stage with SLA

2. **Expected UI:**
   - Current step shows deadline badge: "On Track" / "Due Soon" / "Overdue" / "Deadline Expired"
   - Badge colors: Green (on track), Yellow (due soon: ≤2 days), Red (overdue/expired)
   - Below step description: "Due: [date] • X days remaining"
   - Past steps show completion date and actor name

3. **Manual Verification:**
   - Visual check that UI renders correctly
   - Check colors match SLA status
   - Verify date format is readable (e.g., "Feb 25, 2026")

---

### Scenario 7: Evaluator Approves (evaluation → materials_requested)
**Objective:** Verify evaluator decision creates correct next stage

1. **Setup:**
   - Evaluator logs into EvaluatorDashboard
   - Opens a record in waiting_evaluation status
   - Submits approval decision with scores and grade

2. **Expected:**
   - Record status → `evaluator_approved`
   - evaluation stage: status='COMPLETED'
   - materials_requested stage created: status='ACTIVE', assigned_user_id=applicant_id
   - Due date: now + 7 days
   - Applicant receives approval and materials request notification

3. **Verification:**
   ```sql
   SELECT stage, status, assigned_user_id FROM workflow_stage_instances 
   WHERE ip_record_id = '<record-id>' 
   ORDER BY created_at DESC LIMIT 1;
   -- Should be: stage='materials_requested', status='ACTIVE'
   ```

---

### Scenario 8: Evaluator Requests Revision
**Objective:** Verify evaluator revision properly transitions stage

1. **Setup:**
   - Evaluator logs into EvaluatorDashboard
   - Opens a record in waiting_evaluation status
   - Submits "Revision" decision with remarks

2. **Expected:**
   - Record status → `evaluator_revision`
   - evaluation stage: status='COMPLETED'
   - revision_requested stage (applicant stage): status='ACTIVE', assigned_user_id=applicant_id
   - Due date: now + 14 days
   - Applicant receives revision request notification

3. **Verification:**
   ```sql
   SELECT stage, status FROM workflow_stage_instances 
   WHERE ip_record_id = '<record-id>' AND stage IN ('evaluation', 'revision_requested')
   ORDER BY created_at DESC LIMIT 2;
   ```

---

### Scenario 9: Extension Handling (Future)
**Objective:** Verify extension logic when implemented

1. **Current State:** SLA policies have `max_extensions` and `extension_days` configured
2. **Not Yet Implemented:** UI/API for requesting/approving extensions
3. **When Implemented:**
   - When extension granted: `extensions_used` incremented, `extended_until` updated
   - `check-overdue-stages` uses extended_until if set

---

### Scenario 10: Workflow Completion
**Objective:** Verify final stage (certificate_issued) doesn't create infinite loop

1. **Setup:**
   - Applicant or admin initiates certificate generation
   - Record should move to appropriate final status

2. **Expected:**
   - certificate_issued stage instance created: status='ACTIVE', due_at=now+3days
   - No grace period (grace_days=0)
   - No extensions allowed
   - When completed: status='COMPLETED'
   - Next stage instance: NONE (workflow ends)

3. **Verification:**
   ```sql
   SELECT COUNT(*) FROM workflow_stage_instances 
   WHERE ip_record_id = '<record-id>' AND status = 'ACTIVE';
   -- Should be 0 when workflow completes
   ```

---

## 🔍 Priority Test Sequence

Run in this order for fastest validation:

1. **Scenario 1** - Basic assignment (5 min)
2. **Scenario 2** - Stage transition (10 min)
3. **Scenario 6** - UI display (5 min)
4. **Scenario 3** - Revision flow (10 min)
5. **Scenario 4** - Overdue check (10 min)
6. **Scenario 7** - Evaluator flow (10 min)

**Total:** ~50 minutes for critical path

---

## 📋 Known Limitations & Future Work

- [ ] Extension request/approval UI not yet implemented (infrastructure is ready)
- [ ] Escalation workflows not implemented (e.g., auto-notify manager when stage overdue 2+ days)
- [ ] SLA policy admin UI not yet created (currently seed-only; editable via SQL)
- [ ] Performance: Check-overdue-stages should be scheduled to run hourly/daily (manual test for MVP)
- [ ] Bulk operations not reflected in SLA (e.g., admin status change doesn't create stage instance)

---

## 🛠️ Troubleshooting

### Issue: No SLA data showing in ProcessTrackingWizard
**Cause:** workflow_stage_instances table empty (no stage instances created)  
**Fix:** Verify supervisor assignment creates stage instance via AssignmentManagementPage

### Issue: Overdue notification sent multiple times
**Cause:** notified_at not updated after notification  
**Fix:** check-overdue-stages function should update notified_at; verify it's working

### Issue: Stage instance due date is wrong
**Cause:** SLA policy not found or duration_days not configured  
**Fix:** Verify workflow_sla_policies table has records for your stages

---

## ✨ Verification Queries

### Quick Status Check
```sql
-- Count stage instances by status
SELECT stage, status, COUNT(*) as count
FROM workflow_stage_instances
GROUP BY stage, status
ORDER BY stage, status;
```

### Active Stages at Risk
```sql
-- Find stages due in next 3 days
SELECT 
  wsi.ip_record_id,
  wsi.stage,
  wsi.due_at,
  EXTRACT(DAY FROM (wsi.due_at - now()))::int as days_remaining,
  ir.title,
  ir.applicant_id,
  ir.supervisor_id,
  ir.evaluator_id
FROM workflow_stage_instances wsi
JOIN ip_records ir ON ir.id = wsi.ip_record_id
WHERE wsi.status = 'ACTIVE'
  AND wsi.due_at < now() + INTERVAL '3 days'
ORDER BY wsi.due_at;
```

### SLA Policy Settings
```sql
-- View all active SLA policies
SELECT 
  stage,
  duration_days,
  grace_days,
  max_extensions,
  extension_days,
  allow_extensions,
  description
FROM workflow_sla_policies
WHERE is_active = TRUE
ORDER BY stage;
```

---

## 📞 Support

When reporting issues, include:
1. Record ID (ip_record_id)
2. Current record status
3. Expected vs actual workflow_stage_instances data
4. Screenshots of ProcessTrackingWizard UI
5. check-overdue-stages function logs

---

