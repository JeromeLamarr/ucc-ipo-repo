# Email Verification: Deployment & Release Instructions

**Target Date:** February 25, 2026  
**Release Engineer:** [Your Name]  
**Status:** Ready for Release ✅

---

## Pre-Deployment Checklist

### Code Changes Completed
- [x] Edge Function updated with runtime validation
- [x] CORS headers fixed (specific origins, not wildcard)
- [x] Enhanced logging for all steps
- [x] Auth callback handler created
- [x] Environment variable table documented
- [x] Database migration already applied

### Configuration Ready
- [x] SUPABASE_URL identified
- [x] SUPABASE_SERVICE_ROLE_KEY identified
- [x] RESEND_API_KEY obtained from Resend
- [x] APP_URL determined
- [x] RESEND_FROM_EMAIL (optional) configured

---

## Release Plan: 3 Steps

### STEP 1: Set Environment Variables (Supabase Dashboard or CLI)

#### Option A: Via Supabase Dashboard (5 minutes)

```
1. Go to: https://app.supabase.com
2. Select your project
3. Navigate: Settings → Edge Functions → register-user
4. Click: "Environment Variables" or "Settings" icon
5. Add each variable:

   NAME: SUPABASE_URL
   VALUE: https://xyzabc.supabase.co

   NAME: SUPABASE_SERVICE_ROLE_KEY
   VALUE: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   NAME: RESEND_API_KEY
   VALUE: re_xxxxxxxxxxxxxxxxxxxxx

   NAME: APP_URL
   VALUE: https://ucc-ipo.com

   NAME: RESEND_FROM_EMAIL (optional)
   VALUE: noreply@ucc-ipo.com

6. Click: Save or Deploy
7. Wait for deployment (usually < 30 seconds)
```

#### Option B: Via Supabase CLI (3 minutes)

```bash
# In your project directory
cd /path/to/ucc-ipo-project

# Set secrets one by one
supabase secrets set SUPABASE_URL="https://xyzabc.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set APP_URL="https://ucc-ipo.com"
supabase secrets set RESEND_FROM_EMAIL="noreply@ucc-ipo.com"

# Verify all secrets are set
supabase secrets list

# Output should show all 5 variables (✓)
```

---

### STEP 2: Deploy Edge Function

#### Option A: Via CLI (Recommended for CI/CD)

```bash
# From project root
cd /path/to/ucc-ipo-project

# Deploy the register-user function
supabase functions deploy register-user

# Expected output:
# ✓ Function deployed successfully
# ✓ register-user: https://xyzabc.supabase.co/functions/v1/register-user
```

#### Option B: Via Dashboard (Manual)

```
1. Go to: https://app.supabase.com → Your Project
2. Navigate: Edge Functions → register-user
3. Look for: "Deploy" button or spinner status
4. If already deployed: No additional action (code auto-synced)
5. If not: Click "Deploy" and wait for completion
6. Verify: Status shows "Deployed" with timestamp

Expected status after deployment:
✓ register-user: Available
✓ Last deployed: 2026-02-25 at HH:MM UTC
```

#### Option C: Via Git Deployment (If Configured)

```
If your project is connected to GitHub/GitLab:
1. Commit and push changes to main branch
2. Supabase automatically deploys Edge Functions
3. Monitor: Deployments tab in dashboard
4. Verify: Function status shows recent deployment timestamp

No manual deployment step needed!
```

---

### STEP 3: Smoke Test (5 minutes)

Run these tests to verify everything works:

#### Test 3.1: Check Environment Variables Are Set

```bash
# Via CLI
supabase secrets list

# Should output:
# SUPABASE_URL: https://xyzabc.supabase.co ✓
# SUPABASE_SERVICE_ROLE_KEY: [set] ✓
# RESEND_API_KEY: [set] ✓
# APP_URL: https://ucc-ipo.com ✓
# RESEND_FROM_EMAIL: noreply@ucc-ipo.com ✓
```

#### Test 3.2: Check Function Logs Show No Startup Errors

```
1. Go to: https://app.supabase.com → Edge Functions → register-user → Logs
2. Look for recent entries (< 5 minutes)
3. Should NOT see:
   ❌ "STARTUP ERROR: Missing required environment variables"
   ❌ "Missing RESEND_API_KEY"
   ❌ "Missing APP_URL"
4. Should see (if you deployed but haven't tested):
   ✓ "All required environment variables configured at startup"
```

#### Test 3.3: Manual Registration Test

```bash
# Using cURL to test the function

curl -X POST "https://xyzabc.supabase.co/functions/v1/register-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \ # <- Your Supabase ANON key
  -d '{
    "email": "release-test-'$(date +%s)'@example.com",
    "password": "TestPassword123",
    "fullName": "Release Test User",
    "departmentId": null
  }'

# Expected response (HTTP 200):
# {
#   "success": true,
#   "message": "Account created successfully. Check your email for the verification link."
# }
```

#### Test 3.4: Check Email Arrived (1-5 minutes)

```
1. Check your test email inbox for: "Verify Your Email - UCC IP Management System"
2. Should arrive from: "UCC IP Office <noreply@ucc-ipo.com>"
3. Should contain: Blue "Verify Email Address" button
4. Click button → Should redirect to /auth/callback
5. After redirect, you should see: "Email Verified! Redirecting..."
6. After 1-2s, redirected to: /dashboard or /login
```

#### Test 3.5: Check Edge Function Logs

```
1. Go to: https://app.supabase.com → Edge Functions → register-user → Logs
2. Look for your test in the past 5 minutes
3. Should see entries like:

[register-user] === REGISTER USER FUNCTION CALLED ===
[register-user] Environment validated. Creating Supabase client...
[register-user] Step: Creating auth user
[register-user] ✓ Auth user created successfully
[register-user] Step: Generating email confirmation link
[register-user] ✓ Email confirmation link generated successfully
[register-user] Step: Sending verification email via Resend
[register-user] ✓ Email sent successfully to: release-test-xxx@example.com
[register-user] ✓ REGISTRATION COMPLETE

4. Should NOT see any ERROR entries
```

#### Test 3.6: Verify Database State

```sql
-- In Supabase SQL Editor: https://app.supabase.com → SQL Editor

-- Check auth user was created
SELECT id, email, email_confirmed_at FROM auth.users 
WHERE email = 'release-test-xxx@example.com'
LIMIT 1;

-- Should show: email_confirmed_at = NULL (not yet verified)

-- Check public.users profile was created
SELECT id, auth_user_id, email, full_name, role, is_approved 
FROM public.users 
WHERE email = 'release-test-xxx@example.com';

-- Should show: role='applicant', is_approved=false
```

---

## Verification Checklist

After completing all 3 deployment steps, verify:

- [ ] All 5 environment variables set in Supabase
- [ ] Edge Function deployed (status shows "Deployed")
- [ ] No startup errors in logs
- [ ] Test registration returns `{ success: true }`
- [ ] Test email arrived in inbox
- [ ] Email link redirects to /auth/callback successfully
- [ ] Database shows new user with role='applicant'
- [ ] Admin dashboard shows pending approval for new user

**All checks pass?** ✅ **Release is ready!**

---

## Rollback Plan (If Issues Occur)

### Immediate Rollback

If deployment causes problems:

#### Option 1: Revert to Previous Function Code

```bash
# Use git to revert the register-user function
git checkout HEAD~1 -- supabase/functions/register-user/index.ts

# Redeploy
supabase functions deploy register-user

# Or via Dashboard:
# Edge Functions → register-user → Deployments → Select Previous → Activate
```

#### Option 2: Disable Environment Variables

```bash
# Remove problematic variables
supabase secrets unset RESEND_API_KEY

# Function will fail with clear error (then you know it's the env var)
```

#### Option 3: Return to Supabase SMTP (If Available)

If Resend has issues:
1. Update function to use `supabase.auth.sendEmail()` instead
2. Remove Resend secret
3. Redeploy

---

## Post-Deployment Monitoring (First 24 Hours)

### Monitor These Metrics

1. **Registration Success Rate**
   - Track: % of registrations that complete without error
   - Target: > 95% success
   - Check: Edge Function logs, Supabase dashboard

2. **Email Delivery Rate**
   - Track: % of emails that reach inbox (not spam/bounce)
   - Target: > 98% delivery
   - Check: Resend dashboard → Emails tab

3. **Email Verification Rate**
   - Track: % of users who click verification link
   - Target: > 70% within 24 hours
   - Check: Database (count email_confirmed_at NOT NULL)

4. **Error Logs**
   - Track: Any errors in Edge Function logs
   - Action: Investigate and fix immediately
   - Check: Edge Functions → register-user → Logs (filter by "ERROR")

### Daily Checklist (First 3 Days)

```
Day 1 (Release Day):
- [ ] Monitor registration volume for 2 hours
- [ ] Check Resend dashboard for delivery status
- [ ] Verify no ERROR logs in Edge Functions
- [ ] Ask 1-2 beta users to test registration flow

Day 2:
- [ ] Review metrics from Day 1
- [ ] Check email validation success rate
- [ ] Confirm admin approval workflow works
- [ ] Monitor error rate (should remain < 5%)

Day 3:
- [ ] Final verification of all metrics
- [ ] Document any issues found
- [ ] Plan fixes if needed
- [ ] Release as "stable"
```

---

## Communication Plan

### Stakeholders to Notify

1. **Admins** (who approve applicants)
   - New applicants will appear in dashboard
   - Approval workflow is unchanged
   - No action needed from admins

2. **Users/Applicants**
   - Update homepage/docs with new registration flow
   - "You will receive a verification email - check spam folder"
   - Add FAQ: "How long does verification take?" (usually 1-5 minutes)

3. **Support Team**
   - Briefing on new registration flow
   - Common issues: link not received, link expired, redirect fails
   - Escalation: Tag as "email-verification" in support system

### Release Notes Template

```markdown
## Email Verification System - Deployed

### What's New
- Registration now sends automatic verification emails
- Users must verify email address before accessing dashboard
- Emails sent via Resend (reliable delivery, 98%+ success)

### For Users
- You'll receive a verification email after registration
- Click the "Verify Email Address" button in the email
- Takes ~1-5 minutes to arrive (check spam folder)
- Link expires after 24 hours

### For Admins
- New applicants appear with status: "Pending Approval"
- You must approve applicants before they can access dashboard
- Role: "applicant" by default (not changeable by user)

### For Support
- Contact: support@ucc-ipo.com
- Issue: Email not received → Check Resend dashboard
- Issue: Link expired → User must re-register
- Issue: Can't verify → Check function logs

### Technical Details
- Edge Function: register-user
- Email Provider: Resend
- Callback Handler: /auth/callback
- Database Trigger: handle_verified_user()
```

---

## Sign-Off

**Release Engineer:** _________________  
**Date:** _______________  
**Status:** ✅ Approved for Release  

**Verified by:**
- [ ] Code review completed
- [ ] Environment vars set correctly
- [ ] Smoke tests passed
- [ ] Edge Function logs clean
- [ ] Resend dashboard configured
- [ ] CSS/email templates approved
- [ ] Callback handler in place
- [ ] Documentation updated

---

## Quick Reference: Command Cheat Sheet

```bash
# Set all secrets at once (copy-paste ready)
supabase secrets set SUPABASE_URL="https://xyzabc.supabase.co" && \
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..." && \
supabase secrets set RESEND_API_KEY="re_..." && \
supabase secrets set APP_URL="https://ucc-ipo.com" && \
supabase secrets set RESEND_FROM_EMAIL="noreply@ucc-ipo.com"

# Verify all set
supabase secrets list

# Deploy
supabase functions deploy register-user

# Watch logs in real-time (if supported)
supabase functions logs register-user --tail

# Test function
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/register-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","password":"Test123!","fullName":"Test User"}'
```

---

**Deployment Expected Duration:** 15-20 minutes  
**Downtime Required:** None (zero-downtime deployment)  
**Rollback Time If Needed:** 5-10 minutes  
