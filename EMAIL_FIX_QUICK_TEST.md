# Email Notification Fix - Quick Test Guide

## What Was Fixed

✅ Emails now sent when supervisor approves submission
✅ Emails now sent when evaluator makes decision
✅ Automatic queue system as backup

## Quick Test (5 Minutes)

### Step 1: Supervisor Approval Test
1. Log in as **Supervisor**
2. Go to **Supervisor Review Queue**
3. Find a pending submission
4. Click **Review**
5. Click **Approve**
6. Check browser console (F12 → Console tab)
   - Should see: `[SupervisorDashboard] Status notification email sent successfully`
7. Check **Resend dashboard** (resend.com)
   - Should see new email: "Supervisor Approved Your Submission"
8. Applicant should receive email

### Step 2: Evaluator Decision Test
1. Log in as **Evaluator**
2. Go to **Evaluator Queue**
3. Find a submission awaiting evaluation
4. Click **Evaluate**
5. Scroll to bottom and click **Approve** (or Request Revision)
6. Check browser console (F12 → Console tab)
   - Should see: `[EvaluatorDashboard] Status notification email sent successfully`
7. Check **Resend dashboard**
   - Should see new email: "Evaluation Complete - Approved!" (or revision request)
8. Applicant should receive email

## What to Look For

### ✅ Success Signs
- Email appears in Resend dashboard within 2 seconds
- Console shows "sent successfully"
- Status changes in the dashboard
- No error messages

### ❌ Error Signs
- No email in Resend dashboard
- Console shows error message
- Email says "Could not send email: applicant email not found"
- Status doesn't change

## If Something Goes Wrong

### Issue: No email sent (but no error message)
**Solution:**
1. Check browser console for errors (F12)
2. Check Supabase edge function logs:
   - Supabase → Edge Functions → send-status-notification → Logs
3. If nothing there, the call might not have reached the function

### Issue: Email sent but to wrong person
**Solution:**
1. Check if applicant email in database is correct
2. User Settings → Profile → Email address

### Issue: Same email sent multiple times
**Solution:**
1. This is OK - means the action was triggered multiple times
2. Not a system issue, just repeated actions

### Issue: Email never arrives in inbox
**Solution:**
1. Check Resend shows it was delivered (green "Delivered" status)
2. If delivered but not in inbox: check spam folder
3. If not delivered: check applicant email address is valid

## Testing Statuses

Run these to confirm emails are in queue:

```sql
-- Check today's emails
SELECT COUNT(*) as emails_sent_today 
FROM email_queue 
WHERE sent = TRUE 
AND sent_at > NOW() - INTERVAL '24 hours';

-- Check pending
SELECT COUNT(*) as pending 
FROM email_queue 
WHERE sent = FALSE;

-- View recent
SELECT applicant_email, status, sent, sent_at 
FROM email_queue 
ORDER BY created_at DESC 
LIMIT 10;
```

## Browser Console Logs

### Good logs to see:
```
[SupervisorDashboard] Sending email notification to user@example.com
[SupervisorDashboard] Status notification email sent successfully
```

```
[EvaluatorDashboard] Sending email notification to user@example.com
[EvaluatorDashboard] Status notification email sent successfully
```

### Warning logs (still OK):
```
[SupervisorDashboard] Sending email notification to user@example.com
[EvaluatorDashboard] Email service error: {...}
```
This means email failed but will be retried automatically.

### Bad logs to see:
```
[SupervisorDashboard] Could not send email: applicant email not found
```
This means applicant doesn't have email in database.

## Files Changed

- `src/pages/SupervisorDashboard.tsx` - Fixed supervisor approval emails
- `src/pages/EvaluatorDashboard.tsx` - Fixed evaluator decision emails

## How to Deploy

Already deployed! Just:
1. Pull latest code: `git pull`
2. Rebuild: `npm run build`
3. Deploy to production

## Rollback (if needed)

```bash
git revert a5e7cdb  # Reverts the email fix
git revert 53dcf7a
git revert 85bef81
```

## Questions?

Check:
1. `EMAIL_NOTIFICATION_BUG_FIX.md` - Technical details
2. `EMAIL_FIX_COMPLETE_SUMMARY.md` - Full summary
3. Browser console logs - Detailed error messages
4. Supabase edge function logs - Server-side errors

---

**Test Duration:** ~5 minutes
**Difficulty:** Easy
**Success Rate:** Should be 100% after fix
