# Quick Test Guide - Email Verification Fix

## ✅ Fix Deployed - Ready to Test

All changes have been deployed. Follow this quick test to verify the fix works.

---

## 5-Minute Test

### Step 1: Register New Account
1. Go to `/register`
2. Fill in:
   - **Email:** Use a real email you can access
   - **Full Name:** Test User
   - **Password:** test123 (or any 6+ chars)
   - **Department:** Select any
3. Click **Register**
4. ✅ Should see: "Account created successfully. Please check your email to verify your account."

### Step 2: Check Email
1. Open your email inbox
2. ✅ Should receive **ONLY ONE** email from Supabase
3. ✅ Subject: "Confirm your signup" (or similar from Supabase)
4. ❌ Should **NOT** receive second email from UCC IP Office

### Step 3: Verify Email
1. Click **"Confirm Email"** button in email
2. Browser opens and redirects to `/auth/callback`
3. ✅ Should see loading spinner
4. ✅ Should see: "Email verified successfully!"
5. ✅ Should automatically redirect to dashboard

### Step 4: Verify Login Works
1. After redirect, should be on dashboard
2. OR if redirected elsewhere, go to `/login`
3. Login with your test email and password
4. ✅ Should login successfully
5. ❌ Should **NOT** see "Email not confirmed" error

### Step 5: Check Database (Optional)
```sql
-- Replace with your test email
SELECT
  u.email,
  u.role,
  u.is_verified,
  u.is_approved,
  au.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.users u
JOIN auth.users au ON au.id = u.auth_user_id
WHERE u.email = 'your-test@email.com';
```

✅ Expected result:
- `role`: applicant
- `is_verified`: true
- `is_approved`: false
- `email_confirmed`: true

---

## What to Look For

### ✅ Success Indicators
- Only ONE verification email received
- Email is from Supabase (not custom UCC email)
- Verification link works on first click
- No "Verification Failed" error
- No "Database error" in URL
- Login works without "Email not confirmed"
- Console shows successful verification logs

### ❌ Failure Indicators
- Two verification emails received
- "Verification Failed" on callback page
- URL contains `error=server_error`
- "Email not confirmed" error on login
- Console shows errors about profile creation

---

## Debug Mode (If Issues Occur)

### Enable Console Logging
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform registration → email verification
4. Look for logs starting with `[AuthCallback]`

### Expected Console Output
```
[AuthCallback] Callback triggered
[AuthCallback] Has hash: true
[AuthCallback] Has search: true
[AuthCallback] Detected flow: { hasTokenHash: true, type: 'signup', ... }
[AuthCallback] Attempting OTP verification (Supabase confirmation email)...
[AuthCallback] OTP verification successful
[AuthCallback] Session established for user: <uuid>
[AuthCallback] Email confirmed: <email>
[AuthCallback] Waiting for profile creation by trigger...
[AuthCallback] Profile found: { id: <uuid>, role: 'applicant', ... }
[AuthCallback] Email verification complete, profile ready
```

---

## Common Issues & Solutions

### Issue: "Verification Failed"
**Check:**
- Browser console for specific error
- Supabase logs for trigger errors

### Issue: Profile Not Created
**Check:**
```sql
-- Look for orphaned auth users
SELECT a.id, a.email, a.email_confirmed_at
FROM auth.users a
LEFT JOIN public.users u ON u.auth_user_id = a.id
WHERE a.email = 'your-test@email.com';
```

### Issue: Still Getting Two Emails
**Check:**
- Edge function deployment status
- Edge function logs for "Supabase will send confirmation email automatically"

---

## Quick Verification Commands

### Check Trigger Status
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_verified';
-- Should show: on_auth_user_verified | O
```

### Check Recent Registrations
```sql
SELECT
  u.email,
  u.created_at,
  u.is_verified,
  u.is_approved
FROM users u
ORDER BY u.created_at DESC
LIMIT 5;
```

---

## Report Test Results

After testing, report:

✅ **Success:**
- "Registered test@example.com"
- "Received 1 email only"
- "Verification worked"
- "Login successful"

❌ **Failure:**
- What step failed
- Error messages seen
- Console logs
- Screenshots if possible

---

**Time to Test:** ~5 minutes
**Last Updated:** 2026-02-26
