# SLA Admin System - Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐           ┌────────────────────────┐  │
│  │ Process Tracking     │           │ SLA Policy Manager     │  │
│  │ Wizard               │           │ (Admin Only)           │  │
│  │                      │           │                        │  │
│  │ • Current Stage      │           │ • Edit Duration        │  │
│  │ • Due Date           │           │ • Grace Period         │  │
│  │ • Remaining Days     │           │ • Extensions           │  │
│  │ • Visual Badges      │           │ • Extension Days       │  │
│  │   - On Track (🟢)    │           │                        │  │
│  │   - Due Soon (🟡)    │           │ RLS: Admin only        │  │
│  │   - Overdue (🔴)     │           │       UPDATE/DELETE    │  │
│  │   - Expired (⛔)      │           └────────────────────────┘  │
│  └──────────────────────┘                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (React State & Fetches)
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE API LAYER (RLS)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  workflow_stage_instances                                │   │
│  │  ├─ SELECT: Authenticated ✅                             │   │
│  │  ├─ INSERT: System only                                  │   │
│  │  └─ UPDATE: System only                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  workflow_sla_policies 🔐 RLS ENABLED                   │   │
│  │  ├─ SELECT: Authenticated ✅                             │   │
│  │  ├─ INSERT: Admin only ✅                                │   │
│  │  ├─ UPDATE: Admin only ✅                                │   │
│  │  └─ DELETE: Admin only ✅                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  notifications                                            │   │
│  │  ├─ INSERT: Edge functions + workflow events             │   │
│  │  └─ SELECT: Users can view own notifications             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Service Role - Bypass RLS)
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  check-overdue-stages (Scheduled or Triggered)           │   │
│  │                                                           │   │
│  │  1. Query workflow_stage_instances (status=ACTIVE)       │   │
│  │  2. Join workflow_sla_policies (grace_days)              │   │
│  │  3. Check: due_at < NOW() ?                              │   │
│  │  4. Calculate: grace_deadline + grace_days               │   │
│  │  5. Update status ACTIVE → OVERDUE → EXPIRED             │   │
│  │  6. Create notification (in_app)                         │   │
│  │  7. Send email notification                              │   │
│  │  8. Update notified_at (rate limit)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  send-notification-email                                │   │
│  │                                                           │   │
│  │  • Takes: title, message, additionalInfo                │   │
│  │  • Builds HTML template with SLA details                │   │
│  │  • Additional Info:                                      │   │
│  │    - Stage name                                          │   │
│  │    - Days overdue                                        │   │
│  │    - SLA duration + grace period                         │   │
│  │    - Due date                                            │   │
│  │  • Sends via Resend API                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Resend Email    │  │  User Inbox      │  │  Supabase DB │  │
│  │  Service         │→ │  (Recipients)    │  │  (With RLS)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: Admin Updates SLA Duration

```
Admin UI (SLAPolicyManager)
    ↓
Input: duration_days = 5 for "evaluation"
    ↓
API Call:
  supabase
    .from('workflow_sla_policies')
    .update({ duration_days: 5 })
    .eq('stage', 'evaluation')
    ↓
RLS Checks:
  ✅ Is auth.uid() in admin users? YES
  ✅ Allow UPDATE? YES
    ↓
Database Update:
  workflow_sla_policies
  WHERE stage = 'evaluation'
  SET duration_days = 5, updated_at = NOW()
    ↓
Effect:
  ✅ NEW stage instances use 5-day deadline
  ✅ OLD stage instances UNCHANGED (immutable)
    ↓
Confirmation:
  ✅ UI shows "Saved successfully"
  ✅ Non-admin blocked (would get RLS 403)
```

### Example 2: Applicant Sees Deadline in UI

```
User Opens Process Tracking Wizard
    ↓
React Component Mounts:
  1. Fetch workflow_stage_instances
     WHERE ip_record_id = [current]
     ORDER BY created_at DESC
  2. Fetch workflow_sla_policies
     WHERE is_active = TRUE
    ↓
Data Received:
  Stage Instance:
    - stage: "supervisor_review"
    - started_at: 2026-02-24 10:00 AM
    - due_at: 2026-03-03 10:00 AM (7 days)
    - status: "ACTIVE"
  
  SLA Policy:
    - duration_days: 7
    - grace_days: 2
    ↓
UI Calculation:
  - Now: 2026-02-28 10:00 AM
  - Days remaining: 3 days
  - Status: "On Track" (> 2 days) → 🟢 Green badge
    ↓
Display:
  ┌─────────────────────────────┐
  │ 📅 Deadline         Mar 3   │
  │ ✅ 3 days remaining          │
  │ Started: Feb 24              │
  │ Duration: 7 days + 2 grace   │
  └─────────────────────────────┘
```

### Example 3: Stage Becomes Overdue (Notification Flow)

```
Timeline:
  Feb 24: Stage created, due_at = Mar 3
  Mar 3:  Due date passed
  Mar 4:  check-overdue-stages runs (Scheduled/Manual)
    ↓
Function Steps:
  1. Query:
     SELECT * FROM workflow_stage_instances
     WHERE status = 'ACTIVE' AND due_at < NOW()
       → Found! supervisor_review stage, due 1 day ago
    
  2. Join SLA policy:
     grace_days = 2
     grace_deadline = Mar 3 + 2 days = Mar 5
    
  3. Check grace:
     Is NOW() > grace_deadline? Mar 4 is NOT > Mar 5
     → Status = OVERDUE (not EXPIRED yet)
    
  4. Has notified recently?
     notified_at = NULL (never notified)
     → Should notify = TRUE
    
  5. Create in-app notification:
     INSERT INTO notifications:
       - type: "overdue_stage"
       - title: "Overdue: supervisor review - IP-2025-PT-00001"
       - message: "...task is 1 day overdue..."
       - payload: {
           stage: "supervisor_review",
           days_overdue: 1,
           is_expired: false,
           sla_duration_days: 7,
           sla_grace_days: 2,
           due_date: "2026-03-03T10:00:00Z"
         }
    
  6. Send email:
     POST /functions/v1/send-notification-email
     Body: {
       to: "supervisor@ucc.edu",
       subject: "Overdue: supervisor review - IP-2025-PT-00001",
       title: "Overdue: supervisor review",
       message: "...task is 1 day overdue...",
       additionalInfo: {
         "Stage": "supervisor review",
         "Status": "OVERDUE",
         "Days Overdue": "1",
         "SLA Duration": "7 days",
         "Grace Period": "2 days",
         "Due Date": "Mar 3, 2026 10:00 AM"
       }
     }
    
  7. Email renders:
     ┌──────────────────────────────────┐
     │ Overdue: supervisor review       │
     │                                  │
     │ Your task is 1 day overdue...    │
     │                                  │
     │ Supervisor Details:              │
     │ ├─ Stage: supervisor review      │
     │ ├─ Status: OVERDUE               │
     │ ├─ Days Overdue: 1               │
     │ ├─ SLA Duration: 7 days          │
     │ ├─ Grace Period: 2 days          │
     │ └─ Due Date: Mar 3, 2026 10:00AM │
     │                                  │
     │ Consequence: ...impact timeline..│
     └──────────────────────────────────┘
    
  8. Update tracking:
     UPDATE workflow_stage_instances
     SET status = 'OVERDUE',
         notified_at = NOW(),
         updated_at = NOW()
     WHERE id = [stage_id]
    
  9. Return summary:
     {
       marked_overdue: 1,
       marked_expired: 0,
       notifications_sent: 1,
       message: "Checked 5 overdue stages..."
     }
```

### Example 4: Applicant Sees Grace Period Expiration

```
Timeline:
  Feb 24: revision_requested stage created
          due_at = Mar 10 (14 days)
  Mar 10: Due date passed (overdue)
  Mar 12: Still within grace (2 days)
          check-overdue-stages marks: OVERDUE
          Applicant sees in UI: 🔴 "OVERDUE (2 days grace remaining)"
  Mar 13: Grace period expiration approaching
          Another check-overdue-stages run:
          grace_deadline = Mar 10 + 3 = Mar 13
          Now = Mar 13, 2:00 PM > Mar 13, 10:00 AM
          → Update status = EXPIRED
          → Send: "Action Required: Deadline EXPIRED"
          → Payload: "Applicant revises and resubmits..."
          
          Applicant sees in UI: ⛔ "EXPIRED"
          Cannot submit after this (application logic)
```

---

## 📊 Request/Response Examples

### Admin Updates SLA Policy

**Request:**
```typescript
const { data, error } = await supabase
  .from('workflow_sla_policies')
  .update({ 
    duration_days: 10,
    grace_days: 2
  })
  .eq('stage', 'evaluation')
  .select();

// Response on success (admin):
{
  data: [{
    id: "uuid",
    stage: "evaluation",
    duration_days: 10,
    grace_days: 2,
    updated_at: "2026-02-25T15:30:00Z"
  }]
}

// Response on failure (non-admin):
{
  error: {
    message: "new row violates row-level security policy",
    code: "PGRST100",
    details: "RLS violation"
  }
}
```

---

## 🔐 RLS Permission Matrix

| Operation | Authenticated | Admin | Service Role | Notes |
|-----------|---|---|---|---|
| SELECT workflow_sla_policies | ✅ (`is_active=TRUE`) | ✅ (all) | ✅ | For reading policy durations |
| INSERT workflow_sla_policies | ❌ | ✅ | ✅ | Data integrity |
| UPDATE workflow_sla_policies | ❌ | ✅ | ✅ | Admin control |
| DELETE workflow_sla_policies | ❌ | ✅ | ✅ | Soft delete via is_active |
| SELECT workflow_stage_instances | ✅ (own records) | ✅ (all) | ✅ | Query deadlines |
| INSERT workflow_stage_instances | ❌ | ✅ | ✅ | System creates |
| UPDATE workflow_stage_instances | ❌ | ✅ | ✅ | System updates |

---

## 🔄 State Management

### React Component State

```typescript
// ProcessTrackingWizard.tsx
const [tracking, setTracking] = useState<any[]>([]);
const [stageInstances, setStageInstances] = useState<any[]>([]);
const [slaPolicies, setSlaPolicies] = useState<any[]>([]);
const [steps, setSteps] = useState<ProcessStep[]>([]);

// On mount:
// 1. Fetch process_tracking (existing)
// 2. Fetch workflow_stage_instances (new)
// 3. Fetch workflow_sla_policies (new)
// Then compute:
// getSLAStatus() → { status, daysRemaining, dueDate, ... }

// SLAPolicyManager.tsx
const [policies, setPolicies] = useState<SLAPolicy[]>([]);
const [editingId, setEditingId] = useState<string | null>(null);
const [formData, setFormData] = useState<Partial<SLAPolicy>>({});
```

---

## 🚀 Deployment Order

```
1. Deploy migrations (RLS setup)
   → supabase migrations push
   
2. Deploy/update edge functions
   → supabase functions deploy check-overdue-stages
   → supabase functions deploy send-notification-email
   
3. Update React components
   → Update ProcessTrackingWizard.tsx
   → Add SLAPolicyManager.tsx
   
4. Test (run SLA_ADMIN_RLS_TEST.sql)
   
5. Go live!
```

---

## ✅ Checkpoint: All Components Connected

```
✅ RLS blocks non-admin updates
✅ Admin UI sends update requests → RLS allows
✅ Database updated → Triggers affect new instances
✅ ProcessTrackingWizard fetches policy + instance data
✅ UI calculates and displays deadlines
✅ check-overdue-stages compares due_at to NOW()
✅ Notifications sent with SLA details
✅ Emails formatted with grace period info
✅ Grace period countdown visible in UI
✅ Status transitions: ACTIVE → OVERDUE → EXPIRED
```

**Everything is wired together and ready to go!** 🚀
