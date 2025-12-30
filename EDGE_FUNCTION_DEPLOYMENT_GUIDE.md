# Edge Function Deployment Guide

## Current Status - URGENT

**PDF Generation for Legacy Records is Failing**
- Disclosure function: 500 Internal Server Error
- Certificate function: 400 Bad Request

**Root Cause**: Edge functions have been fixed in code but not redeployed to Supabase

---

## Functions That Need Redeployment

1. **generate-disclosure-legacy**
   - Fixed database column name: `ip_record_id` → `record_id`
   - Added detailed logging
   - Better error handling

2. **generate-certificate-legacy**
   - Relaxed `user_id` validation (optional, no UUID requirement)
   - Fixed database column name: `ip_record_id` → `record_id`
   - Added detailed logging
   - Better error handling

---

## Prerequisites

1. **Supabase CLI** installed:
   ```powershell
   npm install -g supabase
   ```

2. **Authentication**: Login to Supabase
   ```powershell
   supabase login
   ```
   - When prompted, go to https://app.supabase.com/account/tokens
   - Create a new access token and paste it

3. **Project Directory**:
   ```powershell
   cd "c:\Users\delag\Desktop\ucc ipo\project"
   ```

---

## Step 1: Link Your Supabase Project

```powershell
supabase link --project-ref mqfftubqlwiemtxpagps
```

When prompted, enter your database password.

---

## Step 2: Deploy the Legacy PDF Functions

### Option A: Deploy Only the Legacy Functions (Recommended)

```powershell
supabase functions deploy generate-disclosure-legacy
supabase functions deploy generate-certificate-legacy
```

**Expected Output:**
```
✓ Function generate-disclosure-legacy deployed successfully!
✓ Function generate-certificate-legacy deployed successfully!
```

### Option B: Deploy All Functions

```powershell
supabase functions deploy
```

---

## Step 3: Verify Deployment

### Check Function Status in Dashboard
1. Go to https://app.supabase.com
2. Select your project (UCC IP Office)
3. Go to **Edge Functions** in sidebar
4. Look for:
   - `generate-disclosure-legacy` - should show recent deployment time
   - `generate-certificate-legacy` - should show recent deployment time

### Check via CLI
```powershell
supabase functions list
```

Look for both functions with status "Deployed"

---

## Step 4: Test PDF Generation

1. Go to your app: `/dashboard/legacy-records`
2. Open any legacy record
3. Scroll to "Generate Documents" section
4. Click "Generate Disclosure"
   - Should see "Disclosure generated successfully!" message
   - PDF should appear in "Generated Documents" section
5. Click "Generate Certificate"
   - Should see "Certificate generated successfully!" message
   - PDF should appear in "Generated Documents" section

---

## Troubleshooting

### Authentication Error
```
Error: Failed to get access token
```
**Solution:**
- Go to https://app.supabase.com/account/tokens
- Create new access token
- Run `supabase logout` then `supabase login` again
- Paste the new token

### Project Link Error
```
Error: Project not found
```
**Solution:**
- Verify project ref is correct: `mqfftubqlwiemtxpagps`
- Make sure you're in the right project directory

### Function Still Errors After Deployment

Check logs:
1. Supabase Dashboard > Edge Functions
2. Click on the function name
3. Go to **Logs** tab
4. Look for error messages

Common issues:
- `legacy-generated-documents` bucket doesn't exist
- RLS policies blocking writes
- Database columns don't match

### Deployment Hangs

Press `Ctrl+C` to cancel, then retry:
```powershell
supabase functions deploy generate-disclosure-legacy --force
```

---

## Next Steps After Successful Deployment

1. **Test PDF Generation** - Follow Step 4 above
2. **Check Document Storage** - PDFs should be in `legacy-generated-documents` bucket
3. **Verify Database** - Documents should appear in `legacy_record_documents` table
4. **Test Download** - Click "Download" on generated PDFs

---

## Additional Commands

### Redeploy a Single Function with Latest Code
```powershell
supabase functions deploy generate-disclosure-legacy --force
supabase functions deploy generate-certificate-legacy --force
```

### View Function Logs
```powershell
supabase functions logs generate-disclosure-legacy
supabase functions logs generate-certificate-legacy
```

### Delete and Redeploy
```powershell
supabase functions delete generate-disclosure-legacy
supabase functions deploy generate-disclosure-legacy
```

---

## Project Information

- **Project Name**: UCC IP Office
- **Project Ref**: `mqfftubqlwiemtxpagps`
- **Repository**: https://github.com/JeromeLamarr/ucc-ipo-repo
- **Functions Location**: `supabase/functions/`
- **Related Files**:
  - `supabase/functions/generate-disclosure-legacy/index.ts`
  - `supabase/functions/generate-certificate-legacy/index.ts`

---

## Overview

```bash
supabase functions list
```

You should see `register-user` with status ✓

### Test the Function
```bash
curl -X POST https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "password": "TestPassword123",
    "affiliation": "Test Dept"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created successfully. Check your email for the verification link."
}
```

---

## Step 4: Push Changes to GitHub

```bash
git add .
git commit -m "fix: Fix 401 Unauthorized error in register-user edge function

- Add verify_jwt = false to config.toml for register-user
- Improve error handling and validation in edge function
- Replace raw fetch() with supabase.functions.invoke()
- Add comprehensive input validation
- Support unauthenticated access for new user registration"

git push
```

---

## What Changed

### Backend Changes

1. **supabase/config.toml** (NEW)
   - Added `verify_jwt = false` for `register-user` function
   - Allows unauthenticated access to registration endpoint
   - Configured CORS headers

2. **supabase/functions/register-user/index.ts**
   - Improved error handling with proper HTTP status codes
   - Added input validation
   - Better JSON parsing error handling
   - Comprehensive response messages
   - Graceful email failure handling

### Frontend Changes

1. **src/pages/RegisterPage.tsx**
   - Replaced raw `fetch()` with `supabase.functions.invoke()`
   - Added supabase import
   - Improved error handling
   - Both register and resend functions updated

### Configuration

1. **.env.example**
   - Updated with clear comments
   - Explains public key safety

---

## Troubleshooting

### Error: "401 Unauthorized"

**Solution**: 
1. Verify `supabase/config.toml` contains `verify_jwt = false` for register-user
2. Redeploy function: `supabase functions deploy register-user`
3. Wait 30 seconds for deployment to complete

### Error: "Missing required fields"

**Solution**:
- Ensure you're sending: `email`, `fullName`, `password`
- Check JSON formatting in request body

### Error: "Failed to send verification email"

**Solution**:
1. Check Supabase email provider configuration
2. Verify email template is enabled
3. Check function logs: `supabase functions logs register-user --limit 20`

### Function Not Updating

**Solution**:
```bash
# Force redeploy
supabase functions deploy register-user --force
```

---

## Testing Workflow

### 1. Local Development

```bash
# Start Supabase locally (optional)
supabase start

# In another terminal, run the app
npm run dev
```

### 2. Live Testing

1. Visit registration page
2. Fill form with test email
3. Submit registration
4. Check email for verification link
5. Click link to verify
6. Access dashboard

### 3. Function Logs

```bash
# View real-time logs
supabase functions logs register-user --follow

# View last N logs
supabase functions logs register-user --limit 20
```

---

## Verification Checklist

After deployment, verify:

- [ ] No 401 Unauthorized errors
- [ ] Registration form submits successfully
- [ ] Email is sent with verification link
- [ ] Verification link works
- [ ] User can log in after verification
- [ ] Dashboard is accessible
- [ ] Error messages are user-friendly
- [ ] Function logs show no errors

---

## Rollback Plan

If something goes wrong:

### Rollback to Previous Version

```bash
git revert HEAD
git push
```

Then redeploy:

```bash
supabase functions deploy register-user
```

---

## Monitoring

### Check Function Performance
```bash
supabase functions logs register-user --tail
```

### Monitor Error Rate
- Check Supabase dashboard: Functions → Logs
- Look for status codes 400, 409, 500
- Verify user feedback

---

## Next Steps

1. **Deploy**: Run the deployment commands above
2. **Test**: Follow the testing workflow
3. **Monitor**: Watch the logs for issues
4. **Announce**: Let users know registration is working

---

## Command Summary

```bash
# Quick deployment
supabase functions deploy register-user

# With verification
supabase functions deploy register-user && supabase functions list

# Full deployment pipeline
supabase functions deploy register-user && \
git add . && \
git commit -m "fix: Deploy register-user edge function update" && \
git push
```

---

**Status**: Ready to deploy ✅
**Last Updated**: 2025-11-23
**Version**: 1.0
