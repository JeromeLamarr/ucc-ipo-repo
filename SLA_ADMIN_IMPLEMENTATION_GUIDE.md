# SLA Admin Access, Notifications & UI Implementation Summary

**Date:** 2026-02-25  
**Status:** ✅ Complete  
**Breaking Changes:** None (additive only)

---

## 📋 Overview

Implemented admin-controlled SLA (Service Level Agreement) policies with automated notifications and deadline tracking in the progress UI. All workflow logic remains unchanged and RLS protects admin-only operations.

---

## 🎯 What Was Implemented

### 1️⃣ **Admin Access Control (RLS)**

**File:** `supabase/migrations/20260225000500_enable_rls_sla_policies.sql`

- ✅ **Enabled RLS** on `workflow_sla_policies` table
- ✅ **Read Access**: All authenticated users can read active policies (`is_active = TRUE`)
- ✅ **Write Access**: Only admins (`users.role = 'admin'`) can INSERT/UPDATE/DELETE policies
- ✅ **Service Role**: Edge functions using `SERVICE_ROLE_KEY` bypass RLS (implicit)

**RLS Policies Created:**
1. `Authenticated users can read active SLA policies` (SELECT)
2. `Only admins can create SLA policies` (INSERT)
3. `Only admins can update SLA policies` (UPDATE)
4. `Only admins can delete SLA policies` (DELETE)

**SQL Query Examples:**
```sql
-- Users (any authenticated) can read active SLA policies
SELECT * FROM workflow_sla_policies WHERE is_active = TRUE;

-- Only admins can update
UPDATE workflow_sla_policies SET duration_days = 10 WHERE stage = 'evaluation';
-- ✅ Admin succeeds | ❌ Non-admin blocked by RLS
```

---

### 2️⃣ **SLA-Aware Notifications**

**File:** `supabase/functions/check-overdue-stages/index.ts`

Enhanced the existing `check-overdue-stages` edge function to include comprehensive SLA information in notifications:

#### **What Info Is Now Sent**

When a stage becomes **OVERDUE** or **EXPIRED**, notifications now include:

- 📅 **Stage Name & Due Date**
- ⏱️ **SLA Duration** (e.g., "Duration: 10 days + 2 days grace period")
- 📊 **Days Overdue** (calculated)
- ⚠️ **Clear Consequence**:
  - For **Supervisors/Evaluators**: "Please complete this review immediately. Overdue work may impact the submission timeline."
  - For **Applicants**: "After the grace period, your submission may be closed or marked as incomplete."

#### **Notification Delivery**

1. **In-App Notification**
   - Stored in `notifications` table
   - Payload includes: `stage`, `days_overdue`, `is_expired`, `due_date`, `sla_duration_days`, `sla_grace_days`

2. **Email Notification**
   - Via `send-notification-email` edge function
   - Enhanced HTML template with SLA details in a formatted table

#### **Rate Limiting**
- Only sends once per 24 hours (prevents spam)
- Tracked via `notified_at` field

---

### 3️⃣ **UI Deadline Display in Progress Tracking**

**File:** `src/components/ProcessTrackingWizard.tsx`

Enhanced the process tracking component to display rich SLA information:

#### **What's Displayed**

For **CURRENT** stages (in progress):
- 📅 **Clear Deadline Date** (e.g., "Feb 25, 2026")
- ⏳ **Remaining Days** (e.g., "3 days remaining" or "🔴 2 days overdue")
- 📍 **Stage Timeline** (started date + duration + grace period)
- 🎯 **SLA Duration Details** (e.g., "Duration: 10 days + 2 days grace period")

#### **Visual Indicators**

Stage Status Badge:
- 🟢 **On Track** (normal color, > 2 days remaining)
- 🟡 **Due Soon** (yellow, ≤ 2 days remaining)
- 🔴 **Overdue** (red, past due date)
- ⛔ **Expired** (dark red, past grace period)

#### **Key Features**

1. **Real-time Calculations**
   - Days remaining/overdue auto-calculated from due_at
   - Considers extended deadlines (extended_until if set)
   - Respects grace periods in status determination

2. **Smart Display**
   - Only shows detailed info when stage is ACTIVE
   - Shows completion time for COMPLETED stages
   - Graceful fallback if no SLA data available

3. **Data Source**
   - Fetches `workflow_stage_instances` (deadline data)
   - Joins with `workflow_sla_policies` (duration/grace info)
   - Updates in real-time with SLA fetches

---

## 📦 Database Changes

### Tables Modified
- ✅ `workflow_sla_policies` - Added RLS

### New Columns
- None (all existing schema reused)

### New Indexes
- None (existing indexes sufficient)

### No Breaking Changes
- All existing tables/columns preserved
- Workflow statuses unchanged
- Existing transitions untouched

---

## 🔧 How to Use

### Admin: Update SLA Duration

```typescript
// Example: Update evaluation stage to 7 days (from 10)
const { error } = await supabase
  .from('workflow_sla_policies')
  .update({ duration_days: 7 })
  .eq('stage', 'evaluation');

// Non-admin attempts same query → RLS blocks with 403
```

### Admin: Check Overdue Stages

```typescript
// Run check-overdue-stages function
const response = await fetch('/functions/v1/check-overdue-stages', {
  method: 'POST'
});

// Returns: { marked_overdue, marked_expired, notifications_sent, errors }
```

### User: View Deadlines

- Open Process Tracking Wizard
- Current stage shows deadline prominently
- Hover over deadline badge for SLA duration details

---

## 🧪 Testing Checklist

### ✅ Verify RLS Works

```sql
-- As admin: SUCCEEDS
UPDATE workflow_sla_policies SET duration_days = 8 WHERE stage = 'supervisor_review';

-- As non-admin: FAILS with RLS violation
UPDATE workflow_sla_policies SET duration_days = 8 WHERE stage = 'supervisor_review';
```

### ✅ Verify Notifications Include SLA

1. Create a stage instance that's past due
2. Run `check-overdue-stages` edge function
3. Check `notifications` table → payload has `sla_duration_days`, `sla_grace_days`
4. Check email → includes "Duration: X days + Y days grace period"

### ✅ Verify UI Displays Deadline

1. Create a record and move to supervisor_review stage
2. Open Process Tracking Wizard
3. See deadline date, remaining days, SLA duration

### ✅ Verify Grace Period Handling

1. Create stage past due but within grace period
2. Should show as "OVERDUE" but not "EXPIRED"
3. At grace period end → auto-marked "EXPIRED"

---

## 📋 File Changes Summary

### New Files
```
supabase/migrations/20260225000500_enable_rls_sla_policies.sql
SLA_ADMIN_RLS_TEST.sql
SLA_ADMIN_IMPLEMENTATION_GUIDE.md
```

### Modified Files
```
supabase/functions/check-overdue-stages/index.ts
  - Added formatSLADetails() helper
  - Enhanced notification messages with SLA info
  - Added sla_duration_days, sla_grace_days to payload
  - Enhanced email details to include SLA duration, grace period, due date

supabase/functions/send-notification-email/index.ts
  - Added additionalInfo field to EmailRequest interface
  - Updated to accept additionalInfo from request
  - Fallback to legacy fields if additionalInfo not provided

src/components/ProcessTrackingWizard.tsx
  - Added slaPolicies state
  - Added fetchSLAPolicies() function
  - Enhanced getSLAStatus() to include durationDays, graceDays, startDate
  - Improved UI to show detailed deadline card for current stages
  - Added completion time comparison for completed stages
```

---

## 🔐 Security Considerations

### RLS Protection
- ✅ Only admins can modify SLA policies (UPDATE/INSERT/DELETE)
- ✅ All authenticated users can READ (needed for stage creation)
- ✅ Service role (edge functions) can bypass via SERVICE_ROLE_KEY
- ✅ Admin role checked via JOIN to users table (not client-modifiable)

### Notification Safety
- ✅ Rate-limited (24-hour cooldown) prevents spam
- ✅ Non-critical failures don't block workflow
- ✅ Email service failures logged but don't break transitions

### Data Integrity
- ✅ Grace period calculation server-side (cannot be forged)
- ✅ Due date immutable once created (only extended_until changeable)
- ✅ Status transitions controlled by check-overdue-stages (not user-modifiable)

---

## ⚡ Performance Notes

### Indexes Used
- `idx_sla_policies_stage` - Fast policy lookups
- `idx_stage_instances_status` - Quick overdue filtering
- `idx_stage_instances_due_date` - Efficient grace period checks

### Query Patterns
- **Creating Stage**: Queries SLA policy (indexed lookup)
- **Checking Overdue**: Filters by status + due_at (both indexed)
- **UI Display**: Fetches policies (cached in React state)

---

## 🚨 Troubleshooting

### Issue: Non-admin sees "Permission Denied" on SLA page

**Cause:** RLS blocking UPDATE/INSERT/DELETE  
**Fix:** This is expected. Only admins can modify.

### Issue: Notifications not including SLA details

**Cause:** Old check-overdue-stages version  
**Fix:** Ensure deployed function has latest code with formatSLADetails() helper

### Issue: ProcessTrackingWizard shows "No deadline"

**Cause:** No workflow_sla_policies entry for stage  
**Fix:** Seed default policies with migration 20260225000400_seed_sla_policies.sql

### Issue: Email template doesn't show SLA details

**Cause:** Function not receiving additionalInfo  
**Fix:** Update check-overdue-stages to pass additionalInfo in fetch body

---

## 📚 Related Documentation

- **SLA Policy Seeding:** `supabase/migrations/20260225000400_seed_sla_policies.sql`
- **Workflow Migration:** `supabase/migrations/20260225000100_add_sla_workflow_tables.sql`
- **API Map:** See `API_MAP.md` for edge function endpoints
- **Test Script:** Run `SLA_ADMIN_RLS_TEST.sql` for verification

---

## ✅ Implementation Complete

All tasks completed with **zero breaking changes** to existing workflow logic. System is:
- ✅ **Secure** - RLS protects admin functions
- ✅ **Notifying** - SLA-aware emails/in-app notifications
- ✅ **Transparent** - Users see clear deadlines in UI
- ✅ **Maintainable** - Minimal code changes, reuses existing systems
- ✅ **Production-Ready** - Tested and documented
