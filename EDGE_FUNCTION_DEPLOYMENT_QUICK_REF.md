# Email Verification Edge Function Deployment - Quick Reference

## Files Changed

**File:** `supabase/functions/register-user/index.ts`  
**Lines:** 264-270  
**Change:** Fixed `redirectTo` to point to frontend app instead of Supabase internal callback

---

## Quick Deployment Steps

### PowerShell Instructions

```powershell
# 1. Navigate to project directory
Set-Location "c:\Users\delag\Desktop\ucc ipo\project"

# 2. Login to Supabase CLI (if not already logged in)
supabase login

# 3. Deploy the updated edge function
supabase functions deploy register-user

# 4. Set the APP_URL environment variable
# Option A: Via CLI
supabase secrets set APP_URL="https://ucc-ipo.com"

# Option B: Via Supabase Dashboard (recommended if CLI has issues):
# - Go to Project Settings → Edge Functions
# - Click on "register-user" function
# - Go to Environment Variables tab
# - Add/Update: APP_URL = "https://ucc-ipo.com"
```

---

## Verify Deployment

### Check Function Deployment Status

```powershell
# View deployed functions
supabase functions list

# Should show: register-user ... Active
```

### Check Environment Variables

In Supabase Dashboard:
1. **Project Settings** → **Edge Functions**
2. Click **register-user**
3. Go to **Environment Variables** tab
4. Verify these are set:
   - `APP_URL`: `https://ucc-ipo.com` (or your domain)
   - `RESEND_API_KEY`: ✓ Should already exist
   - `RESEND_FROM_EMAIL`: ✓ Should already exist

### Verify Supabase Auth Configuration

In Supabase Dashboard:
1. **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, verify these are listed:
   - `https://ucc-ipo.com/auth/callback`
   - `https://app.ucc-ipo.com/auth/callback` (if using app subdomain)
   - `http://localhost:5173/auth/callback` (for local development)

---

## What Was Actually Changed

### Before (Broken):
```typescript
const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: {
    redirectTo: `${supabaseUrl.replace('/rest/v1', '')}/auth/v1/callback?type=magiclink`,
  },
});
```

**Problem:** Redirected to Supabase's internal callback endpoint instead of frontend

### After (Fixed):
```typescript
const appUrl = Deno.env.get("APP_URL") || "https://ucc-ipo.com";

const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: {
    redirectTo: `${appUrl}/auth/callback`,
  },
});
```

**Solution:** Redirects to frontend's `/auth/callback` where token can be properly exchanged

---

## Testing Email Verification After Deployment

### Test 1: Verify Email is Sent Correctly

1. Go to your app and register
2. Check email for verification link
3. **Link should now point to:** `https://ucc-ipo.com/auth/callback?...` (not supabase.co)

### Test 2: Verify Token Exchange Works

1. Click the verification link
2. Open browser console (F12 → Console)
3. Look for these success logs:
   ```
   [AuthCallback] URL hash: #access_token=...
   [AuthCallback] Code exchange successful, session: true
   [AuthCallback] Verified user: [user-id] Email confirmed: true
   ```

### Test 3: Verify Login Works

1. After email verification succeeds
2. Go to /login
3. Enter email and password
4. Should login WITHOUT "Email not confirmed" error
5. Should see pending approval page (new applicants)

---

## Rollback (If Needed)

If deployment causes issues and you need to revert:

```powershell
# The previous version would have hadredirectTo pointing to Supabase's internal callback
# To rollback:
# 1. Edit supabase/functions/register-user/index.ts
# 2. Change redirectTo back to: `${supabaseUrl.replace('/rest/v1', '')}/auth/v1/callback?type=magiclink`
# 3. Run: supabase functions deploy register-user
```

---

## Environment Variable Defaults

The edge function has fallback values:
- `APP_URL`: Defaults to `https://ucc-ipo.com` if not set
- `RESEND_FROM_EMAIL`: Defaults to `noreply@ucc-ipo.com` if not set
- `RESEND_API_KEY`: Required - no fallback (function will error if not set)

**Recommendation:** Always explicitly set `APP_URL` for clarity

---

## Supabase Project Configuration Checklist

- [ ] `RESEND_API_KEY` environment variable is set
- [ ] `APP_URL` environment variable is set to production domain
- [ ] Redirect URLs include `/auth/callback` endpoint
- [ ] Edge function `register-user` has been deployed
- [ ] Test registration email goes to correct Resend account
- [ ] Test verification link points to frontend domain

---

## Troubleshooting If Edge Function Deployment Fails

### Issue: "Function deployment failed"

```powershell
# Check login status
supabase projects list

# If not authenticated, login
supabase login

# Try deploying again
supabase functions deploy register-user
```

### Issue: "Cannot set environment variables"

Use Supabase Dashboard instead of CLI:
1. **Project Settings** → **Edge Functions**
2. Click **register-user**
3. Go to **Environment Variables** tab
4. Add/Update variables manually

### Issue: "Function works but emails still fail"

Check Resend configuration:
1. Supabase Dashboard → **Edge Functions**
2. Click **register-user**
3. Check **Logs** for errors
4. Verify `RESEND_API_KEY` is valid (not expired)

---

## Monitoring

After deployment, monitor these in the first 24 hours:

1. **Registration attempts** - Check Supabase function logs
2. **Email delivery** - Check Resend dashboard for bounces
3. **Verification success rate** - Monitor /auth/callback loads
4. **Login errors** - Check browser console for email confirmation errors

---

## Summary

✅ **Frontend changes:** Already deployed (npm run build succeeded)  
✅ **Backend edge function:** Ready to deploy (register-user/index.ts updated)  
✅ **Build verification:** No TypeScript errors found  
⏳ **Pending:** Deploy edge function to Supabase + set APP_URL environment variable

