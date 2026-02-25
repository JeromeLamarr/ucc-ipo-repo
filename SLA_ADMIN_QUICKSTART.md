# SLA Admin Implementation - Quick Start Guide

## 🚀 Deployment Steps

### Step 1: Apply RLS Migration

```bash
# Using Supabase CLI
supabase migrations push

# Or manually in Supabase Dashboard SQL Editor:
# Run: supabase/migrations/20260225000500_enable_rls_sla_policies.sql
```

**What it does:**
- Enables RLS on `workflow_sla_policies` table
- Creates 4 policies: READ for all, WRITE only for admins
- Adds helpful comments to table

### Step 2: Deploy Updated Edge Functions

```bash
# Deploy updated check-overdue-stages
supabase functions deploy check-overdue-stages

# Deploy updated send-notification-email  
supabase functions deploy send-notification-email
```

**What changed:**
- `check-overdue-stages`: Now includes SLA duration, grace period, and consequences in notification messages
- `send-notification-email`: Now accepts `additionalInfo` parameter for rich email details

### Step 3: Update React Components

Copy/update these files in your project:
- `src/components/ProcessTrackingWizard.tsx` - Enhanced with SLA deadline display
- `src/components/SLAPolicyManager.tsx` - NEW optional admin panel for managing policies

### Step 4: Verify Deployment

Run the test SQL:
```bash
# In Supabase SQL Editor:
-- Open: SLA_ADMIN_RLS_TEST.sql
-- Run each test section and verify expected results
```

---

## 📋 Configuration

### Default SLA Policies

The following policies were seeded during migration (in `20260225000400_seed_sla_policies.sql`):

| Stage | Duration | Grace | Extensions | Notes |
|-------|----------|-------|------------|-------|
| supervisor_review | 7 days | 2 days | Up to 2 | Quick turnaround |
| evaluation | 10 days | 2 days | Up to 2 | Thorough assessment |
| revision_requested | 14 days | 3 days | Up to 3 | Applicant rework |
| materials_requested | 7 days | 2 days | Up to 2 | Materials submission |
| certificate_issued | 3 days | 0 days | None | Auto-generated |

### Customize Policies

#### Via Admin UI (easiest)

1. Open admin dashboard
2. Add `<SLAPolicyManager />` to your admin page
3. Click "Edit" on any policy
4. Modify duration/grace days
5. Click "Save"

#### Via SQL (direct)

```sql
-- Update supervisor review to 10 days (from 7)
UPDATE workflow_sla_policies
SET duration_days = 10
WHERE stage = 'supervisor_review';

-- Add 1 more extension to revision stage
UPDATE workflow_sla_policies
SET max_extensions = 4
WHERE stage = 'revision_requested';
```

---

## 🔐 Admin Security

### How to Grant Admin Role

```sql
-- Make user an admin (requires service role/direct DB access)
UPDATE users
SET role = 'admin'
WHERE email = 'john@ucc.edu';
```

### Verify Admin Access

```sql
-- Check if user can update SLA
-- (Run as that user in browser console)
const { data, error } = await supabase
  .from('workflow_sla_policies')
  .update({ duration_days: 8 })
  .eq('stage', 'supervisor_review');

// Success if no error, fails with 403 if not admin
```

---

## 📧 Notification Testing

### Manual Test: Trigger Overdue Notification

```bash
# 1. Create a past-due stage (manually insert for testing)
supabase sql -f trigger_overdue_test.sql

# 2. Run the check-overdue-stages function
curl -X POST https://your-project.supabase.co/functions/v1/check-overdue-stages \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"

# 3. Check results
# - New notification in DB
# - Email sent (check logs)
# - Status updated to OVERDUE/EXPIRED
```

### Expected Email Content

When a stage is overdue, email includes:

```
Title: "Overdue: evaluation - [Submission Title]"

Message:
Your evaluation task is 3 days overdue.

SLA Duration: Duration: 10 days + 2 days grace period

Consequence: Please complete this review immediately. Overdue work may impact the submission timeline.

Details Table:
- Stage: evaluation
- Status: OVERDUE
- Days Overdue: 3
- SLA Duration: 10 days
- Grace Period: 2 days
- Due Date: Feb 25, 2026
```

---

## 🎯 User-Facing Features

### Process Tracking Wizard - Current Stage View

When a stage is in progress, users see:

```
[📅] Supervisor Review                    [Due Soon - Yellow Badge]
  Started workflow review
  
  ┌─────────────────────────────────────┐
  │ 📅 Deadline                  Feb 28 │
  │ • 2 days remaining                  │
  │ • Started: Feb 24             │
  │ • Duration: 7 days                  │
  │ • Grace period: 2 days              │
  └─────────────────────────────────────┘
```

### Status Badges

- 🟢 **On Track** - More than 2 days remaining
- 🟡 **Due Soon** - 2 days or less remaining
- 🔴 **Overdue** - Past due date but within grace period
- ⛔ **Expired** - Past grace period (applicant stages only)

---

## 🧪 Testing Scenarios

### Scenario 1: Admin Updates SLA Duration

```
1. Admin opens SLA Policy Manager
2. Updates "evaluation" from 10 days to 5 days
3. Clicks Save → RLS allows UPDATE (is admin)
4. New stage instance for evaluation gets 5-day deadline
5. OLD submissions keep original 10-day deadline (not retroactive)
✅ Verify: Database shows duration_days = 5
```

### Scenario 2: User Receives Overdue Notification

```
1. Create supervisor_review stage with due_at = yesterday
2. Run check-overdue-stages function
3. Stage status → OVERDUE
4. Notification created with SLA details
5. Email sent with duration, grace period, consequence
✅ Verify: Email contains "Duration: 7 days + 2 days grace period"
```

### Scenario 3: Applicant Sees Grace Period

```
1. Applicant gets revision_requested stage
2. Due date is 14 days from now
3. Within UI, they see: "Duration: 14 days + 3 days grace period"
4. After 14 days but within 17 days → shows "OVERDUE"
5. After 17 days → shows "EXPIRED"
✅ Verify: UI correctly distinguishes OVERDUE vs EXPIRED
```

### Scenario 4: Non-Admin Cannot Modify SLA

```
1. Non-admin supervisor opens SLA Policy Manager
2. Tries to click Edit → Button disabled or shows read-only
3. Attempts direct API call:
   supabase.from('workflow_sla_policies').update(...)
4. Gets RLS error → 403 Permission Denied
✅ Verify: Supervisor cannot change SLA policies
```

---

## 🔍 Monitoring & Debugging

### Check Overdue Stages Log

```bash
# View last 50 function invocations
supabase functions logs check-overdue-stages --limit 50
```

### Query SLA Health

```sql
-- Overall SLA metrics
SELECT 
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_stages,
  COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_stages,
  COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_stages,
  COUNT(*) FILTER (WHERE notified_at IS NOT NULL) as stages_with_notifications
FROM workflow_stage_instances;

-- Stages approaching deadline
SELECT stage, due_at, NOW(), 
  (due_at - NOW()) as time_until_due
FROM workflow_stage_instances
WHERE status = 'ACTIVE'
  AND (due_at - NOW()) < interval '3 days'
ORDER BY due_at;
```

### Review Sent Notifications

```sql
-- Check notifications sent in last 24 hours
SELECT 
  type,
  COUNT(*),
  MAX(created_at) as most_recent
FROM notifications
WHERE created_at > NOW() - interval '24 hours'
GROUP BY type;

-- View specific notification payload
SELECT payload->>'sla_duration_days', payload->>'sla_grace_days'
FROM notifications
WHERE type = 'overdue_stage'
LIMIT 5;
```

---

## ❌ Troubleshooting

### Issue: "Permission Denied" When Admin Tries to Update SLA

**Solution:**
1. Verify user has `role = 'admin'` in users table
2. Check RLS is enabled: `ALTER TABLE workflow_sla_policies ENABLE ROW LEVEL SECURITY;`
3. Clear browser cache and re-authenticate

### Issue: Notifications Not Including SLA Details

**Solution:**
1. Verify `check-overdue-stages` function is updated (check timestamp)
2. Check function logs: `supabase functions logs check-overdue-stages`
3. Ensure `send-notification-email` has `additionalInfo` parameter support

### Issue: ProcessTrackingWizard Shows "No SLA Data"

**Solution:**
1. Verify stage instance exists: Check `workflow_stage_instances` table
2. Verify SLA policy exists: Check `workflow_sla_policies` is_active = TRUE
3. Ensure component fetches both tables on mount

### Issue: Grace Period Calculation Wrong

**Solution:**
1. Grace period is evaluated by `check-overdue-stages` function only
2. Verify calculation: `grant_deadline = due_at + (grace_days interval)`
3. Status update happens automatically (ACTIVE → OVERDUE → EXPIRED)

---

## 📚 Additional Resources

- **Full Implementation Guide:** `SLA_ADMIN_IMPLEMENTATION_GUIDE.md`
- **Test SQL:** `SLA_ADMIN_RLS_TEST.sql`
- **API Map:** `API_MAP.md` (for edge function endpoints)
- **Workflow Tables:** `supabase/migrations/20260225000100_add_sla_workflow_tables.sql`
- **Policy Seeding:** `supabase/migrations/20260225000400_seed_sla_policies.sql`

---

## ✅ Deployment Checklist

- [ ] Applied RLS migration (20260225000500_enable_rls_sla_policies.sql)
- [ ] Deployed updated edge functions (check-overdue-stages, send-notification-email)
- [ ] Updated ProcessTrackingWizard component
- [ ] Added SLAPolicyManager component to admin dashboard (optional)
- [ ] Ran SLA_ADMIN_RLS_TEST.sql and verified all tests pass
- [ ] Created admin user and tested RLS restrictions
- [ ] Tested notification flow end-to-end
- [ ] Verified UI displays deadlines correctly
- [ ] Documented custom SLA policies for organization
- [ ] Scheduled check-overdue-stages (or ensure it's called periodically)

---

## 🎉 You're Ready!

The SLA admin system is live. Users can now:
- ✅ See clear deadlines in Process Tracking
- ✅ Receive notifications when deadlines approach
- ✅ Understand SLA duration and grace periods

Admins can:
- ✅ Update SLA durations globally
- ✅ Configure extensions and grace periods
- ✅ Monitor overdue stages and notifications
- ✅ Ensure workflow accountability

Happy tracking! 📅
