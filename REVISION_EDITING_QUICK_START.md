# Revision Editing Flow - Quick Start & Testing Guide

## Quick Overview

The revision editing flow allows applicants to fully edit their IP submissions when a supervisor or evaluator requests revisions. This includes:
- ✅ Editing all submission metadata (title, abstract, description, etc.)
- ✅ Managing all inventors with affiliations
- ✅ Adding/removing/replacing documents
- ✅ Two submission options: Save Draft or Resubmit for Review

## New Components

### Files Added
1. `src/components/RevisionBanner.tsx` - Banner showing revision request details
2. `src/components/EditSubmissionModal.tsx` - Complete editing form modal

### Files Modified
1. `src/pages/SubmissionDetailPage.tsx` - Integrated revision banner and edit modal

## How It Works

### For Applicants

**When status is "Revision Requested - Supervisor" or "Revision Requested - Evaluator":**

1. They see a prominent orange banner explaining the revision request
2. An "Edit Submission" button appears at the top
3. Clicking it opens a modal with their pre-filled form
4. They can update:
   - Title, category, abstract, description
   - Technical details (field, background art, problem, solution, etc.)
   - Inventors (add, edit, remove)
   - Keywords
   - Documents (upload new, delete existing, restore deleted)
5. Two choices:
   - **Save as Draft** - Save changes without notifying reviewer
   - **Resubmit for Review** - Submit updated version to reviewer

### For Reviewers (Supervisors/Evaluators)

1. When applicant resubmits, they get a notification
2. They can view the updated documents and submission
3. They can make a new revision request or approve

## Testing Quick Checklist

### Access Control
- [ ] Edit button shows for applicant on `supervisor_revision` status
- [ ] Edit button shows for applicant on `evaluator_revision` status
- [ ] Edit button does NOT show for other statuses
- [ ] Edit button does NOT show for non-applicant users
- [ ] Edit button does NOT show for supervisors/evaluators

### Form Pre-filling
- [ ] Title loads correctly
- [ ] Abstract loads correctly
- [ ] All description fields load
- [ ] Inventors list displays with data
- [ ] Keywords display
- [ ] Funding displays
- [ ] All metadata fields are populated

### Documents
- [ ] Existing documents show with name and file size
- [ ] Can delete existing documents (marked with orange indicator)
- [ ] Can restore deleted documents
- [ ] Can upload new files
- [ ] Uploaded files show in "New Documents" section
- [ ] File validation works (size, type)
- [ ] Multiple files can be uploaded

### Form Submission

#### Save as Draft
- [ ] Saves without changing status
- [ ] No notification sent
- [ ] Activity log records action
- [ ] Changes persist after refresh
- [ ] Modal closes after save

#### Resubmit for Review
- [ ] Changes status from `supervisor_revision` → `waiting_supervisor`
- [ ] Changes status from `evaluator_revision` → `waiting_evaluation`
- [ ] Supervisor/Evaluator gets notification
- [ ] Activity log shows resubmission
- [ ] Process tracking records update
- [ ] Email notification sent (check logs)
- [ ] Documents sync correctly

### Validation
- [ ] Cannot submit without title
- [ ] Cannot submit without abstract
- [ ] Cannot submit without at least one inventor
- [ ] Cannot submit without at least one document
- [ ] File size validation (>10MB rejected)
- [ ] File type validation (only allowed types)
- [ ] Error messages display clearly
- [ ] Error messages list all issues

### UI/UX
- [ ] Modal opens/closes smoothly
- [ ] Loading indicators show during save
- [ ] Success messages display
- [ ] Error messages display clearly
- [ ] Responsive on mobile devices
- [ ] Tab order is logical
- [ ] Modal scrolls if content overflows

## Step-by-Step Test Scenario

### Setup
1. Create or use existing applicant user
2. Create a submission and approve through supervisor stage
3. Have supervisor request revisions on the submission

### Execute Test
1. Login as applicant
2. Navigate to their dashboard
3. Click on the submission with revision request
4. Verify revision banner displays
5. Click "Edit Submission" button
6. In the modal:
   - Change the title
   - Update abstract
   - Add a new inventor
   - Upload a new document
   - Delete an existing document
7. Click "Save as Draft"
8. Verify document changes persisted
9. Click "Edit Submission" again
10. Verify all changes are still there
11. Update one more field
12. Click "Resubmit for Review"
13. Verify:
    - Status changed
    - Notification created
    - Activity logged
    - Documents updated
    - Modal closed

### Verify Backend
```sql
-- Check submission update
SELECT id, status, title, updated_at 
FROM ip_records 
WHERE id = 'submission-id';

-- Check documents
SELECT id, file_name, created_at 
FROM ip_documents 
WHERE ip_record_id = 'submission-id'
ORDER BY created_at DESC;

-- Check activity log
SELECT action, details, created_at 
FROM activity_logs 
WHERE ip_record_id = 'submission-id'
ORDER BY created_at DESC;

-- Check process tracking
SELECT action, stage, status, created_at 
FROM process_tracking 
WHERE ip_record_id = 'submission-id'
ORDER BY created_at DESC;

-- Check notifications
SELECT type, title, message, created_at 
FROM notifications 
WHERE user_id = 'supervisor-id'
ORDER BY created_at DESC;
```

## Common Issues & Solutions

### Issue: Edit button doesn't appear
**Solution:** Verify status is exactly `supervisor_revision` or `evaluator_revision` (case-sensitive)

### Issue: Form doesn't pre-fill data
**Solution:** Check browser console for errors, verify record data is loading correctly

### Issue: Documents not syncing
**Solution:** Check Supabase storage permissions, verify file paths are correct

### Issue: Notification not sent
**Solution:** Check email service configuration, verify supervisor/evaluator has valid email

## Key Status Values

```typescript
// Revision statuses
'supervisor_revision'  // Supervisor requested revisions
'evaluator_revision'   // Evaluator requested revisions

// After resubmit
'waiting_supervisor'   // Back to supervisor (from supervisor_revision)
'waiting_evaluation'   // Back to evaluator (from evaluator_revision)
```

## API Integration Points

### Save/Resubmit Flow
- Updates `ip_records` table
- Manages `ip_documents` (upload/delete)
- Creates `notifications`
- Logs to `activity_logs`
- Adds to `process_tracking`
- Calls email function `send-status-notification`

### Storage
- Bucket: `ip-documents`
- Path format: `{ip_record_id}/{timestamp}_{filename}`

## File Validation

### Size Limit
- Max 10 MB per file

### Allowed Types
- PDF: `application/pdf`
- Word: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Text: `text/plain`
- Images: `image/jpeg`, `image/png`

## Browser Requirements

- Modern browser with ES6+ support
- File upload capability
- JavaScript enabled
- Cookies/storage enabled for session management

## Performance Notes

- Modal uses lazy loading for departments/supervisors
- Document previews not included (future enhancement)
- Images optimized with Tailwind CSS
- No unnecessary re-renders with proper React hooks

## Troubleshooting

### Build Errors
```bash
# If TypeScript errors occur
npm run build

# Check specific file
npx tsc --noEmit src/components/EditSubmissionModal.tsx
```

### Testing Locally
```bash
# Start dev server
npm run dev

# Navigate to submission detail page
# Status should be supervisor_revision or evaluator_revision
```

### Common Console Errors
1. **"Cannot find module"** - Run `npm install`
2. **"Supabase connection failed"** - Check `.env` variables
3. **"File upload failed"** - Check bucket permissions and storage configuration

## Rollback Instructions

If issues occur, these files can be rolled back:
- `src/components/EditSubmissionModal.tsx` - Delete file
- `src/components/RevisionBanner.tsx` - Delete file
- `src/pages/SubmissionDetailPage.tsx` - Revert to previous version

Or use Git:
```bash
git revert <commit-hash>
```

## Success Criteria

- ✅ Applicants can fully edit revision-requested submissions
- ✅ All metadata updates persist
- ✅ Documents add/remove/replace correctly
- ✅ Status changes appropriately on resubmit
- ✅ Supervisors/Evaluators notified of updates
- ✅ All changes logged in activity and process tracking
- ✅ Form validation prevents invalid submissions
- ✅ No duplicate submissions created
- ✅ Responsive design works on all devices
- ✅ Accessible (keyboard navigation, screen readers)

## Production Checklist

- [ ] Code reviewed and approved
- [ ] All tests passed
- [ ] Build completes without errors
- [ ] Database migrations completed (if any)
- [ ] Email service configured
- [ ] Storage bucket permissions set
- [ ] Monitoring/logging configured
- [ ] Rollback plan documented
- [ ] User training completed
- [ ] Documentation updated
- [ ] Performance tested under load
- [ ] Security review completed
- [ ] Accessibility tested
- [ ] Browser compatibility tested

## Support & Escalation

For issues during testing:
1. Check browser console for errors
2. Check Supabase logs
3. Verify database schema and permissions
4. Check email service logs
5. Review git history for recent changes

Contact development team if:
- TypeScript compilation errors
- Runtime crashes
- Data corruption issues
- Security concerns
- Performance problems
