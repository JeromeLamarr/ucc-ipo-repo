# SLA Implementation - Quick Deployment Guide

**Last Updated:** February 25, 2026

---

## 🚀 One-Command Deploy

```bash
# Apply all migrations
supabase migration up

# Deploy edge function
supabase functions deploy check-overdue-stages

# Verify function is deployed
supabase functions list
```

---

## 📋 Files Involved

### Migrations (Apply in Order)
1. **`supabase/migrations/20260225_add_sla_workflow_tables.sql`**
   - Creates `workflow_sla_policies` table
   - Creates `workflow_stage_instances` table with enum type
   - Creates helper functions: `get_sla_policy`, `close_stage_instance`, `create_stage_instance`
   - Creates `current_stage_instance` view

2. **`supabase/migrations/20260225_seed_sla_policies.sql`**
   - Seeds 5 default SLA policies (supervisor_review, evaluation, revision_requested, materials_requested, certificate_issued)

### Edge Functions
- **`supabase/functions/check-overdue-stages/index.ts`**
  - Monitors and updates overdue/expired stages
  - Sends notifications
  - Idempotent (safe to run multiple times)

### Components Updated
- **`src/components/ProcessTrackingWizard.tsx`** - UI for deadline display
- **`src/pages/AssignmentManagementPage.tsx`** - SLA on supervisor assignment
- **`src/pages/SupervisorDashboard.tsx`** - SLA on supervisor decision
- **`src/pages/EvaluatorDashboard.tsx`** - SLA on evaluator decision

---

## ✅ Validation After Deploy

### 1. Check Migrations Applied
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('workflow_sla_policies', 'workflow_stage_instances')
ORDER BY table_name;

-- Expected output:
-- workflow_sla_policies
-- workflow_stage_instances
```

### 2. Check SLA Policies Seeded
```sql
SELECT stage, duration_days, grace_days, is_active 
FROM workflow_sla_policies 
ORDER BY stage;

-- Expected output: 5 rows with different stages
-- supervisor_review: 7, 2, true
-- evaluation: 10, 2, true  
-- revision_requested: 14, 3, true
-- materials_requested: 7, 2, true
-- certificate_issued: 3, 0, true
```

### 3. Check Functions Exist
```sql
-- Test helper functions
SELECT 
  get_sla_policy('supervisor_review') as policy;
-- Should return SLA policy for supervisor_review stage

-- Test RPC functions are callable
-- (Will fail if not authenticated, but proves they exist)
```

### 4. Check Edge Function Deployed
```bash
supabase functions list

# Output should include:
# check-overdue-stages
```

### 5. Test Edge Function (Optional)
```bash
# Manual invocation
supabase functions invoke check-overdue-stages

# Should return JSON with structure:
# {
#   "timestamp": "2026-02-25T...",
#   "stage_checks_completed": N,
#   "marked_overdue": N,
#   "marked_expired": N,
#   "notifications_sent": N,
#   ...
# }
```

---

## 🧪 Quick Functional Test

### Test Case 1: Create Stage Instance
1. Create a test IP record (if needed)
2. In Supabase SQL Editor, run:
```sql
-- Get any ip_record_id
SELECT id FROM ip_records LIMIT 1 \gset

-- Create a stage instance
SELECT create_stage_instance(:'id', 'supervisor_review', 'some-uuid-here');

-- Verify it was created
SELECT * FROM workflow_stage_instances 
WHERE ip_record_id = :'id' 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- stage='supervisor_review', status='ACTIVE', due_at~7 days from now
```

### Test Case 2: Close and Open Stages
```sql
-- Assuming you have a stage instance from Test Case 1
-- Find the ID
SELECT id, stage FROM workflow_stage_instances 
WHERE ip_record_id = :'id' AND status = 'ACTIVE' 
LIMIT 1 \gset

-- Close it
SELECT close_stage_instance(:'id');

-- Verify closure
SELECT status, completed_at FROM workflow_stage_instances 
WHERE id = :'id';

-- Should show status='COMPLETED', completed_at=now
```

### Test Case 3: Overdue Checking
```sql
-- Create a stage instance with past due date
INSERT INTO workflow_stage_instances 
  (ip_record_id, stage, assigned_user_id, started_at, due_at, status)
VALUES 
  ('test-record-id', 'supervisor_review', 'test-user-id', 
   now() - INTERVAL '10 days', now() - INTERVAL '1 day', 'ACTIVE')
RETURNING id, stage, status, due_at;

-- Run check-overdue-stages (via CLI)
# supabase functions invoke check-overdue-stages

-- Verify stage marked OVERDUE
SELECT status, notified_at FROM workflow_stage_instances 
WHERE stage = 'supervisor_review' AND due_at < now()
LIMIT 1;

-- Should show status='OVERDUE', notified_at IS NOT NULL
```

---

## 🔒 RLS Policies (Inherited)

New tables inherit RLS from ip_records:
- Users can view stage instances for their own records
- Admins/supervisors/evaluators can view records they're assigned to
- No explicit RLS policies needed (use ip_records join)

---

## 📅 Scheduler Setup (Optional but Recommended)

To automatically check for overdue stages, schedule the edge function to run:
- Hourly for critical environments
- Daily for standard SLAs

### Option A: Vercel Cron (if using Vercel)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/check-overdue-stages",
    "schedule": "0 * * * *"
  }]
}
```

### Option B: GitHub Actions (Free)
Create `.github/workflows/check-overdue.yml`:
```yaml
name: Check Overdue Stages
on:
  schedule:
    - cron: '0 * * * *'  # Every hour

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: supabase functions invoke check-overdue-stages
```

### Option C: External CRON Service
Use ifttt.com, cron-job.org, or similar:
```
POST https://<project-url>/functions/v1/check-overdue-stages
Authorization: Bearer <anon-key>
```

---

## 🛠️ Troubleshooting Deploy

### Migration fails with "permission denied"
- Ensure you're using Service Role key (not anon key)
- Check Supabase Studio dashboard for RLS policies that might block

### Edge function deployment fails  
```bash
# Check function syntax
supabase functions lint check-overdue-stages

# Force redeploy
supabase functions delete check-overdue-stages
supabase functions deploy check-overdue-stages
```

### Components show TypeScript errors
- Ensure all imports are correct in component files
- Check that `workflow_stage_instances` type is present in `database.types.ts`
- Run `npm install` to update dependencies

### No SLA data appearing in UI
1. Verify migrations ran (`describe workflow_stage_instances;`)
2. Verify supervisor assignment creates stage instance
3. Check browser console for errors
4. Check Supabase logs for RLS violations

---

## ✨ Post-Deploy Testing

See **`SLA_TESTING_CHECKLIST.md`** for comprehensive test scenarios.

**Quick smoke test (5 minutes):**
1. Assign supervisor to a record via AssignmentManagementPage
2. Verify workflow_stage_instances row created in DB
3. View record detail with ProcessTrackingWizard component
4. Verify deadline info displays (date + remaining days)
5. Approve as supervisor; verify new stage instance created

---

## 📊 Monitoring After Deploy

```sql
-- Daily check: Any overdue stages?
SELECT 
  ir.title,
  wsi.stage,
  wsi.status,
  EXTRACT(DAY FROM (now() - wsi.due_at))::int as days_overdue
FROM workflow_stage_instances wsi
JOIN ip_records ir ON ir.id = wsi.ip_record_id
WHERE wsi.status IN ('OVERDUE', 'EXPIRED')
ORDER BY wsi.due_at DESC;

-- Weekly check: SLA compliance
SELECT 
  stage,
  COUNT(*) as completed,
  COUNT(CASE WHEN completed_at <= due_at THEN 1 END) as on_time,
  ROUND(100.0 * COUNT(CASE WHEN completed_at <= due_at THEN 1 END) / 
    NULLIF(COUNT(*), 0), 1) as pct_on_time
FROM workflow_stage_instances
WHERE status = 'COMPLETED' 
  AND created_at > now() - INTERVAL '7 days'
GROUP BY stage
ORDER BY stage;
```

---

## ✅ Rollback Plan (if needed)

```bash
# Disable edge function
supabase functions delete check-overdue-stages

# Revert migrations (careful - data loss)
supabase db reset

# Or manually:
# DROP TABLE workflow_stage_instances;
# DROP TABLE workflow_sla_policies;
# DROP TYPE workflow_stage_status;
```

**Note:** Rollback drops SLA data. If you need to keep it, create backups first.

---

