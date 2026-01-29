# Revision Editing Flow Implementation Guide

## Overview
This document describes the complete implementation of the Revision Editing Flow for the IP submission system. Applicants can now fully edit their submissions when they receive a "Revision Requested" status from supervisors or evaluators.

## Components Implemented

### 1. RevisionBanner Component
**Location:** `src/components/RevisionBanner.tsx`

Displays a prominent banner when a submission is in revision status:
- Shows which role requested the revision (Supervisor or Evaluator)
- Displays the person's name who requested the revision
- Shows the request date/time
- Displays revision reason/comments in a highlighted box
- Includes action guidance to the applicant

**Props:**
```typescript
interface RevisionBannerProps {
  status: string;
  revisionReason?: string;
  revisionComments?: string;
  requestedBy?: User | null;
  requestedByRole?: 'supervisor' | 'evaluator';
  requestedAt?: string;
}
```

### 2. EditSubmissionModal Component
**Location:** `src/components/EditSubmissionModal.tsx`

A comprehensive modal form that allows full submission editing:

**Features:**
- Pre-fills all existing submission data
- Title, category, abstract, description
- Technical field, background art, problem statement
- Solution, advantages, implementation, prior art
- Multiple inventors with department affiliation
- Keywords (dynamic list)
- Funding and collaborator information
- Complete document management:
  - View existing documents with delete option
  - Upload new documents with validation
  - Mark documents for deletion
  - Restore accidentally deleted documents
  - File size and type validation (10MB max, PDF/DOC/XLS/etc)

**Dialog Features:**
- Sticky header with title and close button
- Error display with validation messages
- Document section with upload UI
- Sticky footer with action buttons:
  - Cancel
  - Save as Draft (no notification)
  - Resubmit for Review (notifies supervisor/evaluator)

**Props:**
```typescript
interface EditSubmissionModalProps {
  isOpen: boolean;
  record: IpRecord | null;
  documents: Document[];
  onClose: () => void;
  onSaveDraft: (data: any) => Promise<void>;
  onResubmit: (data: any) => Promise<void>;
  profile: any;
}
```

### 3. Updated SubmissionDetailPage
**Location:** `src/pages/SubmissionDetailPage.tsx`

**New Features:**
- Displays RevisionBanner when status is `supervisor_revision` or `evaluator_revision`
- "Edit Submission" button appears ONLY when:
  - User is the original applicant
  - Submission status is `supervisor_revision` OR `evaluator_revision`
- Opens EditSubmissionModal when clicked
- Implements two new handler functions:
  - `handleSaveDraft()` - Saves changes without changing status or notifying anyone
  - `handleResubmit()` - Saves changes, updates status, and notifies reviewer

## Backend Logic Flow

### Save Draft Flow
When applicant clicks "Save as Draft":
1. Validates all form data
2. Updates submission record (keeps current status)
3. Deletes marked documents from storage and database
4. Uploads new documents to storage and database
5. Logs activity as "submission_draft_saved"
6. **No notification** is sent
7. Returns to detail view

### Resubmit Flow
When applicant clicks "Resubmit for Review":
1. Validates all form data
2. Updates submission record with new data
3. Changes status:
   - `supervisor_revision` → `waiting_supervisor`
   - `evaluator_revision` → `waiting_evaluation`
4. Updates current_stage to "Resubmitted - Waiting for [Supervisor/Evaluator]"
5. Deletes marked documents from storage and database
6. Uploads new documents to storage and database
7. Creates notification for supervisor/evaluator
8. Logs activity as "submission_resubmitted" with old/new status
9. Adds entry to process_tracking table
10. Sends email notification to applicant confirming resubmission
11. Returns to detail view

## Data Handling

### Document Lifecycle
```
Existing Documents (from original submission)
├── Keep (default) → remains attached
├── Delete → marked for deletion → removed from storage & database on save
└── Restore → can be restored if marked for deletion

New Documents
├── Added to upload list
├── Validated (size, type)
└── Uploaded to storage and database on save
```

### Details JSON Structure
The `ip_records.details` JSON field now preserves and manages:
```json
{
  "description": "",
  "technicalField": "",
  "backgroundArt": "",
  "problemStatement": "",
  "solution": "",
  "advantages": "",
  "implementation": "",
  "inventors": [
    {
      "name": "John Doe",
      "affiliation": "dept-id",
      "contribution": "Main inventor"
    }
  ],
  "dateConceived": "",
  "dateReduced": "",
  "priorArt": "",
  "keywords": ["keyword1", "keyword2"],
  "funding": "",
  "collaborators": [
    {
      "name": "",
      "role": "",
      "affiliation": ""
    }
  ],
  "commercialPotential": "",
  "targetMarket": "",
  "competitiveAdvantage": "",
  "estimatedValue": "",
  "relatedPublications": ""
}
```

## Validation Rules

### Form Validation
1. **Title**: Required, non-empty
2. **Abstract**: Required, non-empty
3. **Inventors**: At least one inventor with name is required
4. **Documents**: At least one document must be attached
5. **File Size**: Max 10MB per file
6. **File Types**: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG

### UI Validation Display
- Errors shown at top of modal in red box
- Field-level validation happens on blur
- Multiple errors displayed as bullet list
- Users cannot submit/resubmit if validation fails

## Security Considerations

### Access Control
- "Edit Submission" button only shows for applicant of the record
- Button only shows for `supervisor_revision` or `evaluator_revision` status
- Applicants can only edit their own submissions
- Admin-only fields (supervisor_id, evaluator_id) are read-only

### Data Integrity
- Original submission ID is preserved (no new record created)
- Status changes are transactional
- All changes are logged with user ID and timestamp
- Activity log tracks who made changes and when

### File Security
- Files stored in namespaced storage buckets (by IP record ID)
- File types validated both client-side and (should be) server-side
- File sizes validated before upload
- Deleted files are removed from storage

## Database Changes Required

The current implementation uses existing tables:
- `ip_records` - updated with new data
- `ip_documents` - documents added/deleted
- `notifications` - new notification created
- `activity_logs` - activity logged
- `process_tracking` - resubmission tracked

**Optional Future Enhancement:**
A `revision_comments` table could be added to formally track revision requests:
```sql
CREATE TABLE revision_comments (
  id UUID PRIMARY KEY,
  ip_record_id UUID REFERENCES ip_records(id),
  reviewer_id UUID REFERENCES users(id),
  comments TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## User Experience Flow

### Applicant Perspective
1. Receives notification: "Revision Requested - Supervisor"
2. Views submission detail page
3. Sees prominent orange banner with:
   - Supervisor/Evaluator name
   - Revision reason
   - Request date
4. Clicks "Edit Submission" button
5. Modal opens with pre-filled form
6. Updates all necessary fields
7. Can manage documents (add, remove, replace)
8. Chooses:
   - **Save as Draft**: Keep working, make more changes later
   - **Resubmit for Review**: Send back to reviewer
9. Receives confirmation and views updated submission

### Supervisor/Evaluator Perspective
1. Can see when resubmission is received
2. Receives notification: "Submission Updated"
3. Views updated documents and metadata
4. Can make new revision requests or approve

## Testing Checklist

- [ ] Applicant can see "Edit Submission" button for `supervisor_revision` status
- [ ] Applicant can see "Edit Submission" button for `evaluator_revision` status
- [ ] Button does NOT appear for other statuses
- [ ] Button does NOT appear for non-applicant users
- [ ] Modal opens with pre-filled data
- [ ] All form fields load correctly (title, abstract, description, etc.)
- [ ] Inventors list loads with existing data
- [ ] Keywords load correctly
- [ ] Existing documents display with delete option
- [ ] New documents can be uploaded
- [ ] Files can be marked for deletion and restored
- [ ] File validation works (size, type)
- [ ] Form validation prevents submission without title, abstract, inventors, documents
- [ ] Save as Draft keeps status unchanged
- [ ] Resubmit changes status to `waiting_supervisor` or `waiting_evaluation`
- [ ] Supervisor receives notification on resubmit
- [ ] Activity log records changes
- [ ] Process tracking updates correctly
- [ ] Documents sync correctly (additions, deletions)
- [ ] Applicant cannot edit non-revision submissions
- [ ] Modal closes after successful save/resubmit
- [ ] Changes persist after page refresh
- [ ] Email notifications sent correctly

## Future Enhancements

1. **Revision Comments Table**: Store formal revision requests with timestamps
2. **Inline Validation**: Real-time field validation as user types
3. **Progress Tracking**: Show which fields have been modified
4. **Draft Auto-Save**: Periodically save drafts automatically
5. **Document Preview**: Preview documents before submitting
6. **Version History**: Track all versions of a submission
7. **Batch Operations**: Bulk upload multiple files
8. **Template Suggestions**: Suggest document formats
9. **Collaboration**: Allow team members to help with revisions
10. **Custom Revision Categories**: Link specific fields to revision reasons

## Implementation Status

✅ **Completed:**
- RevisionBanner component with full UI
- EditSubmissionModal with document management
- Integration with SubmissionDetailPage
- Save Draft and Resubmit logic
- Document upload/delete/restore functionality
- Form validation with error display
- Activity logging and notifications
- Process tracking integration
- Email notification sending

⚠️ **Optional/Future:**
- Revision comments formal storage (can use details JSON for now)
- Document preview functionality
- Auto-save drafts
- Version history tracking

## Code Locations

```
src/
├── components/
│   ├── RevisionBanner.tsx (NEW)
│   └── EditSubmissionModal.tsx (NEW)
└── pages/
    └── SubmissionDetailPage.tsx (UPDATED)
```

## Dependencies

- React 18+
- React Router v6
- Supabase (storage, database)
- Lucide React (icons)
- Tailwind CSS (styling)

All required dependencies are already in the project.
