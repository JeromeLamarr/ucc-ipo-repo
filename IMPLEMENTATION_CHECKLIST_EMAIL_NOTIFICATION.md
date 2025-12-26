# Email Notification Auto-Fix - Implementation Checklist

## ✅ Completed

- [x] Created `email_queue` table for storing pending notifications
- [x] Created database trigger `auto_notify_applicant_status_change`
- [x] Created trigger function `queue_status_notification()`
- [x] Created edge function `process-email-queue`
- [x] Added comprehensive documentation
- [x] Committed all changes to git repository
- [x] Pushed to GitHub

## 📋 Next Steps (In Supabase Dashboard)

### Step 1: Apply Database Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the migration file: [20251226_auto_email_status_notification_trigger.sql](supabase/migrations/20251226_auto_email_status_notification_trigger.sql)
3. Copy the entire SQL content
4. Create a new query in SQL Editor
5. Paste the SQL and execute it

**What it does:**
- Creates `email_queue` table
- Creates trigger function `queue_status_notification()`
- Creates trigger `auto_notify_applicant_status_change`
- Creates indexes for performance

### Step 2: Verify Migration Applied

Run this query to verify:
```sql
-- Check table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'email_queue'
) as queue_table_exists;

-- Check trigger exists
SELECT EXISTS (
  SELECT 1 FROM pg_trigger 
  WHERE tgname = 'auto_notify_applicant_status_change'
) as trigger_exists;
```

Expected result: Both should return `true`

### Step 3: Deploy Edge Function

1. Go to **Supabase Dashboard** → **Edge Functions**
2. The `process-email-queue` function should auto-deploy
3. Verify it appears in the functions list
4. Click on it and check **Deployment Status** shows "Active"

### Step 4: Enable Automatic Processing (Recommended)

**Option A: Set up Cron Job (Recommended)**
1. Go to **Supabase Dashboard** → **Cron Jobs**
2. Click **Create new cron**
3. Fill in:
   - **Function:** `process-email-queue`
   - **Schedule:** `*/5 * * * *` (every 5 minutes)
   - **Name:** `Process Email Queue`
4. Save and **Enable**

This will automatically process pending emails every 5 minutes.

**Option B: Manual Processing**
1. Whenever you need to process emails, call:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/process-email-queue \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

### Step 5: Test the System

#### Test 1: Verify Queue Population
1. In Supabase SQL Editor, run:
   ```sql
   -- Find a test record
   SELECT id, applicant_id, title FROM ip_records LIMIT 1;
   ```
2. Update its status:
   ```sql
   UPDATE ip_records 
   SET status = 'supervisor_approved'
   WHERE id = 'YOUR_RECORD_ID';
   ```
3. Check queue:
   ```sql
   SELECT * FROM email_queue 
   WHERE sent = FALSE 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Expected:** One row appears with your record details

#### Test 2: Process Queue
1. Manually trigger the processor:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/process-email-queue \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```
2. Check response shows email was processed
3. Verify in database:
   ```sql
   SELECT sent, sent_at FROM email_queue 
   WHERE ip_record_id = 'YOUR_RECORD_ID';
   ```
   **Expected:** `sent=true` and a timestamp

#### Test 3: Check Email Receipt
1. Look in the applicant's email inbox
2. Should receive status change email from noreply@ucc-ipo.com
3. Email subject should match the status (e.g., "✓ Supervisor Approved Your Submission")

## 🔍 Monitoring

### Daily Checks

```sql
-- How many emails pending?
SELECT COUNT(*) as pending FROM email_queue WHERE sent = FALSE;

-- How many sent today?
SELECT COUNT(*) as sent_today FROM email_queue 
WHERE sent = TRUE AND sent_at > NOW() - INTERVAL '24 hours';

-- Any errors?
SELECT COUNT(*) as failed FROM email_queue 
WHERE sent = FALSE AND attempt_count >= 3;
```

### Weekly Review

```sql
-- Summary by status
SELECT 
  status, 
  COUNT(*) as count,
  SUM(CASE WHEN sent = TRUE THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN sent = FALSE THEN 1 ELSE 0 END) as pending
FROM email_queue
GROUP BY status;
```

### Monthly Cleanup (Optional)

```sql
-- Archive old sent emails (older than 30 days)
DELETE FROM email_queue 
WHERE sent = TRUE AND sent_at < NOW() - INTERVAL '30 days';
```

## 🐛 Troubleshooting

### Issue: No emails in queue after status change
**Check:**
1. Verify trigger exists: `SELECT tgname FROM pg_trigger WHERE tgrelname = 'ip_records';`
2. Verify applicant has email: `SELECT email FROM users WHERE id = 'applicant_id';`
3. Check migration was applied correctly

### Issue: Emails queued but not sent
**Check:**
1. Verify cron job is enabled (if using automatic)
2. Check edge function logs: **Edge Functions** → **process-email-queue** → **Logs**
3. Manually trigger processor and check response
4. Verify RESEND_API_KEY is set in environment variables

### Issue: Same record generates multiple queue entries
**This is normal if:**
- Status changed multiple times
- Test updated the same record multiple times

**To prevent during testing:**
- Use different test records for each test

## 📊 Useful Queries

### Failed Email Investigation
```sql
SELECT id, ip_record_id, applicant_email, error_message, attempt_count
FROM email_queue
WHERE sent = FALSE AND attempt_count >= 3
ORDER BY created_at DESC;
```

### Retry Failed Email
```sql
UPDATE email_queue
SET attempt_count = 0, last_attempt_at = NULL, error_message = NULL
WHERE id = 123;  -- Replace with actual queue ID
-- Then run process-email-queue again
```

### Queue Statistics
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN sent = TRUE THEN 1 ELSE 0 END) as successfully_sent,
  SUM(CASE WHEN sent = FALSE AND attempt_count < 3 THEN 1 ELSE 0 END) as pending_retry,
  SUM(CASE WHEN sent = FALSE AND attempt_count >= 3 THEN 1 ELSE 0 END) as failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (sent_at - created_at))), 2) as avg_send_time_seconds
FROM email_queue
WHERE sent = TRUE;
```

## ✨ Key Features

✅ **Automatic:** No manual email sending needed
✅ **Reliable:** Retries failed emails up to 3 times
✅ **Tracked:** Complete audit trail of all emails
✅ **Fast:** Batches of 10 emails per execution
✅ **Monitored:** Easy visibility into queue status
✅ **Backward Compatible:** Works with existing code

## 📚 Documentation

Full documentation: [EMAIL_NOTIFICATION_AUTO_FIX.md](EMAIL_NOTIFICATION_AUTO_FIX.md)

Contains:
- Architecture overview
- Problem statement
- Solution details
- Configuration guide
- Monitoring & troubleshooting
- Testing procedures

## ❓ Questions?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the main documentation
3. Check Supabase logs for errors
4. Manually test with SQL queries to isolate the issue
