# Email Notification System - Automatic Status Change Fix

## Overview

This fix implements an **automatic email notification system** that ensures applicants are notified of every status change, even if the frontend application fails to send the email.

## Problem Addressed

Previously, email notifications were only sent when:
- The frontend component explicitly called the `send-status-notification` function
- The HTTP request from the frontend successfully reached the email service

This created gaps where:
- Direct database updates bypassed email notifications
- Frontend failures prevented emails from being sent
- No audit trail of which emails were attempted

## Solution Architecture

### 1. Email Queue Table (`email_queue`)

A new table stores all pending email notifications with:
- **Notification details:** applicant info, status change, remarks
- **Send status:** track whether sent, retry count, error messages
- **Payload:** full JSON of what will be sent to email service
- **Timestamps:** when created, sent, last attempted

**Key Fields:**
```sql
- id: Unique queue entry ID
- ip_record_id: Which record triggered the notification
- applicant_id: Who gets the email
- sent: Boolean flag (false = pending)
- attempt_count: Number of send attempts (max 3)
- payload: Full JSON to send to send-status-notification function
- error_message: Last error encountered (if any)
- created_at: When queued
- sent_at: When successfully sent
```

### 2. Database Trigger (`queue_status_notification`)

Automatically triggered when `ip_records.status` changes:
- **Detects status changes:** Only runs on UPDATE with status difference
- **Fetches applicant data:** Gets email and name from users table
- **Gets actor info:** Who made the change (supervisor, evaluator, admin, etc.)
- **Queues email:** Inserts into email_queue table with full payload
- **Non-blocking:** Trigger doesn't slow down the database update

**Trigger Flow:**
```
IP Record Status Changed
        ↓
AFTER UPDATE Trigger Fires
        ↓
Get Applicant Email & Name
        ↓
Get Actor Information
        ↓
Build Notification Payload
        ↓
Insert into email_queue Table
        ↓
Database Update Completes
```

### 3. Queue Processor Function (`process-email-queue`)

An edge function that periodically processes pending emails:
- **Fetches pending:** Gets up to 10 unsent emails with <3 attempts
- **Calls send-status-notification:** For each pending email
- **Handles failures:** Increments attempt count, logs error
- **Marks success:** Sets sent=true when successful
- **Retries:** Automatically retries failed emails (max 3 attempts)

**Can be called via:**
```bash
# Manual trigger
curl -X POST https://your-project.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Scheduled via Supabase Cron Jobs
# (configure in Supabase dashboard to run every 5 minutes)
```

## Implementation Details

### Database Changes

1. **New table:** `email_queue`
2. **New trigger:** `auto_notify_applicant_status_change` on `ip_records`
3. **New function:** `queue_status_notification()`
4. **Indexes:** For efficient queue queries

### Edge Functions

1. **New function:** `process-email-queue` - processes pending emails

### Frontend Integration

No changes needed to existing frontend code! The system works alongside current email calls:
- Frontend calls `send-status-notification` immediately (fast user feedback)
- Trigger queues backup notification automatically (reliability)
- If frontend succeeds, queue will be marked as sent
- If frontend fails, queue will retry

## Configuration

### Enable Automatic Processing

Set up a Cron Job in Supabase:

1. Go to **Supabase Dashboard** → **Edge Functions** → **Crons**
2. Create a new cron job:
   - **Name:** `Process Email Queue`
   - **Function:** `process-email-queue`
   - **Schedule:** `*/5 * * * *` (every 5 minutes)
3. Enable it

### View Queue Status

Check pending emails:
```sql
-- Pending emails
SELECT * FROM email_queue WHERE sent = FALSE;

-- Recently sent
SELECT * FROM email_queue WHERE sent = TRUE ORDER BY sent_at DESC LIMIT 10;

-- Failed emails (3+ attempts)
SELECT * FROM email_queue WHERE attempt_count >= 3 AND sent = FALSE;

-- Error summary
SELECT notification_type, COUNT(*) as count, MAX(error_message) as last_error
FROM email_queue
WHERE sent = FALSE AND attempt_count >= 3
GROUP BY notification_type;
```

## Status Changes Covered

The trigger automatically queues emails for ALL status changes:

| Status Change | Message |
|---|---|
| → `submitted` | Submission Received |
| → `waiting_supervisor` | Under Supervisor Review |
| → `supervisor_approved` | Supervisor Approved |
| → `supervisor_revision` | Revision Requested |
| → `rejected` | Submission Declined |
| → `waiting_evaluation` | In Evaluation |
| → `evaluator_approved` | Evaluation Complete - Approved |
| → `evaluator_revision` | Revision Requested by Evaluator |
| → `ready_for_filing` | Ready for IPO Filing |
| → `completed` | Process Completed |

## Error Handling & Retries

**Retry Logic:**
- 1st failure: Queued for retry
- 2nd failure: Queued for retry
- 3rd failure: Stopped (max retries exceeded)

**Investigation:**
```sql
-- Check what failed
SELECT id, ip_record_id, applicant_email, error_message, attempt_count
FROM email_queue
WHERE sent = FALSE AND attempt_count >= 3
ORDER BY created_at DESC;

-- Manually retry a failed email
UPDATE email_queue
SET attempt_count = 0, last_attempt_at = NULL, error_message = NULL
WHERE id = <queue_id>;
-- Then process-email-queue will retry it
```

## Monitoring & Troubleshooting

### Check Queue Status

```sql
-- Queue statistics
SELECT
  COUNT(*) as total_queued,
  SUM(CASE WHEN sent = TRUE THEN 1 ELSE 0 END) as successfully_sent,
  SUM(CASE WHEN sent = FALSE AND attempt_count < 3 THEN 1 ELSE 0 END) as pending_retry,
  SUM(CASE WHEN sent = FALSE AND attempt_count >= 3 THEN 1 ELSE 0 END) as failed
FROM email_queue;
```

### View Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → `process-email-queue`
2. Click **Logs** tab
3. See execution history and any errors

### Common Issues

**Issue: Emails stuck in queue**
```
Symptom: sent = FALSE but no errors
Solution: 
  1. Check process-email-queue cron job is enabled
  2. Check RESEND_API_KEY is set in environment
  3. Manually trigger: curl POST to process-email-queue function
```

**Issue: Multiple emails for same status change**
```
Symptom: Applicant receives duplicate emails
Solution:
  1. This is normal if process runs multiple times
  2. Check status change didn't happen multiple times in DB
  3. Add UNIQUE constraint if needed
```

**Issue: Email never reaches inbox**
```
Symptoms: Email queued and sent=TRUE but applicant doesn't see it
Solutions:
  1. Check applicant email address is correct
  2. Check email service (Resend) bounce report
  3. Check spam/junk folder
  4. Verify RESEND_FROM_EMAIL is correct and verified domain
```

## Performance Considerations

- **Queue processing:** Batches of 10 emails per execution (fast)
- **Trigger overhead:** Minimal - just inserts into queue table
- **Indexes:** Optimized for pending email queries
- **Retry limit:** Max 3 attempts prevents queue buildup

## Testing the System

### Test 1: Verify Trigger Works

```sql
-- Check trigger is active
SELECT tgname FROM pg_trigger WHERE tgrelname = 'ip_records';
-- Should see: auto_notify_applicant_status_change
```

### Test 2: Simulate Status Change

```sql
-- Update a record's status
UPDATE ip_records SET status = 'supervisor_approved' WHERE id = 'record-uuid';

-- Check queue was populated
SELECT * FROM email_queue WHERE ip_record_id = 'record-uuid';
```

### Test 3: Process Queue Manually

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer $(echo $SUPABASE_SERVICE_ROLE_KEY)" \
  -H "Content-Type: application/json"
```

### Test 4: Verify Email Sent

```sql
SELECT sent, sent_at, error_message FROM email_queue 
WHERE ip_record_id = 'record-uuid';
-- Should show sent=TRUE and sent_at timestamp
```

## Backward Compatibility

✅ **Fully backward compatible:**
- Existing frontend calls still work unchanged
- Trigger is additive (doesn't interfere)
- No changes to existing email function
- Queue table is separate from core tables

## Migration Steps

1. **Apply migration:** `20251226_auto_email_status_notification_trigger.sql`
   - Creates email_queue table
   - Creates queue_status_notification function
   - Creates trigger on ip_records

2. **Deploy edge function:** `process-email-queue`
   - Deploys queue processor

3. **Enable cron job:** (Optional but recommended)
   - In Supabase Dashboard
   - Schedule every 5 minutes

4. **Test:**
   - Make a status change
   - Verify queue entry appears
   - Run process-email-queue
   - Verify email was sent

## Summary

This enhancement ensures:

✅ **No missed notifications:** Every status change triggers email
✅ **Automatic retries:** Failed emails automatically retry
✅ **Audit trail:** See exactly what emails were queued and when
✅ **Frontend independent:** Works even if frontend fails
✅ **Backward compatible:** Doesn't interfere with existing calls
✅ **Monitored:** Easy to see queue status and troubleshoot

The system is now **reliable and automatic** - applicants will always be notified of status changes!
