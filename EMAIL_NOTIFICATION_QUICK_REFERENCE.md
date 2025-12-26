# Email Notification System - Quick Reference

## 🚀 Quick Start

### 1. Apply Migration (Supabase SQL Editor)
```sql
-- Copy entire migration from supabase/migrations/20251226_auto_email_status_notification_trigger.sql
-- Paste and execute in SQL Editor
```

### 2. Verify Tables
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_queue');
```

### 3. Enable Cron Job (Supabase Cron Jobs)
- Function: `process-email-queue`
- Schedule: `*/5 * * * *`
- Run every 5 minutes

### 4. Test
```sql
-- Find a record and update status
UPDATE ip_records SET status = 'supervisor_approved' WHERE id = 'xxx';

-- Check queue
SELECT * FROM email_queue WHERE sent = FALSE;

-- Manually process
POST https://your-project.supabase.co/functions/v1/process-email-queue
```

## 📊 Queue Monitoring

```sql
-- How many pending?
SELECT COUNT(*) FROM email_queue WHERE sent = FALSE;

-- How many sent?
SELECT COUNT(*) FROM email_queue WHERE sent = TRUE;

-- What failed?
SELECT * FROM email_queue WHERE sent = FALSE AND attempt_count >= 3;

-- Success rate
SELECT 
  ROUND(100.0 * SUM(CASE WHEN sent = TRUE THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_percent
FROM email_queue;
```

## 🔧 Common Tasks

### Manually Trigger Queue Processing
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-email-queue \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

### Check Function Logs
1. Supabase Dashboard → Edge Functions → `process-email-queue`
2. Click **Logs** tab

### Retry Failed Email
```sql
UPDATE email_queue
SET attempt_count = 0, error_message = NULL
WHERE id = 123;
-- Email will be retried on next processor run
```

### Clear Old Sent Emails
```sql
DELETE FROM email_queue 
WHERE sent = TRUE AND sent_at < NOW() - INTERVAL '60 days';
```

## 📋 Status Mappings

When status changes to:
| Status | Email Message |
|--------|---|
| `submitted` | Submission Received |
| `waiting_supervisor` | Under Supervisor Review |
| `supervisor_approved` | Approved by Supervisor |
| `supervisor_revision` | Revision Requested |
| `rejected` | Submission Declined |
| `waiting_evaluation` | In Evaluation |
| `evaluator_approved` | Evaluation Approved |
| `evaluator_revision` | Evaluator Revision Needed |
| `ready_for_filing` | Ready for IPO Filing |
| `completed` | Process Completed |

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No emails in queue | Check trigger exists: `SELECT tgname FROM pg_trigger WHERE tgrelname = 'ip_records'` |
| Queue not processing | Verify cron job enabled or manually call function |
| Emails not sent | Check RESEND_API_KEY in environment variables |
| Same email multiple times | Check status wasn't changed multiple times |
| Email in queue forever | Check edge function logs for errors |

## 📈 Dashboard View

View queue at a glance:
```sql
SELECT
  COUNT(*) as total_queued,
  SUM(CASE WHEN sent THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN NOT sent AND attempt_count < 3 THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN NOT sent AND attempt_count >= 3 THEN 1 ELSE 0 END) as failed
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days';
```

## ✅ Health Check

Run these to verify system health:

```sql
-- 1. Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgrelname = 'ip_records' AND tgname LIKE 'auto_notify%';

-- 2. Check queue table
SELECT COUNT(*) as total_rows FROM email_queue;

-- 3. Check recent activity
SELECT COUNT(*) as last_24h FROM email_queue WHERE created_at > NOW() - INTERVAL '24 hours';

-- 4. Check success rate (last 100)
SELECT 
  ROUND(100.0 * SUM(CASE WHEN sent THEN 1 ELSE 0 END) / COUNT(*), 1) as success_percent
FROM email_queue
WHERE created_at > (SELECT MAX(created_at) - INTERVAL '100 rows' FROM email_queue)
  OR created_at > NOW() - INTERVAL '7 days'
LIMIT 100;

-- 5. Check for stuck emails
SELECT COUNT(*) as stuck_emails FROM email_queue 
WHERE sent = FALSE AND attempt_count > 0 AND last_attempt_at < NOW() - INTERVAL '1 hour';
```

## 🔐 Security Notes

- Queue stores email addresses (PII) - ensure database backups are secure
- Service role key needed to manually process queue
- Edge function validates authorization
- All activities logged for audit trail

## 📚 Full Documentation

- **Setup:** [IMPLEMENTATION_CHECKLIST_EMAIL_NOTIFICATION.md](IMPLEMENTATION_CHECKLIST_EMAIL_NOTIFICATION.md)
- **Details:** [EMAIL_NOTIFICATION_AUTO_FIX.md](EMAIL_NOTIFICATION_AUTO_FIX.md)
- **Summary:** [EMAIL_NOTIFICATION_FIX_SUMMARY.md](EMAIL_NOTIFICATION_FIX_SUMMARY.md)

## 💡 Tips

1. **Processing frequency:** More often (every 1-2 min) = fresher emails but more API calls
2. **Retry count:** 3 is good default, increase if service is unreliable
3. **Batch size:** 10 emails per run balances speed with load
4. **Cleanup:** Archive old emails monthly to keep database lean
5. **Monitoring:** Set up alerts if pending queue grows too large

---

**Last Updated:** December 26, 2025
**Status:** ✅ Ready to deploy
