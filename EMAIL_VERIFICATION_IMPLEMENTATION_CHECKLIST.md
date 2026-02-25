# Email Verification Implementation Checklist

## ✅ Implementation Complete

This checklist verifies the registration flow is fully implemented and ready for testing/deployment.

---

## Edge Function Updates

- [x] Updated [supabase/functions/register-user/index.ts](supabase/functions/register-user/index.ts)
  - [x] Changed `generateLink` type from `"magiclink"` to `"signup"`
  - [x] Proper error handling for link generation
  - [x] Extract `actionLink` from `linkData.properties.action_link`
  - [x] Require link generation to succeed (no fallback)
  - [x] Send email via **Resend REST API** (not Supabase SMTP)
  - [x] Proper CORS headers for browser requests
  - [x] Comprehensive logging for debugging
  - [x] Returns clear success/error messages

---

## Database Support

- [x] Database trigger configured
  - [x] [20260225_fix_email_verification_trigger.sql](supabase/migrations/20260225_fix_email_verification_trigger.sql)
  - [x] Function: `handle_verified_user()`
  - [x] Trigger: `on_auth_user_verified`
  - [x] Creates `public.users` record when email verified
  - [x] Sets default role: `'applicant'`
  - [x] Sets default approval: `is_approved = false`
  - [x] RLS policies allow trigger execution

---

## Configuration Files Needed

### Environment Variables (Supabase -> Edge Functions -> register-user -> Settings)

- [ ] **SUPABASE_URL** 
  - Location: Supabase Dashboard → Settings → API
  - Value: `https://xyzabc.supabase.co`
  - ⓘ Already in use, just verify it's accessible

- [ ] **SUPABASE_SERVICE_ROLE_KEY** 
  - Location: Supabase Dashboard → Settings → API → Service Role Key
  - Value: Long jwt starting with `eyJhbGc...`
  - ⚠️ Keep this SECRET! Only in Edge Functions, never in frontend

- [ ] **RESEND_API_KEY** 
  - Location: Resend Dashboard → API Keys
  - Value: Key starting with `re_`
  - ⚠️ Keep this SECRET! Only in Edge Functions, never in frontend

- [ ] **APP_URL** 
  - Purpose: Base URL for email callback links
  - Value: `https://ucc-ipo.com` (or your domain)
  - Note: Update for each environment (dev, staging, prod)

- [ ] **RESEND_FROM_EMAIL** (Optional)
  - Default: `noreply@ucc-ipo.com`
  - Note: Must be a verified sender in Resend

---

## Frontend Integration

### Register Page (/register)
- [ ] Form collects: email, password, fullName, departmentId (optional)
- [ ] Calls: `POST /functions/v1/register-user`
- [ ] Adds auth header: `Authorization: Bearer {ANON_KEY}`
- [ ] Shows: Success message OR error message
- [ ] Success message: "Check your email for verification link" or similar
- [ ] Error message: Display `result.error`

### Auth Callback Route (/auth/callback)
- [ ] URL exists at: `https://your-domain.com/auth/callback`
- [ ] Extracts `code` from URL parameters (`?code=...`)
- [ ] Calls: `supabase.auth.getSession()` to exchange code
- [ ] On success: Redirects to dashboard or home
- [ ] On failure: Shows error message, links user to login/register

### Login Page (/login)
- [ ] User can log in after email is verified
- [ ] Accepts: email + password
- [ ] Uses Supabase client: `supabase.auth.signInWithPassword({ email, password })`

---

## Email Configuration (Resend)

- [ ] Resend account created
- [ ] API key generated
- [ ] Sender email verified in Resend
  - [ ] Or: Add domain SPF/DKIM records if using custom domain
- [ ] Email templates tested (manual or via Resend dashboard)
- [ ] Spam folder checked (test with multiple email providers)

---

## Testing Checklist

### Manual Registration Test
```
1. [ ] Visit: https://your-domain.com/register
2. [ ] Fill form: 
       - email: test@example.com
       - password: TestPass123
       - fullName: Test User
       - departmentId: (leave blank)
3. [ ] Click "Register"
4. [ ] Should see: "✅ Account created! Check your email for verification link."
```

### Email Verification Test
```
1. [ ] Check email inbox for: "Verify Your Email" from UCC IP Office
2. [ ] Email has "Verify Email Address" button or link
3. [ ] Click button/link
4. [ ] Redirected to: https://your-domain.com/auth/callback?code=...
5. [ ] Should see: "Verifying your email..." message
6. [ ] After 1-2 seconds: Redirected to dashboard or home
```

### Login After Verification Test
```
1. [ ] Visit: https://your-domain.com/login
2. [ ] Enter:
       - email: test@example.com
       - password: TestPass123
3. [ ] Click "Sign In"
4. [ ] Should be able to log in ✅
```

### Error Cases
```
1. [ ] Register with invalid email (should fail gracefully)
2. [ ] Register with weak password < 6 chars (should show error)
3. [ ] Register twice with same email (should show "already exists")
4. [ ] Disable RESEND_API_KEY, try register (should show error)
5. [ ] Verify link after 24hrs (should show "link expired" or similar)
```

### Database Verification
```
1. [ ] After verification, check Supabase:
       - [ ] auth.users table: email_confirmed_at is NOT NULL
       - [ ] public.users table: new record created
       - [ ] Values: role='applicant', is_approved=false
       - [ ] Values: full_name, department_id match registration
```

### Edge Function Logs
```
1. [ ] Supabase Dashboard → Edge Functions → register-user → Logs
2. [ ] Should see entries like:
       - "[register-user] Auth user created: ..."
       - "[register-user] Generating email confirmation link for: ..."
       - "[register-user] Email sent successfully with ID: ..."
```

### Email Provider Verification
```
1. [ ] Resend Dashboard → Emails
2. [ ] Should see entry for test email
3. [ ] Status: "Delivered" (not "Bounced" or "Failed")
4. [ ] Recipient: test@example.com
5. [ ] Subject: "Verify Your Email - UCC IP Management System"
```

---

## Deployment Checklist

### Pre-Deployment (Staging)
- [ ] Test in staging environment first
- [ ] Use staging domain for APP_URL
- [ ] Verify email delivery in staging
- [ ] Test full registration + verification flow
- [ ] Check error handling and edge cases

### Production Deployment
- [ ] Run migration: `20260225_fix_email_verification_trigger.sql`
  - [ ] Via Supabase Dashboard → SQL Editor
  - [ ] Or via: `supabase db push`
- [ ] Set production environment variables in Edge Functions
  - [ ] SUPABASE_URL (production)
  - [ ] SUPABASE_SERVICE_ROLE_KEY (production)
  - [ ] RESEND_API_KEY
  - [ ] APP_URL (production domain)
  - [ ] RESEND_FROM_EMAIL (production sender)
- [ ] Deploy updated `register-user` function
  - [ ] Via: `supabase functions deploy register-user`
  - [ ] Or via: Dashboard → Edge Functions → Deploy
- [ ] Smoke test in production
  - [ ] Register new test account
  - [ ] Verify email is sent and received
  - [ ] Complete verification flow
  - [ ] Confirm user can log in
- [ ] Monitor logs for 24 hours
  - [ ] Check Edge Function logs
  - [ ] Check Resend delivery status
  - [ ] Verify no errors reported

### Post-Deployment
- [ ] Update end-user documentation
- [ ] Train team on new flow
- [ ] Set up monitoring/alerts for:
  - [ ] Email delivery failures
  - [ ] Edge Function errors
  - [ ] Resend API issues
- [ ] Plan rollback strategy (if needed)

---

## Monitoring & Alerts (Optional but Recommended)

### Setup Email Delivery Monitoring
```
1. [ ] Enable Resend webhooks (in Resend dashboard)
2. [ ] Log webhook events (delivery, bounce, complaint)
3. [ ] Alert on: bounces, failures, complaints
```

### Setup Edge Function Monitoring
```
1. [ ] Supabase provides built-in logs
2. [ ] Monitor for errors: "Registration error:", "Email service error"
3. [ ] Set up alerts via: Dashboard → Alerts or external service
```

### Useful Metrics to Track
- Email delivery rate (should be > 98%)
- Registration completion rate (% who verify email)
- Time to verify (average)
- Bounce/complaint rate (should be < 0.5%)

---

## Rollback Plan (If Issues Occur)

### Quick Rollback
```bash
# Revert to previous register-user function
supabase functions deploy register-user --version <previous-hash>

# Or manually revert in Dashboard:
# Edge Functions → register-user → Deployments → Select previous → Activate
```

### Fallback Options
1. **Use Supabase SMTP** (if available)
   - Simpler but may have rate limits
   - No Resend API key needed
   
2. **Use Magic Link Flow** (if email sending fails)
   - Change type back to "magiclink"
   - But: Users won't need to set password
   
3. **Manual Email Sending**
   - Admin sends verification links manually
   - More work but can handle temporary outages

---

## Support & Debugging

### Common Issues & Solutions

**Issue:** Users not receiving emails
- [ ] Check Resend dashboard → email status
- [ ] Check Edge Function logs for errors
- [ ] Verify RESEND_API_KEY is correct
- [ ] Check spam folder
- [ ] Look for bounce/complaint in Resend

**Issue:** Link clicks don't work
- [ ] Verify APP_URL is correct
- [ ] Check auth/callback route exists
- [ ] Look for console errors in browser dev tools
- [ ] Check Edge Function error logs

**Issue:** Registration fails silently
- [ ] Check browser console for network errors
- [ ] Look at Edge Function logs
- [ ] Verify all required env vars are set
- [ ] Check if Supabase project is reachable

**Issue:** "Link already used" error
- [ ] This is expected (links are one-time use)
- [ ] User should re-register if link is lost
- [ ] Implement "Resend Email" feature for logged-out users

---

## Related Documentation

- ✅ [REGISTER_USER_EDGE_FUNCTION_SETUP.md](REGISTER_USER_EDGE_FUNCTION_SETUP.md) - Full setup guide
- ✅ [GENERATELINK_TYPE_DECISION.md](GENERATELINK_TYPE_DECISION.md) - Technical reasoning
- 📄 [Edge Function Code](supabase/functions/register-user/index.ts)
- 📄 [Database Migration](supabase/migrations/20260225_fix_email_verification_trigger.sql)

---

## Sign-Off

**Implementation Status:** ✅ COMPLETE

| Component | Status | Date | Notes |
|-----------|--------|------|-------|
| Edge Function | ✅ Updated | 2026-02-25 | Uses signup type, Resend API |
| Database Trigger | ✅ Migrated | 2026-02-25 | Handles email verification |
| Documentation | ✅ Complete | 2026-02-25 | Setup guide + design decisions |
| Testing | ⏳ Pending | - | Follow testing checklist above |
| Staging Deploy | ⏳ Pending | - | Test before production |
| Production Deploy | ⏳ Pending | - | Deploy to production |

---

**Ready to deploy!** Follow the [testing checklist](#testing-checklist) first, then [deployment checklist](#deployment-checklist).
