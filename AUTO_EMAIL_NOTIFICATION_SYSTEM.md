# Auto-Email Status Notification System

## Overview

The system automatically sends email notifications to applicants whenever their IP record's status changes. This ensures applicants are always informed about their submission progress without manual intervention.

---

## Status Changes & Email Notifications

### Complete Email Trigger Map

| Status | Email Subject | Message | Triggered By |
|--------|---------------|---------|--------------|
| `submitted` | Submission Received Successfully | Submission received and will be reviewed | NewSubmissionPage (applicant) |
| `waiting_supervisor` | Submission Under Supervisor Review | Submission assigned to supervisor | NewSubmissionPage (if supervisor selected) |
| `supervisor_approved` | Supervisor Approved Your Submission | Approved by supervisor, moving to evaluation | SupervisorDashboard (supervisor action) |
| `supervisor_revision` | Revision Requested by Supervisor | Supervisor requested revisions | SupervisorDashboard (supervisor action) |
| `rejected` | Submission Decision | Submission has been declined | SupervisorDashboard or EvaluatorDashboard |
| `waiting_evaluation` | Submission In Evaluation | Submission now being evaluated | SupervisorDashboard or NewSubmissionPage |
| `evaluator_approved` | Evaluation Complete - Approved! | Evaluator approved the submission | EvaluatorDashboard (evaluator action) |
| `evaluator_revision` | Revision Requested by Evaluator | Evaluator requested revisions | EvaluatorDashboard (evaluator action) |
| `preparing_legal` | Legal Preparation in Progress | Legal documents being prepared | AdminDashboard (admin action) |
| `ready_for_filing` | Ready for IPO Philippines Filing | Ready to file with IPO Philippines | CompletionButton (admin action) |
| `completed` | Process Completed | Process completed successfully | Certificate issuance |

---

## Email Flow Architecture

### 1. Automatic Emails (Applicant Always Notified)

```
┌─────────────────────────────────────────────┐
│  IP Record Status Changes                    │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   NEW STATUS   UPDATE IP    FETCH APPLICANT
   SET          RECORDS      DATA
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │ CALL send-status-       │
        │ notification edge func  │
        └─────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │  Email via Resend API   │
        │  to applicantEmail      │
        └─────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────┐
        │ Log activity_logs       │
        │ Log process_tracking    │
        └─────────────────────────┘
```

### 2. Email Sending Points

#### NewSubmissionPage (Application Submission)

**Status: `submitted`**
```typescript
// Lines 372-412
if (profile.email) {
  await fetch(`/functions/v1/send-status-notification`, {
    body: JSON.stringify({
      applicantEmail: profile.email,
      applicantName: profile.full_name,
      recordTitle: formData.title,
      referenceNumber: ipRecord.reference_number || 'Pending',
      oldStatus: 'draft',
      newStatus: initialStatus,  // 'submitted' or 'waiting_supervisor'
      currentStage: initialStage,
      remarks: 'Your submission has been received...',
      actorName: profile.full_name,
      actorRole: 'Applicant',
    }),
  });
}
```

#### SupervisorDashboard (Supervisor Decision)

**Statuses: `supervisor_approved`, `supervisor_revision`, `rejected`**
```typescript
// Lines 222-240
if (selectedRecord.applicant?.email) {
  await fetch(`/functions/v1/send-status-notification`, {
    body: JSON.stringify({
      applicantEmail: selectedRecord.applicant.email,
      applicantName: selectedRecord.applicant.full_name,
      recordTitle: selectedRecord.title,
      referenceNumber: selectedRecord.reference_number,
      oldStatus: selectedRecord.status,
      newStatus: newStatus,      // 'supervisor_approved', 'supervisor_revision', 'rejected'
      currentStage: currentStage,
      remarks: remarks,            // Supervisor's comments
      actorName: profile.full_name,
      actorRole: 'Supervisor',
    }),
  });
}
```

#### EvaluatorDashboard (Evaluator Decision)

**Statuses: `evaluator_approved`, `evaluator_revision`, `rejected`**
```typescript
// Lines 261-279
if (selectedRecord.applicant?.email) {
  await fetch(`/functions/v1/send-status-notification`, {
    body: JSON.stringify({
      applicantEmail: selectedRecord.applicant.email,
      applicantName: selectedRecord.applicant.full_name,
      recordTitle: selectedRecord.title,
      referenceNumber: selectedRecord.reference_number,
      oldStatus: selectedRecord.status,
      newStatus: newStatus,      // 'evaluator_approved', 'evaluator_revision', 'rejected'
      currentStage: currentStage,
      remarks: evaluationForm.remarks,  // Evaluator feedback
      actorName: profile.full_name,
      actorRole: 'Evaluator',
    }),
  });
}
```

#### SubmissionDetailPage (Applicant Resubmission)

**Status: `waiting_supervisor` or `waiting_evaluation` (resubmitted)**
```typescript
// Lines 191-219
if (applicantData) {
  await fetch(`/functions/v1/send-status-notification`, {
    body: JSON.stringify({
      applicantEmail: applicantData.email,
      applicantName: applicantData.full_name,
      recordTitle: editData.title,
      referenceNumber: record.reference_number || 'N/A',
      oldStatus: record.status,
      newStatus: newStatus,      // 'waiting_supervisor' or 'waiting_evaluation'
      currentStage: newStage,     // 'Resubmitted - Waiting for Supervisor/Evaluation'
      remarks: 'Your submission has been resubmitted for review.',
      actorName: profile.full_name,
      actorRole: profile.role,
    }),
  });
}
```

#### CompletionButton (Admin Completion)

**Status: `ready_for_filing`**
```typescript
// Lines 53-80
// Send status notification email
await fetch(`/functions/v1/send-status-notification`, {
  body: JSON.stringify({
    applicantEmail,
    applicantName,
    recordTitle: title,
    referenceNumber,
    oldStatus: currentStatus,
    newStatus: 'ready_for_filing',
    currentStage: 'Completed - Ready for IPO Philippines Filing',
    remarks: 'Your submission has been completed...',
    actorRole: 'Admin',
  }),
});

// Also send completion notification (backward compatible)
await fetch(`/functions/v1/send-completion-notification`, {
  body: JSON.stringify({
    applicantEmail,
    applicantName,
    title,
    referenceNumber,
    category,
  }),
});
```

---

## Edge Function: send-status-notification

**Location:** `supabase/functions/send-status-notification/index.ts`

### Request Interface

```typescript
interface StatusNotificationPayload {
  applicantEmail: string;
  applicantName: string;
  recordTitle: string;
  referenceNumber: string;
  oldStatus: string;
  newStatus: string;
  currentStage: string;
  remarks?: string;           // Optional feedback from reviewer
  actorName?: string;         // Who made the status change
  actorRole?: string;         // Their role (Supervisor, Evaluator, Admin, etc.)
}
```

### Email HTML Template

The function generates professional HTML emails with:
- **Header:** UCC IP Office branding (purple gradient)
- **Main Message:** Status-specific message
- **Submission Details Box:** Title, Reference, Current Stage, Reviewed By
- **Remarks Box:** Feedback (if provided) in yellow highlight
- **Footer:** Legal text and UCC information

### Status Messages

```typescript
const statusMessages = {
  submitted: "Thank you for your submission! We have successfully received...",
  waiting_supervisor: "Your submission is now being reviewed by a supervisor.",
  supervisor_approved: "Great news! Your submission has been approved...",
  supervisor_revision: "The supervisor has requested revisions...",
  waiting_evaluation: "Your submission is now being evaluated by our technical team.",
  evaluator_approved: "Congratulations! Your submission has been approved...",
  evaluator_revision: "The evaluator has requested revisions...",
  rejected: "After careful review, your submission has been declined.",
  preparing_legal: "Your submission has progressed to the legal preparation stage...",
  ready_for_filing: "Your intellectual property submission is now complete and ready...",
  completed: "Your intellectual property submission process has been completed...",
}
```

### Response Format

**Success (200):**
```json
{
  "success": true,
  "message": "Email notification sent to applicant@example.com",
  "subject": "Supervisor Approved Your Submission",
  "emailId": "resend_email_id_12345"
}
```

**Error (500):**
```json
{
  "success": false,
  "error": "RESEND_API_KEY not configured"
}
```

---

## Database Tables Updated

### 1. ip_records
Status field updated with one of the above statuses.

### 2. activity_logs
Records what triggered the email:
```json
{
  "action": "supervisor_approve",
  "details": {
    "remarks": "Looks good to me!",
    "decision": "approve"
  }
}
```

### 3. process_tracking
Tracks the entire journey:
```json
{
  "stage": "Supervisor Review",
  "status": "supervisor_approved",
  "actor_name": "John Smith",
  "actor_role": "Supervisor",
  "description": "Supervisor approved the submission"
}
```

### 4. notifications
In-app notification created alongside email:
```json
{
  "type": "supervisor_decision",
  "title": "Supervisor Approved",
  "message": "Your submission has been approved by supervisor...",
  "is_read": false
}
```

---

## Configuration

### Environment Variables Required

In Supabase Dashboard → Settings → Edge Functions → Environment variables:

```
RESEND_API_KEY=your_resend_api_key_here
```

### Email Sender Address

Default: `UCC IP Office <onboarding@resend.dev>`

To change, update in `send-status-notification/index.ts`:
```typescript
const emailPayload = {
  from: "UCC IP Office <your-verified-email@domain.com>",  // Change here
  ...
}
```

**Note:** Sender email must be verified in Resend account.

---

## Implementation Details

### How Email Gets Triggered

1. **Status Change Initiated**
   - Supervisor approves: `supervisor_approved`
   - Evaluator approves: `evaluator_approved`
   - Applicant resubmits: `waiting_supervisor`/`waiting_evaluation`
   - Admin completes: `ready_for_filing`

2. **IP Record Updated**
   ```typescript
   await supabase.from('ip_records')
     .update({ status: newStatus, current_stage: newStage })
     .eq('id', recordId)
   ```

3. **Fetch Applicant Email**
   ```typescript
   const { data: applicant } = await supabase
     .from('users')
     .select('email, full_name')
     .eq('id', record.applicant_id)
   ```

4. **Call Edge Function**
   ```typescript
   await fetch(`${SUPABASE_URL}/functions/v1/send-status-notification`, {
     method: 'POST',
     body: JSON.stringify({
       applicantEmail: applicant.email,
       applicantName: applicant.full_name,
       newStatus: 'supervisor_approved',
       // ...other fields
     })
   })
   ```

5. **Email Sent via Resend**
   - HTML generated based on status
   - Email sent to applicant's email address
   - Response logged to console

### Error Handling

If email fails to send:
- Console error logged
- Function returns error response
- Status change still completed
- User can view status in dashboard
- Admin can manually resend via notification system

---

## Testing the Feature

### Test 1: Submission Email

1. Create new submission
2. Check inbox for "Submission Received Successfully" email
3. Verify it contains:
   - Your name
   - Submission title
   - Reference number
   - Current stage

### Test 2: Supervisor Approval Email

1. Login as supervisor
2. Approve a pending submission
3. Check applicant's inbox for "Supervisor Approved Your Submission"
4. Verify it includes supervisor's remarks

### Test 3: Evaluator Rejection Email

1. Login as evaluator
2. Reject a submission
3. Check applicant's inbox for "Submission Decision"
4. Verify it shows evaluator feedback

### Test 4: Ready for Filing Email

1. Login as admin
2. Click "Mark as Completed" button
3. Check applicant's inbox for "Ready for IPO Philippines Filing"
4. Verify certificate information is mentioned

### Manual Testing via cURL

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/send-status-notification" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantEmail": "test@example.com",
    "applicantName": "Test User",
    "recordTitle": "My Patent",
    "referenceNumber": "UCC-2025-00001",
    "oldStatus": "submitted",
    "newStatus": "supervisor_approved",
    "currentStage": "Approved by Supervisor",
    "remarks": "Great work!",
    "actorName": "John Supervisor",
    "actorRole": "Supervisor"
  }'
```

---

## Troubleshooting

### Issue: Email Not Sent

**Symptoms:**
- Applicant doesn't receive email after status change
- No error in console

**Solutions:**
1. Verify `RESEND_API_KEY` is set in Supabase environment
2. Check applicant email address is correct in database
3. Verify email address is not bouncing (check Resend dashboard)
4. Check browser console for fetch errors
5. Review edge function logs in Supabase

### Issue: Email Sent to Wrong Address

**Symptoms:**
- Email sent to wrong email address
- Applicant doesn't see notification

**Solutions:**
1. Verify applicant record has correct email in `users` table
2. Check the `send-status-notification` call includes correct `applicantEmail`
3. Update email in user profile and retry

### Issue: Email Template Shows Wrong Status

**Symptoms:**
- Email subject/message doesn't match status
- Shows generic message

**Solutions:**
1. Verify `newStatus` field matches exactly one of:
   - submitted, waiting_supervisor, supervisor_approved, supervisor_revision
   - waiting_evaluation, evaluator_approved, evaluator_revision, rejected
   - preparing_legal, ready_for_filing, completed
2. Add new status message if using custom status
3. Check that status string matches database values exactly

### Issue: Resend API Error

**Symptoms:**
- Email fails silently
- Error shows "Email service unavailable"

**Solutions:**
1. Check RESEND_API_KEY is valid (starts with 're_')
2. Verify sender email is verified in Resend account
3. Check Resend API rate limits not exceeded
4. Verify recipient email format is valid
5. Check Resend dashboard for bounce/complaint reports

---

## Best Practices

1. **Always provide remarks** when requesting revisions
   - Helps applicants understand what to fix
   - Creates better communication

2. **Test with development email first**
   - Use test email account before production
   - Verify template looks good

3. **Monitor Resend logs**
   - Check email delivery status in Resend dashboard
   - Track bounces and complaints

4. **Update email when needed**
   - If applicant changes email, update in user profile
   - Old emails won't receive future notifications

5. **Include contact info in remarks**
   - Example: "Please contact us if you have questions: email@ucc.edu"
   - Improves applicant experience

---

## Future Enhancements

- [ ] Email digest: Combine multiple status changes into one email
- [ ] SMS notifications: Send SMS alongside email
- [ ] Applicant preferences: Let applicants choose notification method
- [ ] Email templates: Allow admins to customize email templates
- [ ] Scheduled emails: Send email reminders if no action taken
- [ ] Multi-language: Support multiple languages for status emails

---

## Summary

The auto-email system ensures applicants are **always informed** about their submission status:

✅ **Automatic:** No manual action needed
✅ **Comprehensive:** Covers all status transitions
✅ **Professional:** Branded, well-formatted emails
✅ **Reliable:** Integrated with Resend API
✅ **Logged:** Every email tracked in database
✅ **Recoverable:** Can retry if failed

The system works seamlessly across all user roles:
- **Applicants** get notified of every status change
- **Supervisors** send approval/revision emails
- **Evaluators** send evaluation results
- **Admins** mark completion and send final emails

All email sends include proper error handling and logging for troubleshooting.
