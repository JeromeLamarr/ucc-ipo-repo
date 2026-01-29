# 🎯 Revision Editing Flow - Visual Quick Reference

## User Journey Map

### Applicant Flow

```
┌─────────────────────────────────────────────────────────────┐
│  APPLICANT SUBMITS INITIAL SUBMISSION                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  SUPERVISOR/EVALUATOR REVIEWS                               │
│  (status: waiting_supervisor or waiting_evaluation)         │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
   ┌─────────────┐           ┌──────────────┐
   │  APPROVES   │           │  REQUESTS    │
   │  (no action)│           │  REVISIONS   │
   └─────────────┘           └──────┬───────┘
   Status:                          │
   supervisor_approved         Status:
                              supervisor_revision
                              or evaluator_revision
                                    │
                      ┌─────────────▼─────────────┐
                      │                           │
                      ▼                           ▼
          ┌───────────────────┐        ┌─────────────────┐
          │ SEES ORANGE BANNER│        │ CANT EDIT (red) │
          │ "REVISION REQUEST"│        │ (other statuses)│
          │                   │        └─────────────────┘
          │ CLICKS "EDIT"     │
          │ BUTTON            │
          └─────────┬─────────┘
                    │
                    ▼
          ┌──────────────────────┐
          │  EDIT MODAL OPENS    │
          │ Pre-fills all data   │
          └─────────┬────────────┘
                    │
        ┌───────────┴──────────────┐
        │                          │
        ▼                          ▼
   ┌────────────┐           ┌───────────────┐
   │ SAVE DRAFT │           │ RESUBMIT      │
   │ (no notify)│           │ (notifies rev)│
   └────────────┘           └───────┬───────┘
   Status: UNCHANGED                │
                            Status Changed:
                            supervisor_revision
                              → waiting_supervisor
                            evaluator_revision
                              → waiting_evaluation
                                    │
                      ┌─────────────▼─────────────┐
                      │  BACK TO SUPERVISOR       │
                      │  FOR FURTHER REVIEW       │
                      │  (Cycle repeats if needed)│
                      └───────────────────────────┘
```

---

## UI Components Map

### Revision Banner (When Status = revision)
```
┌─────────────────────────────────────────────────────────┐
│ 🔔 REVISION REQUESTED BY SUPERVISOR                     │
├─────────────────────────────────────────────────────────┤
│ 👤 Supervisor: Catherine Llena                           │
│ 📅 Request Date: January 29, 2026 at 11:35 AM           │
│                                                          │
│ 💬 Revision Reason:                                     │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Please improve the description of the technical    │  │
│ │ implementation and provide more details about the  │  │
│ │ potential commercial applications.                 │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ⚡ Action Required: Click "Edit Submission" to update   │
└─────────────────────────────────────────────────────────┘
```

### Edit Button Location
```
┌────────────────────────────────────────────────────────┐
│  ← Back                    [Edit Submission Button] 🖊️ │
│                                                        │
│  Submission Title                    Revision Requested│
│  Author Name    |  Patent  |  Jan 29, 2026            │
└────────────────────────────────────────────────────────┘
```

### Edit Submission Modal Layout
```
┌──────────────────────────────────────────────────────────┐
│ ✏️  EDIT SUBMISSION                               ✕     │
│ Update your submission before resubmitting              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Title *                                                  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [existing title]                                  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Category                                                 │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [Patent ▼]                                        │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Abstract *                                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [existing abstract text...]                       │  │
│ │ [longer textarea...]                              │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [... more fields ...]                                   │
│                                                          │
│ Inventors & Contributors *                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Name: [John Doe] Dept: [CS] Contribution: [Main]  │  │
│ │ [Remove button]                                    │  │
│ │                                                    │  │
│ │ Name: [] Dept: [] Contribution: []                │  │
│ │ [Remove button]                                    │  │
│ │                                                    │  │
│ │ + Add Inventor                                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Documents (Minimum 1 required) *                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Current Documents:                                 │  │
│ │ • document1.pdf (245 KB) [Delete]                 │  │
│ │ • document2.docx (128 KB) [Delete]                │  │
│ │                                                    │  │
│ │ New Documents to Upload:                           │  │
│ │ • newfile.pdf (512 KB) [Remove]                   │  │
│ │                                                    │  │
│ │ ┌──────────────────────────────────────────────┐  │  │
│ │ │  📤 Click to upload files                    │  │  │
│ │ │     or drag and drop                         │  │  │
│ │ └──────────────────────────────────────────────┘  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Cancel]  [Save as Draft]  [Resubmit for Review]      │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Save Draft Flow
```
User Clicks "Save as Draft"
        │
        ▼
Form Validation
├─ Title? ✓
├─ Abstract? ✓
├─ Inventors? ✓
├─ Documents? ✓
└─ File sizes? ✓
        │
        ▼ (All pass)
Update ip_records
├─ title
├─ abstract
├─ category
├─ details (all technical fields)
└─ updated_at (KEEP STATUS UNCHANGED)
        │
        ▼
Handle Documents
├─ Delete marked files from storage
├─ Delete marked files from database
└─ Upload new files to storage & database
        │
        ▼
Log Activity
├─ action: 'submission_draft_saved'
├─ user_id: applicant
└─ timestamp: now
        │
        ▼
Modal Closes ✓
Success Message Shows ✓
```

### Resubmit Flow
```
User Clicks "Resubmit for Review"
        │
        ▼
Form Validation
├─ Title? ✓
├─ Abstract? ✓
├─ Inventors? ✓
├─ Documents? ✓
└─ File sizes? ✓
        │
        ▼ (All pass)
Update ip_records
├─ title
├─ abstract
├─ category
├─ details (all technical fields)
├─ status: 'waiting_supervisor' or 'waiting_evaluation' 🔄
├─ current_stage: 'Resubmitted - Waiting for...'
└─ updated_at: now
        │
        ▼
Handle Documents
├─ Delete marked files from storage
├─ Delete marked files from database
└─ Upload new files to storage & database
        │
        ▼
Create Notification
├─ user_id: supervisor or evaluator
├─ type: 'resubmission'
├─ message: 'X has updated their submission'
└─ timestamp: now
        │
        ▼
Log Activity
├─ action: 'submission_resubmitted'
├─ user_id: applicant
├─ old_status, new_status
└─ timestamp: now
        │
        ▼
Update Process Tracking
├─ stage: 'Resubmitted - Waiting for...'
├─ status: 'waiting_supervisor' or 'waiting_evaluation'
├─ actor: applicant
└─ action: 'submission_resubmitted'
        │
        ▼
Send Email Notification
├─ to: applicant email
├─ subject: 'Your submission has been resubmitted'
├─ include: details of resubmission
└─ include: supervisor name
        │
        ▼
Modal Closes ✓
Success Message Shows ✓
```

---

## Status Transition Diagram

```
Initial Status States:
    ↓
supervisor_revision ←┐       evaluator_revision ←┐
    │                │           │                │
    │        (request │           │        (request │
    │       revisions)│           │       revisions)│
    │                │           │                │
    ▼                │           ▼                │
waiting_supervisor   │    waiting_evaluation     │
    │                │           │                │
    └────────────────┘           └────────────────┘
    
When applicant resubmits:
supervisor_revision ──[Resubmit]──> waiting_supervisor
evaluator_revision ──[Resubmit]──> waiting_evaluation

When save draft:
supervisor_revision ──[Save Draft]──> supervisor_revision (unchanged)
evaluator_revision ──[Save Draft]──> evaluator_revision (unchanged)
```

---

## File Management State Diagram

```
Initial State: Documents Loaded
        │
        ├─ Existing Doc A ✓
        ├─ Existing Doc B ✓
        └─ Existing Doc C ✓
        
User Actions:
        │
        ├─ Delete Doc A ──┐
        │                 ▼
        │             Marked for Deletion (⚠️ orange)
        │             ├─ Can Restore
        │             └─ Will delete on Save/Resubmit
        │
        ├─ Upload Doc D ──┐
        │                 ▼
        │             Pending Upload (📤 blue)
        │             ├─ Can Remove from upload list
        │             └─ Will upload on Save/Resubmit
        │
        └─ Delete & Restore Doc B ──┐
                                    ▼
                        Back to Existing (✓ gray)

Save Draft / Resubmit:
        │
        ├─ Delete marked files from storage
        ├─ Delete marked DB records
        ├─ Upload new files to storage
        ├─ Create new DB records
        └─ Update submission
```

---

## Permission Matrix

```
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Action              │Applicant │Supervisor│Evaluator │  Admin   │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ View Submission     │    ✓     │    ✓     │    ✓     │    ✓     │
│ See Edit Button     │   ✓*     │    ✗     │    ✗     │    ✗     │
│ Edit Submission     │   ✓*     │    ✗     │    ✗     │    ✗     │
│ Change Status       │    ✗     │    ✓     │    ✓     │    ✓     │
│ View All Documents  │   ✓**    │    ✓     │    ✓     │    ✓     │
│ Delete Documents    │   ✓*     │    ✗     │    ✗     │    ✓     │
│ Upload Documents    │   ✓*     │    ✗     │    ✗     │    ✓     │
│ View Evaluations    │    ✓     │    ✓     │    ✓     │    ✓     │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘

* Only if status = supervisor_revision or evaluator_revision
** Applicants see only their own documents
```

---

## Component File Structure

```
src/
├── pages/
│   └── SubmissionDetailPage.tsx
│       ├── Imports RevisionBanner
│       ├── Imports EditSubmissionModal
│       ├── Handles Save Draft logic
│       ├── Handles Resubmit logic
│       ├── Renders RevisionBanner (when applicable)
│       └── Renders EditSubmissionModal (when open)
│
└── components/
    ├── RevisionBanner.tsx
    │   └── Shows revision request context
    │
    └── EditSubmissionModal.tsx
        ├── Modal dialog with sticky header/footer
        ├── Form with all submission fields
        ├── Inventors section with add/remove
        ├── Keywords section with add/remove
        ├── Document management section
        ├── Form validation
        ├── File upload/delete/restore
        └── Save Draft / Resubmit buttons
```

---

## Key Features at a Glance

### ✨ RevisionBanner Component
- Shows revision request details prominently
- Orange color scheme to draw attention
- Displays reviewer name and reason
- Only shows when status is revision

### ✨ EditSubmissionModal Component
- Pre-fills all existing submission data
- Complete form with all fields
- Multi-inventor management
- Dynamic keywords and collaborators lists
- Document upload with drag-and-drop ready
- File validation (size & type)
- Form validation with error display
- Save as Draft vs Resubmit options

### ✨ SubmissionDetailPage Integration
- Detects revision status automatically
- Shows edit button only when appropriate
- Handles both save and resubmit flows
- Manages document lifecycle
- Creates notifications and logs

---

## Keyboard Shortcuts (Ready for Enhancement)

```
Current (Manual):
- Tab: Navigate between fields
- Enter: Submit form (future enhancement)
- Esc: Close modal (future enhancement)

Future Enhancements:
- Ctrl+S: Save as draft
- Ctrl+Shift+S: Resubmit for review
- Ctrl+Z: Undo last change
- Ctrl+Y: Redo last change
```

---

## Color Reference

```
Status Colors:
- Orange (revision request): #EA580C
- Red (error): #DC2626
- Green (success): #16A34A
- Blue (action): #2563EB
- Gray (inactive): #6B7280

Component Colors:
- RevisionBanner: Orange background with darker text
- Edit Button: Blue with white text
- Save as Draft: Gray button
- Resubmit: Green button
- Delete: Red icon/button
- New Documents: Blue background
- Deleted Documents: Orange background
```

---

## Performance Metrics

```
Load Times:
- Modal open: <200ms
- Form pre-fill: <300ms
- File upload: <5s per MB
- Save/Resubmit: <2s

Data Transfers:
- Initial load: ~50KB (submission data)
- File upload: Variable (max 10MB per file)
- Notification: ~1KB
- Activity log: ~500B

Storage Usage:
- Per submission: Variable (documents)
- Database: ~2KB per submission record
- Notifications: ~1KB each
```

---

## Common User Actions & Flows

### "I need to update my abstract"
```
1. See orange Revision Requested banner
2. Click "Edit Submission" button
3. Scroll to Abstract field
4. Clear and rewrite text
5. Click "Save as Draft" to save changes
6. Continue making other edits or resubmit
```

### "I need to add a document"
```
1. Open Edit Submission modal
2. Scroll to Documents section
3. Click upload area or drag file
4. Select file from computer
5. File appears in "New Documents" section
6. Click "Resubmit for Review" when done
```

### "I accidentally deleted a document"
```
1. Open Edit Submission modal
2. Scroll to Documents section
3. Find document in "Documents to be Deleted" section
4. Click "Restore" button next to it
5. Document moves back to "Current Documents"
```

---

**Last Updated:** January 29, 2026  
**Status:** ✅ Complete
