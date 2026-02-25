# SLA Workflow - Quick Reference

## For Developers

### Where is SLA Tracking Added?

| File | Function | Line | Stage Created | Stage Closed |
|------|----------|------|---------------|--------------|
| `NewSubmissionPage.tsx` | after ipRecord insert | ~618 | supervisor_review OR evaluation | - |
| `NewSubmissionPage.tsx` | after evaluator auto-assign | ~772 | evaluation | - |
| `SupervisorDashboard.tsx` | handleSubmitReview | ~224 | evaluation OR revision_requested | supervisor_review |
| `EvaluatorDashboard.tsx` | handleSubmitEvaluation | ~290 | materials_requested OR evaluator_revision | evaluation |
| `SubmissionDetailPage.tsx` | handleResubmit | ~607 | supervisor_review OR evaluation | revision_requested |
| `submit-presentation-materials/index.ts` | after activity log | ~58 | certificate_issued | materials_requested |
| `CompletionButton.tsx` | handleComplete | ~95 | - | certificate_issued |

### Helper Functions

```typescript
// Close current active stage
await supabase.rpc('close_stage_instance', {
  p_record_id: string,           // ip_record_id
  p_close_status: 'COMPLETED'    // or 'EXPIRED' for applicant timeout
});

// Create new stage
await supabase.rpc('create_stage_instance', {
  p_record_id: string,           // ip_record_id
  p_stage: string,               // stage name
  p_assigned_user_id: string     // user responsible (can be NULL)
});

// Get SLA policy for a stage
await supabase.rpc('get_sla_policy', {
  p_stage: string                // stage name
});
```

### Stage Names

- `supervisor_review`
- `evaluation`
- `revision_requested`
- `materials_requested`
- `certificate_issued`

### Database Tables

**workflow_sla_policies:**
- `stage` (varchar, unique)
- `duration_days` (int)
- `grace_days` (int)
- `allow_extensions` (boolean)
- `max_extensions` (int)
- `extension_days` (int)

**workflow_stage_instances:**
- `ip_record_id` (uuid) ⚠️ NOT record_id!
- `stage` (varchar)
- `assigned_user_id` (uuid, nullable)
- `started_at` (timestamp)
- `due_at` (timestamp)
- `completed_at` (timestamp, nullable)
- `status` (enum: ACTIVE, COMPLETED, OVERDUE, EXPIRED)
- `extensions_used` (int)
- `extended_until` (timestamp, nullable)
- `notified_at` (timestamp, nullable)

### Code Template

```typescript
// ==========================================
// SLA TRACKING: Close <current> and create <next>
// ==========================================
try {
  // Close previous stage
  const { data: closedData, error: closeErr } = await supabase
    .rpc('close_stage_instance', {
      p_record_id: recordId,
      p_close_status: 'COMPLETED',
    });

  if (closeErr) {
    console.warn('Could not close stage:', closeErr);
  } else {
    console.log('Closed stage:', closedData);
  }

  // Create next stage
  if (nextStage && nextUserId) {
    const { data: newData, error: newErr } = await supabase
      .rpc('create_stage_instance', {
        p_record_id: recordId,
        p_stage: nextStage,
        p_assigned_user_id: nextUserId,
      });

    if (newErr) {
      console.warn('Could not create stage:', newErr);
    } else {
      console.log('Created stage:', newData);
    }
  }
} catch (slaError) {
  // Non-critical - workflow continues
  console.warn('SLA error:', slaError);
}
```

---

## For Admins

### Managing SLA Policies

**URL:** `/dashboard/sla-policies`

**Access:** Admin role only

**Fields:**
- **Duration:** Primary deadline (days)
- **Grace Period:** Buffer before EXPIRED (days)
- **Allow Extensions:** Enable deadline extensions
- **Max Extensions:** How many times can extend
- **Extension Days:** Days added per extension

**Important:** Changes only affect NEW stages, not existing ones.

---

## For QA/Testers

### Quick Test

1. **Create submission** → Check `workflow_stage_instances` has new row
2. **Supervisor approve** → Check old row COMPLETED, new row ACTIVE
3. **Navigate to** `/dashboard/sla-policies` as admin → See 5 policies
4. **Edit a duration** → Save → Verify in database

### SQL Queries

**Check active stages:**
```sql
SELECT * FROM workflow_stage_instances WHERE status = 'ACTIVE';
```

**Check stage for specific record:**
```sql
SELECT * FROM workflow_stage_instances
WHERE ip_record_id = '<uuid>'
ORDER BY created_at DESC;
```

**Check SLA policies:**
```sql
SELECT * FROM workflow_sla_policies ORDER BY stage;
```

---

## For DevOps

### Edge Functions

**Deployed:**
- `submit-presentation-materials` (updated with SLA tracking)

**Existing (No changes):**
- `check-overdue-stages` (already working)

### Cron Job Setup

```sql
-- Run overdue checker daily at 8 AM
SELECT cron.schedule(
  'check-overdue-stages-daily',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := 'https://[project].supabase.co/functions/v1/check-overdue-stages',
    headers := '{"Authorization": "Bearer [service-role-key]"}'
  )$$
);
```

### RLS Policies

**workflow_sla_policies:**
- SELECT: authenticated (all users)
- INSERT/UPDATE/DELETE: admins only

Verify:
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'workflow_sla_policies';
```

---

## Troubleshooting

### "Failed to create stage instance"

**Check:**
1. Does `create_stage_instance` function exist?
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'create_stage_instance';
   ```
2. Is RLS blocking?
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'workflow_stage_instances';
   ```
3. Check console logs for full error

### "Access Denied" on /dashboard/sla-policies

**Check:**
1. User role is 'admin'
   ```sql
   SELECT role FROM users WHERE email = '<user_email>';
   ```
2. is_admin() function works
   ```sql
   SELECT is_admin();  -- Should return true for admin
   ```

### Stage not showing in ProcessTracking

**Check:**
1. Stage instance exists
   ```sql
   SELECT * FROM workflow_stage_instances WHERE ip_record_id = '<uuid>';
   ```
2. ProcessTrackingWizard fetches correctly (check console)

---

**Last Updated:** 2026-02-25
**Version:** 1.0
**Status:** Production Ready
