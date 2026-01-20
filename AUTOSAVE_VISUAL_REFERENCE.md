# 🎯 Autosave Implementation - Visual Reference

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │ Form Fields      │    │ Autosave Status Indicator    │   │
│  │ (6-step form)    │───→│ ├─ Saving...                │   │
│  │                  │    │ ├─ Saved at 2:45 PM        │   │
│  │ TypeScript State │    │ └─ Save failed (retry)      │   │
│  └────────┬─────────┘    └──────────────────────────────┘   │
│           │                                                   │
│           │ useEffect watches formData                       │
│           └──────────────────┬──────────────────────────────│
│                              │                               │
│  ┌──────────────────────────┴──────────────────┐            │
│  │ Debounce Handler (3 second delay)          │            │
│  │ handleAutoSave() → setTimeout              │            │
│  └──────────────────────────┬──────────────────┘            │
│                              │                               │
│  ┌────────────────────────────────────────────┐             │
│  │ saveDraft() Function                       │             │
│  │ ├─ Format form data                        │             │
│  │ ├─ Create/Update ip_records                │             │
│  │ └─ Update UI status                        │             │
│  └────────────────────────┬─────────────────── │             │
│                           │                    │             │
│  ┌────────────────────────┴────────────────┐  │             │
│  │ Draft Recovery Modal                    │  │             │
│  │ ├─ Load draft on mount                  │  │             │
│  │ ├─ Show recovery options                │  │             │
│  │ └─ Restore form fields                  │  │             │
│  └─────────────────────────────────────────┘  │             │
│                                                 │             │
│  ┌─────────────────────────────────────────┐   │             │
│  │ ApplicantDashboard                      │   │             │
│  │ ├─ Draft Submissions Table              │   │             │
│  │ ├─ Progress Bars (Step X/6)             │   │             │
│  │ ├─ Last Saved Timestamps                │   │             │
│  │ └─ Continue/Delete Buttons              │   │             │
│  └─────────────────────────────────────────┘   │             │
│                                                  │             │
└──────────────────────────────┬───────────────────┼─────────────
                               │                   │
                               ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE CLIENT SDK                      │
├─────────────────────────────────────────────────────────────┤
│  ├─ supabase.from('ip_records').insert()                    │
│  ├─ supabase.from('ip_records').update()                    │
│  ├─ supabase.from('ip_records').select()                    │
│  └─ supabase.from('ip_records').delete()                    │
└──────────────────────────┬────────────────────────────────────
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                        │
├─────────────────────────────────────────────────────────────┤
│  ip_records table                                            │
│  ├─ id (UUID)                                               │
│  ├─ applicant_id (FK)                                       │
│  ├─ title VARCHAR                                           │
│  ├─ category VARCHAR                                        │
│  ├─ abstract TEXT                                           │
│  ├─ details JSONB { inventors[], keywords[], etc }          │
│  ├─ status = 'draft' (for autosaved drafts)                │
│  ├─ current_step INT (tracks form step 1-6)                │
│  ├─ updated_at TIMESTAMP (auto-updated on change)          │
│  └─ RLS Policies (users see only own drafts)               │
│                                                              │
│  Indexes:                                                    │
│  ├─ (applicant_id, status) - Fast draft lookups            │
│  └─ updated_at - For sorting/cleanup                        │
│                                                              │
│  Triggers:                                                   │
│  └─ update_ip_records_timestamp() - Auto-update timestamps  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
START
  │
  ├─→ User opens NewSubmissionPage
  │    │
  │    └─→ useEffect: loadDraft()
  │         │
  │         └─→ Query: SELECT * FROM ip_records
  │            WHERE applicant_id = user_id
  │            AND status = 'draft'
  │            LIMIT 1
  │         │
  │         ├─ If draft found:
  │         │  └─→ Show recovery modal
  │         │     ├─ Recover → Populate formData
  │         │     └─ Start New → Clear formData
  │         │
  │         └─ If no draft: Show empty form
  │
  ├─→ User types in form field
  │    │
  │    └─→ setFormData() updates React state
  │         │
  │         └─→ useEffect watches formData
  │            │
  │            └─→ Call handleAutoSave(formData)
  │               │
  │               ├─ Clear existing timeout
  │               └─ Set new timeout (3 seconds)
  │                  │
  │                  └─ After 3 seconds of inactivity:
  │                     │
  │                     └─→ Call saveDraft(formData)
  │                        │
  │                        ├─ setAutoSaveStatus('saving')
  │                        │
  │                        ├─ If draftId exists:
  │                        │  │
  │                        │  └─→ PATCH ip_records SET {...}
  │                        │     WHERE id = draftId
  │                        │
  │                        └─ If draftId null:
  │                           │
  │                           └─→ INSERT INTO ip_records
  │                              VALUES (user_id, 'draft', ...)
  │                              │
  │                              └─→ Save returned id as draftId
  │
  │                        └─→ On Success:
  │                           ├─ setAutoSaveStatus('saved')
  │                           ├─ setLastSaveTime(timestamp)
  │                           └─ Auto-clear after 3s
  │
  │                        └─→ On Error:
  │                           ├─ setAutoSaveStatus('error')
  │                           └─ Log to console
  │
  ├─→ User navigates away
  │    │
  │    └─→ Browser triggers beforeunload event
  │         │
  │         ├─ If autoSaveStatus = 'saving':
  │         │  └─→ Warn user: "Changes still being saved"
  │         │
  │         └─ If unsaved changes detected:
  │            └─→ Warn user: "You have unsaved changes"
  │
  ├─→ User clicks "Submit"
  │    │
  │    └─→ handleSubmit()
  │         │
  │         ├─ CREATE new ip_records with status='submitted'
  │         │
  │         ├─ If draftId exists:
  │         │  └─→ DELETE FROM ip_records WHERE id=draftId
  │         │
  │         └─ Upload documents
  │            │
  │            └─ On Success:
  │               └─→ Navigate to dashboard
  │                  │
  │                  └─→ Draft table auto-refreshes
  │
  └─→ END
```

---

## User Journey: Draft Recovery

```
Session 1: User starts submission
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open "New Submission" form
   ├─ Page loads
   └─ useEffect: loadDraft() → No draft found → Show empty form

2. Fill in some fields (Step 1)
   └─ Wait 3 seconds → Auto-save to database
      └─ Icon shows: ✓ Saved at 2:15 PM

3. Fill in more fields (Step 2-3)
   └─ Every 3 seconds of inactivity → Auto-save
      └─ Icon shows: ✓ Saved at 2:20 PM

4. **Browser crashes / User accidentally closes tab** ❌
   └─ Draft safely stored in database with status='draft'

---

Session 2: User returns later
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open "New Submission" form again
   ├─ Page loads
   └─ useEffect: loadDraft() → **Draft found!**
      └─ Show recovery modal:
         
         ┌─────────────────────────────┐
         │ Draft Submission Found      │
         │ Saved progress: Step 3 of 6 │
         │ Last saved: 2:20 PM         │
         │                             │
         │ [✓ Recover Draft] [Start ✗] │
         └─────────────────────────────┘

2. Click [✓ Recover Draft]
   ├─ Query: SELECT * FROM ip_records WHERE id=draftId
   ├─ Populate all form fields with saved data
   ├─ Modal closes
   └─ Form displays:
      "You're on Step 3 of 6 with your previous data"

3. Continue filling from where they left off (Step 4-5)
   └─ Auto-save continues as they type
      └─ ✓ Saved at 2:45 PM

4. Click [Submit]
   ├─ Validate all required fields
   ├─ CREATE new ip_records with status='submitted'
   ├─ DELETE old draft from database
   └─ Redirect to dashboard

---

Dashboard View: Shows all drafts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Draft Submissions (2)

┌──────────────────┬──────────┬─────────┬────────────────┬─────────────┐
│ Title            │ Category │ Progress│ Last Saved     │ Actions     │
├──────────────────┼──────────┼─────────┼────────────────┼─────────────┤
│ AI Algorithm     │ Patent   │ ▓▓▓░░░  │ Jan 20 2:45 PM │ Continue ✎  │
│ (Step 3/6)       │          │ 50%     │                │ Delete 🗑    │
├──────────────────┼──────────┼─────────┼────────────────┼─────────────┤
│ Untitled Draft   │ Copyright│ ▓░░░░░  │ Jan 20 10:30AM │ Continue ✎  │
│ (Step 1/6)       │          │ 17%     │                │ Delete 🗑    │
└──────────────────┴──────────┴─────────┴────────────────┴─────────────┘

Click "Continue" → Auto-load that draft and show recovery modal
Click "Delete" → Remove draft, can't recover
```

---

## State Management Tree

```
NewSubmissionPage
├── Form State
│   └── formData: {
│       ├── title: string
│       ├── category: string
│       ├── abstract: string
│       ├── description: string
│       ├── ...15 more fields...
│       ├── inventors: [{name, affiliation, contribution}]
│       ├── keywords: [{id, value}]
│       └── collaborators: [{id, name, role, affiliation}]
│       
├── UI State
│   ├── step: number (1-6)
│   ├── loading: boolean
│   ├── error: string
│   ├── success: boolean
│   ├── uploading: boolean
│   └── uploadProgress: number
│
├── Autosave State
│   ├── autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'
│   ├── lastSaveTime: string (HH:MM format)
│   ├── draftId: UUID | null
│   ├── showDraftRecover: boolean
│   ├── autoSaveTimerRef: NodeJS.Timeout | null
│   └── autoSaveDebounceRef: NodeJS.Timeout | null
│
└── File State
    ├── uploadedFiles: File[]
    └── uploadedFileMetadata: {}
```

---

## Database Query Reference

### Create Draft (First Save)
```sql
INSERT INTO ip_records (
  applicant_id, title, category, abstract, details,
  status, supervisor_id, current_step
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- user UUID
  'AI Algorithm Optimization',              -- title
  'patent',                                   -- category
  'An efficient algorithm for...',          -- abstract
  {                                         -- details JSON
    "description": "Technical description...",
    "inventors": [...],
    "keywords": ["AI", "ML"],
    ...
  },
  'draft',                                  -- status
  NULL,                                      -- no supervisor yet
  1                                         -- step 1 of 6
) RETURNING id;
```

### Update Draft (Autosave)
```sql
UPDATE ip_records SET
  title = 'AI Algorithm Optimization',
  category = 'patent',
  abstract = 'An efficient algorithm for...',
  details = {...full JSON object...},
  current_step = 3,
  updated_at = NOW()
WHERE id = '89ab1234-5678-90ab-cdef-1234567890ab'
  AND status = 'draft'
  AND applicant_id = '123e4567-e89b-12d3-a456-426614174000';
```

### Load Latest Draft
```sql
SELECT * FROM ip_records
WHERE applicant_id = '123e4567-e89b-12d3-a456-426614174000'
  AND status = 'draft'
ORDER BY updated_at DESC
LIMIT 1;
```

### Convert Draft to Submission
```sql
-- 1. Update draft to submitted
UPDATE ip_records SET
  status = 'submitted',
  current_stage = 'Submitted',
  updated_at = NOW()
WHERE id = '89ab1234-5678-90ab-cdef-1234567890ab';

-- 2. Delete old draft
DELETE FROM ip_records
WHERE id = '89ab1234-5678-90ab-cdef-1234567890ab'
  AND status = 'draft';
```

### List User's Drafts
```sql
SELECT id, title, category, current_step, abstract, updated_at
FROM ip_records
WHERE applicant_id = '123e4567-e89b-12d3-a456-426614174000'
  AND status = 'draft'
ORDER BY updated_at DESC;
```

---

## API Response Examples

### Create Draft Response
```json
{
  "id": "89ab1234-5678-90ab-cdef-1234567890ab",
  "applicant_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "AI Algorithm",
  "category": "patent",
  "abstract": "An efficient algorithm for...",
  "details": {
    "description": "Technical details...",
    "inventors": [{"name": "John Doe", "affiliation": "...", "contribution": "..."}],
    "keywords": ["AI", "ML"],
    ...
  },
  "status": "draft",
  "current_step": 1,
  "created_at": "2026-01-20T14:15:30Z",
  "updated_at": "2026-01-20T14:15:30Z"
}
```

### Load Draft Response
```json
{
  "id": "89ab1234-5678-90ab-cdef-1234567890ab",
  "title": "AI Algorithm",
  "category": "patent",
  "abstract": "An efficient algorithm for...",
  "details": { ... },
  "status": "draft",
  "current_step": 3,
  "updated_at": "2026-01-20T14:20:45Z"
}
```

---

## Error Handling Flow

```
Save Attempt
  │
  ├─→ Network Error
  │   └─→ setAutoSaveStatus('error')
  │       └─→ Display "Save failed"
  │           └─→ Auto-retry on next change
  │
  ├─→ Database Error (RLS violation)
  │   └─→ setAutoSaveStatus('error')
  │       └─→ Log to console
  │           └─→ User can't recover (notify support)
  │
  ├─→ Validation Error (invalid data)
  │   └─→ setAutoSaveStatus('error')
  │       └─→ Log specific field issue
  │           └─→ Highlight invalid field
  │
  ├─→ Quota Error (storage limit)
  │   └─→ setAutoSaveStatus('error')
  │       └─→ Prompt user to delete old drafts
  │           └─→ Clean up space
  │
  └─→ Success
      └─→ setAutoSaveStatus('saved')
          └─→ Display timestamp
              └─→ Auto-clear after 3s
```

---

## Testing Matrix

| Scenario | Expected Result | Status |
|----------|-----------------|--------|
| Type text in form → Wait 3s | Autosave indicator shows "Saved at HH:MM" | ✅ |
| Rapid form changes | Only saves after 3s of no changes (debounce) | ✅ |
| Page refresh | Draft recovery modal appears | ✅ |
| Click "Recover Draft" | All form fields populate | ✅ |
| Click "Start New" | Old draft deleted, form cleared | ✅ |
| Network disconnected | "Save failed" message shown | ✅ |
| Close page during save | Browser warning appears | ✅ |
| Delete draft | Draft removed from dashboard | ✅ |
| Submit with draft | Draft deleted, new submitted record created | ✅ |
| Multiple drafts | Only latest one loads on revisit | ✅ |

---

**Generated:** January 20, 2026  
**Documentation Version:** 1.0  
**Implementation Status:** ✅ Production Ready
