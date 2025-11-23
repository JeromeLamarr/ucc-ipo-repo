# Edge Function Redeployment Guide

## Overview
The `register-user` edge function has been updated with improved error handling and JWT configuration changes. Follow this guide to redeploy the function.

---

## Prerequisites

1. **Supabase CLI** installed: `npm install -g supabase`
2. **Authentication**: Logged in to Supabase CLI
3. **Project Directory**: Navigate to your project root

---

## Step 1: Link Your Supabase Project (If Not Already Linked)

```bash
supabase link --project-ref mqfftubqlwiemtxpagps
```

When prompted, enter your database password or access token.

---

## Step 2: Deploy the Edge Function

### Option A: Deploy Only the `register-user` Function

```bash
supabase functions deploy register-user
```

**Expected Output:**
```
✓ Function register-user deployed successfully!
  Endpoint: https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user
```

### Option B: Deploy All Functions

```bash
supabase functions deploy
```

---

## Step 3: Verify Deployment

### Check Function Status
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
