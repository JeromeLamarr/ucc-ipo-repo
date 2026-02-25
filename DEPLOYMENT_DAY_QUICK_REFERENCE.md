# DEPLOYMENT DAY: Quick Reference Card

**Keep this open while deploying.**

---

## 3-Step Release (20 minutes)

### Step 1: Set Secrets (5 min)
```bash
# Copy-paste these commands in terminal
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase secrets set RESEND_API_KEY="re_YOUR_API_KEY_FROM_RESEND"
supabase secrets set APP_URL="https://ucc-ipo.com"
supabase secrets set RESEND_FROM_EMAIL="noreply@ucc-ipo.com"

# Verify
supabase secrets list
# Should show all 5 variables ✓
```

### Step 2: Deploy Function (2 min)
```bash
supabase functions deploy register-user
# Wait for: ✓ Function deployed successfully
```

### Step 3: Smoke Tests (5 min)
```bash
# Test 1: Check logs
supabase functions logs register-user
# Expect: "[register-user] All required environment variables configured"
# Should NOT see: "ERROR" or "STARTUP ERROR"

# Test 2: Manual registration
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/register-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "release-test@example.com",
    "password": "TestPass123",
    "fullName": "Release Test"
  }'
# Expect: { "success": true, "message": "..." }

# Test 3: Email arrives (1-5 min wait)
# Check: release-test@example.com inbox for email
# From: UCC IP Office <noreply@ucc-ipo.com>
# Subject: Verify Your Email...

# Test 4: Click link
# Redirects: /auth/callback
# Shows: "Email Verified! Redirecting..."
# Redirects to: /dashboard (or home)

# Test 5: Database check
# In Supabase SQL Editor:
SELECT email, email_confirmed_at FROM auth.users 
WHERE email = 'release-test@example.com';
# Expect: email_confirmed_at is NOT NULL

# If all tests pass → ✅ RELEASE SUCCESSFUL
```

---

## Troubleshooting Quick Fixes

| Issue | Quick Fix | Time |
|-------|-----------|------|
| Email not arriving | Check Resend dashboard status | 2 min |
| Link doesn't work | Verify /auth/callback route exists | 3 min |
| Startup error | Verify all 5 secrets are set | 2 min |
| Resend API error | Check RESEND_API_KEY is correct | 2 min |
| Can't log in | Check email_confirmed_at is set | 2 min |

**Detailed help:** See TROUBLESHOOTING_5_MINUTE_GUIDE.md

---

## Rollback (If Needed)

```bash
# Revert to previous code
git checkout HEAD~1 -- supabase/functions/register-user/index.ts

# Redeploy
supabase functions deploy register-user

# Test again to confirm revert worked
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/register-user" ...
```

---

## After Release (24 Hours)

- [ ] Monitor error logs (Supabase → Edge Functions → Logs)
- [ ] Check Resend delivery rate (https://resend.com/dashboard)
- [ ] Verify user emails are being received
- [ ] Confirm admin approval workflow works
- [ ] Check no ERROR messages in logs
- [ ] Mark release as "stable" if all good

---

## Key Numbers

| Item | Target | Alert Level |
|------|--------|-------------|
| Registration success rate | > 95% | Alert if < 90% |
| Email delivery rate | > 98% | Alert if < 95% |
| Email verification rate | > 70% in 24h | Check if < 50% |
| Function error rate | 0% | Alert if any ERROR |
| Resolution time | N/A | Target < 15 min |

---

## Emergency Contacts

| Issue | Contact | Time |
|-------|---------|------|
| Email not sending | Resend Support (resend.com/support) | < 1h |
| Function errors | Supabase Support (supabase.com/support) | < 2h |
| Database query | Team Tech Lead | Immediate |
| Urgent rollback | Release Engineer Lead | Immediate |

---

## You Are Here: ☐ Planning ☐ **DEPLOYING** ☐ Testing ☐ Done

**Current Step:** Setting secrets or deploying  
**Elapsed Time:** _____ min / 20 min  
**Status:** 🟢 On Track / 🟡 Running Late / 🔴 Blocked

**Next Action:** _________________________

---

## Shortcuts

**Copy-paste test command:**
```
curl -X POST "https://xyzabc.supabase.co/functions/v1/register-user" -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_ANON_KEY" -d '{"email":"test-'$(date +%s)'@example.com","password":"Test123!","fullName":"Test"}'
```

**Copy-paste all secrets:**
```
supabase secrets set SUPABASE_URL="..." && \
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..." && \
supabase secrets set RESEND_API_KEY="..." && \
supabase secrets set APP_URL="..." && \
supabase secrets set RESEND_FROM_EMAIL="..."
```

**Copy-paste database check:**
```sql
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'test@example.com';
SELECT id, email, role, is_approved FROM public.users WHERE email = 'test@example.com';
```

---

## Checklist

Before releasing:
- [ ] All secrets obtained
- [ ] Secrets set in Supabase
- [ ] `supabase secrets list` shows all 5
- [ ] No startup errors in logs

After releasing:
- [ ] Manual registration test passed
- [ ] Email arrived (check inbox + spam)
- [ ] Link click redirected correctly
- [ ] Database shows correct user record
- [ ] Logs show no ERRORs

Monitoring:
- [ ] First 24 hours - check every 4h
- [ ] No escalations after 24h = ✅ Release success
- [ ] Any issues = 🔴 Investigate immediately

---

**Release Time Started:** __________  
**Release Time Completed:** __________  
**Total Duration:** __________  
**Issues Encountered:** ☐ None ☐ Minor ☐ Major  
**Resolution:** _________________________  

---

**Keep this tab open. Good luck! 🚀**
