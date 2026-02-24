# Email Verification Testing Checklist

## Pre-Testing Setup

### Environment Check
- [ ] Frontend built successfully (`npm run build` completed without errors)
- [ ] `register-user` edge function has been deployed to Supabase
- [ ] `APP_URL` environment variable is set in Supabase project
- [ ] `RESEND_API_KEY` is configured in Supabase
- [ ] Auth redirect URLs include `/auth/callback` endpoint
- [ ] Browser console is open for debugging (F12 → Console tab)

### Test Environment Selection
- [ ] **Local Development** - `http://localhost:5173`
  - Requires: `npm run dev` running
  - Test with: Mailhog or Supabase local email logs
- [ ] **Production** - `https://ucc-ipo.com`  
  - Requires: App deployed to production
  - Test with: Real Resend email delivery

---

## Test Scenario 1: Happy Path Email Verification

### User Actions:
```
1. Go to /register page
2. Fill registration form:
   - Email: test-verify-[timestamp]@example.com
   - Full Name: Test User Verify
   - Password: TestPassword123!
   - Department: Any (or leave blank)
3. Click "Register" button
4. Wait for "email-sent" confirmation page
5. Check email inbox for verification message
6. Click "Verify Email Address" button in email (or copy link)
7. Browser loads /auth/callback page
8. See "Verifying..." spinner with animated loader icon
9. See "Verification Successful!" message after 1-2 seconds
10. Auto-redirect to /dashboard
```

### Expected Outcomes:
- [ ] Registration form submits without errors
- [ ] "Email sent" confirmation page displays
- [ ] Email received within 60 seconds
- [ ] Email sender is "UCC IP Office <noreply@ucc-ipo.com>"
- [ ] Email has proper HTML formatting
- [ ] Email contains a visible "Verify Email Address" button
- [ ] Email contains the raw URL link (backup clickable link)
- [ ] Verify button/link is clickable and not expired
- [ ] Page shows "Verifying..." spinner while processing
- [ ] Success message shows: "Verification Successful!"
- [ ] Browser console shows these logs (in order):
  ```
  [AuthCallback] URL hash: #access_token=...
  [AuthCallback] No session found, attempting to exchange code...
  [AuthCallback] Found code in URL, exchanging for session...
  [AuthCallback] Code exchange successful, session: true
  [AuthCallback] Verified user: [UUID] Email confirmed: true
  [AuthCallback] Creating user profile...
  [AuthCallback] Profile created successfully
  [AuthCallback] Verification successful, redirecting to dashboard
  ```
- [ ] Auto-redirects to `/dashboard` after 1.5 seconds
- [ ] Dashboard loads successfully for new applicant

### Admin Follow-up for Local Testing:
```
8.1 (If testing applicant experience)
    - Login as admin
    - Go to Dashboard → Applicant Approvals
    - Find test user in "Pending Approval" list
    - Click "Approve" button
    - Confirm admin notification email is sent
```

---

## Test Scenario 2: Email Link Expiration

### User Actions:
```
1. Register new account (same as Scenario 1, steps 1-4)
2. DO NOT click verification link immediately
3. Wait 25 hours (or check if Supabase has shorter test period)
4. Try to click verification link from email
5. Observe page behavior
```

### Expected Outcomes:
- [ ] Page loads (doesn't crash)
- [ ] Error message is displayed: "Email verification incomplete. The verification link may have expired..."
- [ ] Page offers to redirect to registration after 3-4 seconds
- [ ] Console shows error: "Code exchange error"
- [ ] User can register again with same email
- [ ] New email with fresh verification link is sent

---

## Test Scenario 3: Multiple Verification Attempts

### User Actions:
```
1. Register a new account
2. Receive email with verification link
3. Open the verification link in FIRST browser tab
4. Wait for success message
5. In a SECOND browser tab, open the SAME verification link again
6. Observe behavior
```

### Expected Outcomes:
- [ ] First browser: Verification succeeds, redirects to dashboard
- [ ] Second browser (same link):
  - [ ] Page loads with "Verifying..." spinner
  - [ ] Error displayed: "Email verification incomplete" OR "Code exchange error"
  - [ ] Browser console shows error
  - [ ] Does NOT create duplicate profiles in database
  - [ ] Redirects to registration page offer

---

## Test Scenario 4: Invalid/Malformed Link

### User Actions:
```
1. Manually navigate to: /auth/callback?code=invalid_token_12345
2. OR: /auth/callback (with no code parameter)
3. Observe page behavior
```

### Expected Outcomes:
- [ ] Page loads with "Verifying..." spinner
- [ ] Error is shown: "Email verification failed" or similar
- [ ] Browser console shows error details
- [ ] Page offers to redirect to registration
- [ ] No database errors or stack traces exposed to user

---

## Test Scenario 5: Post-Verification Login

### User Actions:
```
1. Complete Scenario 1 (successful email verification)
2. Close browser or log out
3. Go to /login page
4. Enter email and password from registration
5. Click "Login" button
```

### Expected Outcomes:
- [ ] Login form submits without error
- [ ] NO error: "Email not confirmed" or "Email not verified"
- [ ] User is authenticated
- [ ] User is redirected to appropriate page:
  - [ ] IF applicant and NOT approved: `/pending-approval`
  - [ ] IF applicant and approved by admin: `/dashboard`
  - [ ] IF admin/staff: `/dashboard`
- [ ] Dashboard loads and shows correct user info
- [ ] User can navigate within dashboard
- [ ] Logout works correctly

---

## Test Scenario 6: Resend Verification Email

### User Actions:
```
1. Register new account
2. On email-sent page, click "Resend Email" button (if available)
3. OR: Use account recovery on login page
4. Check email for NEW verification link
5. Click the new link from email
```

### Expected Outcomes:
- [ ] New email is sent successfully
- [ ] New email has fresh verification link
- [ ] NEW verification link works and confirms email
- [ ] OLD verification link no longer works (returns error)
- [ ] Only ONE user profile created (no duplicates)

---

## Test Scenario 7: Role-Based Verification

### User Actions (Admin Registration - if allowed):
```
1. Register with admin role (through admin panel if available)
2. Complete email verification (as per Scenario 1)
3. Login with admin account
```

### Expected Outcomes:
- [ ] Email verification completes successfully
- [ ] After verification, admin can login
- [ ] Admin sees `/dashboard` (not `/pending-approval`)
- [ ] User profile has `role='admin'` (or whatever role)
- [ ] `is_approved` is TRUE for admin/staff (not applicant)

---

## Test Scenario 8: Database Verification

### Database Checks (requires direct DB access):
```sql
-- Check auth.users table
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE 'test-verify-%@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Check users profile table
SELECT 
  auth_user_id,
  email,
  role,
  is_approved,
  is_verified,
  email_confirmed_at
FROM users
WHERE email LIKE 'test-verify-%@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Results:
- [ ] **auth.users:**
  - `email_confirmed_at` is NOT NULL ✓
  - Timestamp is recent (within last few minutes)
  - Status shows "CONFIRMED"

- [ ] **users table:**
  - `role` = 'applicant' (for new users)
  - `is_approved` = FALSE (for applicant role)
  - `is_verified` = TRUE
  - `email_confirmed_at` matches auth.users value

---

## Browser Console Debugging Reference

### Success Logs (What You Should See):
```javascript
[AuthCallback] URL hash: #access_token=eyJ...
[AuthCallback] URL search: 
[AuthCallback] No session found, attempting to exchange code...
[AuthCallback] Found code in URL, exchanging for session...
[AuthCallback] Code exchange successful, session: true
[AuthCallback] Verified user: 550e8400-e29b-41d4-a716-446655440000 Email confirmed: true
[AuthCallback] Creating user profile...
[AuthCallback] Profile created successfully
[AuthCallback] Verification successful, redirecting to dashboard
```

### Error Logs (Troubleshooting):

**Problem:** "Email not confirmed"
```javascript
// Code exchange worked but email_confirmed_at is still null
[AuthCallback] Email not confirmed yet. email_confirmed_at: null
```
✓ **Action:** Check if Supabase auth settings are correct

---

**Problem:** "Code exchange error"
```javascript
[AuthCallback] Code exchange error: {error object}
// Likely: Code is expired, invalid, or already used
```
✓ **Action:** Register again for fresh link

---

**Problem:** "Session error"
```javascript
[AuthCallback] Session error: {error object}
```
✓ **Action:** Check Supabase Auth URL configuration

---

**Problem:** "Profile creation failed"
```javascript
[AuthCallback] Error creating profile: {error}
// Likely: RLS policy blocks insert, or user already exists
```
✓ **Action:** Check RLS policies on users table

---

## Performance Metrics to Monitor

| Metric | Target | Acceptable | Issue If |
|--------|--------|-----------|---------|
| Email delivery time | < 10 sec | < 30 sec | > 60 sec |
| Email verification link click-to-success | < 5 sec | < 10 sec | > 30 sec |
| Browser page load time | < 2 sec | < 5 sec | > 10 sec |
| Token exchange latency | < 2 sec | < 5 sec | > 10 sec |
| Profile creation speed | < 1 sec | < 3 sec | > 5 sec |

---

## Email Content Verification

When testing, verify these email elements:

```
✓ FROM: UCC IP Office <noreply@ucc-ipo.com>
✓ TO: Correct user email
✓ SUBJECT: "Verify Your Email - UCC IP Management System"
✓ HTML Header: "Welcome to UCC IP Management"
✓ Greeting: "Hello [Full Name],"
✓ Main CTA: "Verify Email Address" button (blue, with proper sizing)
✓ Link backup: Raw URL provided (copy-paste fallback)
✓ Security note: "If you did not create this account..."
✓ Footer: "University of Caloocan City Intellectual Property Office"
✓ Footer link: "ucc-ipo.com"
✓ Tagline: "Protecting Innovation, Promoting Excellence"
✓ No broken images or styling issues
✓ Mobile responsive (check on phone if possible)
```

---

## Load Testing (Optional - If High Volume Expected)

```powershell
# Test 5 concurrent registrations
for ($i=1; $i -le 5; $i++) {
  Write-Host "Testing registration #$i..."
  # Simulate registration via API or UI
  Start-Sleep -Milliseconds 500
}

# Monitor:
# - Supabase edge function logs for errors
# - Resend API rate limits (check dashboard)
# - Database performance
# - Email delivery queue status
```

---

## Sign-Off Checklist

When all tests pass, confirm:

- [ ] All 8 test scenarios completed successfully
- [ ] No TypeScript or compilation errors in build
- [ ] No JavaScript errors in browser console
- [ ] Database verification shows correct values
- [ ] Email formatting and delivery working
- [ ] User authentication flow unbroken
- [ ] Admin approval workflow still functional
- [ ] Performance metrics acceptable
- [ ] Ready for production deployment

---

## Test Report Template

```markdown
## Email Verification Testing Report

**Test Date:** YYYY-MM-DD  
**Tester:** [Your Name]  
**Environment:** [Local Dev / Production]  
**Build Version:** [Commit hash or version]

### Test Results Summary
- Scenario 1 (Happy Path): ✅ PASS / ❌ FAIL
- Scenario 2 (Link Expiration): ✅ PASS / ❌ FAIL
- Scenario 3 (Multiple Attempts): ✅ PASS / ❌ FAIL
- Scenario 4 (Invalid Link): ✅ PASS / ❌ FAIL
- Scenario 5 (Post-Verification Login): ✅ PASS / ❌ FAIL
- Scenario 6 (Resend Email): ✅ PASS / ❌ FAIL
- Scenario 7 (Role-Based): ✅ PASS / ❌ FAIL
- Scenario 8 (Database): ✅ PASS / ❌ FAIL

### Issues Found
1. [Issue description]
   - **Severity:** Low / Medium / High  
   - **Steps to reproduce:** ...
   - **Expected:** ...
   - **Actual:** ...

### Recommendations
- ...

### Sign-Off
- [ ] All critical tests passed
- [ ] Ready for production deployment
```

