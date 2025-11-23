# 🚀 PRODUCTION DEPLOYMENT GUIDE - Complete End-to-End

**Platform**: Windows PowerShell 5.1+
**Target Environment**: Supabase Cloud (Production)
**Status**: Final Production-Ready Guide
**Estimated Time**: 10-15 minutes

---

## 📋 Pre-Deployment Checklist

Before deploying to production, verify all of these:

### ✅ Code Quality
- [ ] All TypeScript compiles without errors: `npm run typecheck`
- [ ] All linting passes: `npm run lint`
- [ ] No `console.log()` statements left in production code
- [ ] All environment variables properly configured
- [ ] No hardcoded URLs or API keys in code

### ✅ Edge Functions
- [ ] All 11 functions have `index.ts` files
- [ ] All functions listed in `supabase/config.toml`
- [ ] Proper JWT settings in config.toml:
  - `register-user`: `verify_jwt = false`
  - `send-notification-email`: `verify_jwt = false`
  - All others: `verify_jwt = true`
- [ ] CORS configured: `[cors]` with `allowed_origins = ["*"]`

### ✅ Environment
- [ ] `.env` does NOT exist in repository (safety check)
- [ ] `.env.local` exists with correct values (local only)
- [ ] `.env.example` has all required variables
- [ ] `.gitignore` excludes `.env`, `node_modules`, `supabase/.temp`

### ✅ Git
- [ ] All changes committed: `git status` shows clean
- [ ] `.env` not tracked by git: `git ls-files .env` returns nothing
- [ ] Working on `main` branch
- [ ] All commits pushed to GitHub

---

## 🔧 STEP 1: Install Supabase CLI

### Prerequisites
- Node.js 18+ installed
- npm 8+ installed

### Installation (Windows PowerShell)

```powershell
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

**Output should show version number (e.g., "1.152.0")**

---

## 🔑 STEP 2: Authenticate with Supabase

### Get Access Token

1. Go to https://supabase.com/dashboard
2. Click your profile icon (top right) → Account Settings
3. Click "Access Tokens" in left sidebar
4. Click "Generate new token"
5. Name it "CLI Deployment"
6. Copy the token (long string)

### Login to CLI

```powershell
supabase login

# When prompted, paste your access token
# (It won't display as you type - that's normal)
# Press Enter
```

**Verification:**
```powershell
# Check if authenticated
supabase projects list

# Should show your projects including: mqfftubqlwiemtxpagps
```

---

## 🔗 STEP 3: Link Project

```powershell
# Navigate to project root
cd "c:\Users\delag\Desktop\ucc ipo\project\ucc-ipo-repo"

# Link to your Supabase project
supabase link --project-ref mqfftubqlwiemtxpagps

# When prompted, enter your database password (from Supabase dashboard)
```

**Verification:**
```powershell
supabase projects list
# Should show your project as "linked"
```

---

## 📋 STEP 4: Verify Deployment Readiness

```powershell
# Run verification script
.\verify-deployment.bat

# Should show ~87%+ passing
```

### Fix Any Failures

| Issue | Fix |
|-------|-----|
| Supabase CLI not found | Run: `npm install -g supabase` |
| Not linked to project | Run: `supabase link --project-ref mqfftubqlwiemtxpagps` |
| .env tracked by git | Run: `git rm --cached .env; git commit -m "remove .env from tracking"` |
| Functions missing | Check `supabase/functions/` folder structure |

---

## 🚀 STEP 5: Deploy Edge Functions

### Option A: Deploy Single Function (Test)

```powershell
# Deploy only register-user to test
supabase functions deploy register-user

# Wait for:
# ✓ Function register-user deployed successfully!
# Endpoint: https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user
```

### Option B: Deploy All Functions (Production)

```powershell
# Deploy all functions at once
supabase functions deploy

# Watch for each function deployment confirmation
```

### Option C: Force Redeploy

```powershell
# Force update if deployment fails
supabase functions deploy --force
```

---

## ✅ STEP 6: Verify Deployment

### Check All Functions are Active

```powershell
supabase functions list

# Should show all 11 functions with ✓ status
```

**Expected Output:**
```
Name                              Status
create-user                       ✓
generate-certificate              ✓
generate-pdf                      ✓
initialize-evaluators             ✓
register-user                     ✓
send-certificate-email            ✓
send-completion-notification      ✓
send-notification-email           ✓
send-status-notification          ✓
send-verification-code            ✓
verify-code                        ✓
```

### Test Specific Function

```powershell
# View recent logs
supabase functions logs register-user --limit 10

# Should show request logs, no 401/500 errors
```

### Manual Function Test

```powershell
# Test registration function
$body = @{
    email = "test@example.com"
    fullName = "Test User"
    password = "TestPass123"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

# Should return 200 with success message
$response.StatusCode
$response.Content | ConvertFrom-Json
```

---

## 💾 STEP 7: Commit & Push Changes

```powershell
# Stage all changes
git add .

# Commit deployment
git commit -m "deploy: Deploy edge functions to production"

# Push to GitHub
git push origin main

# Verify push
git log --oneline -3
```

---

## 🧪 STEP 8: Test Live Application

### Browser Testing

1. **Open** your live site: `https://your-domain`
2. **Navigate** to `/register` page
3. **Fill** registration form:
   - Email: `test@example.com`
   - Full Name: `Test User`
   - Password: `TestPassword123`
4. **Submit** form
5. **Verify**:
   - ✅ No 401 Unauthorized error
   - ✅ "Check your email" message appears
   - ✅ Email arrives with verification link
   - ✅ Click link works and verifies user
   - ✅ User can log in
   - ✅ Dashboard loads successfully

### Error Scenarios to Test

Test each error case to ensure proper handling:

```powershell
# 1. Invalid email format
# Browser: /register → enter "invalid" as email → Submit
# Expected: Clear error message

# 2. Weak password
# Browser: /register → password: "123" → Submit
# Expected: "Password must be 6+ characters"

# 3. Existing email
# Browser: /register → enter email used before → Submit
# Expected: "Email already exists"

# 4. Network error (offline test)
# Browser: DevTools → Network → Offline → Try register
# Expected: User-friendly error message
```

---

## 📊 STEP 9: Monitor Production

### Real-Time Logs

```powershell
# Watch live logs
supabase functions logs register-user --tail

# Follow all function logs
supabase functions logs --tail

# Stop with: Ctrl+C
```

### View Historical Logs

```powershell
# Last 50 function invocations
supabase functions logs register-user --limit 50

# Find errors
supabase functions logs | Select-String "error"

# Check timestamps
supabase functions logs register-user --tail --limit 100
```

### Check Error Rates

```powershell
# View logs and filter for errors
supabase functions logs | Select-String "status.*5[0-9][0-9]"

# Should show minimal to no 500 errors in production
```

---

## 🎯 STEP 10: Post-Deployment Checklist

After deployment is complete and tested:

- [ ] All 11 functions show Active status
- [ ] Registration workflow works end-to-end
- [ ] Email verification emails arrive
- [ ] Verification links work and login succeeds
- [ ] Dashboard loads after login
- [ ] No 401 Unauthorized errors in logs
- [ ] No 500 Server errors in logs
- [ ] All changes committed to GitHub
- [ ] Team notified of deployment
- [ ] Monitor logs for 24 hours for any issues

---

## 🆘 Troubleshooting

### Issue: 401 Unauthorized on Registration

**Cause**: `verify_jwt` not set to false

**Fix**:
```toml
# supabase/config.toml
[functions.register-user]
verify_jwt = false  # ← Must be false
```

Then redeploy:
```powershell
supabase functions deploy register-user --force
```

### Issue: Function Deployment Hangs

**Cause**: Network issue or Supabase service unavailable

**Fix**:
```powershell
# Check internet
Test-NetConnection supabase.com -Port 443

# Clear cache and retry
Remove-Item -Path .\supabase\.cache -Recurse -Force
Remove-Item -Path .\supabase\.temp -Recurse -Force

# Retry deployment
supabase functions deploy --force
```

### Issue: Email Not Sending

**Cause**: Email provider not configured or templates missing

**Fix**:
```powershell
# Check logs
supabase functions logs send-notification-email

# Verify email settings in Supabase dashboard:
# Settings → Email Templates → Verify configured

# May need to test with different email provider
```

### Issue: Can't Login to Supabase CLI

**Cause**: Invalid or expired token

**Fix**:
```powershell
# Logout and login again
supabase logout
supabase login

# Generate new access token at:
# https://supabase.com/dashboard/account/tokens
```

---

## 📈 Performance Monitoring

### Recommended Checks

Weekly:
```powershell
# Check for errors
supabase functions logs | Select-String "error" -Context 2

# View invocation counts
supabase functions logs | Measure-Object -Line
```

Monthly:
```powershell
# Full logs review
supabase functions logs --limit 1000

# Check for performance issues
supabase functions logs | Select-String "duration"

# Monitor error patterns
```

---

## 🔒 Security Post-Deployment

### Verify Security Settings

✅ Check in Supabase Dashboard:
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Auth tokens expire properly
- [ ] API rate limiting configured
- [ ] CORS only allows your domain
- [ ] Service role key not exposed
- [ ] Anon key used only for frontend

### Security Headers

```powershell
# Test CORS headers with curl
curl -H "Origin: https://your-domain" -I `
  https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user

# Should see proper CORS headers in response
```

---

## 🎉 Deployment Complete!

### Success Indicators

✅ All functions deployed and active
✅ Registration works without 401 errors
✅ Email verification system functional
✅ Users can complete full registration flow
✅ No errors in function logs
✅ Changes committed to GitHub
✅ Team notified

### Next Steps

1. **Monitor** logs daily for first week
2. **Gather** user feedback on registration
3. **Optimize** based on usage patterns
4. **Scale** functions if needed (auto-scales on Supabase)
5. **Plan** next feature deployment

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Edge Functions Guide**: https://supabase.com/docs/guides/functions
- **CLI Reference**: https://supabase.com/docs/guides/cli
- **Status Page**: https://status.supabase.com
- **Community**: https://discord.gg/supabase

---

## 📝 Quick Reference Commands

```powershell
# SETUP
supabase login
supabase link --project-ref mqfftubqlwiemtxpagps

# DEPLOYMENT
supabase functions deploy
supabase functions deploy --force

# VERIFICATION
supabase functions list
supabase functions logs register-user --tail

# TESTING
npm run typecheck
npm run lint
npm run build

# GIT
git add .; git commit -m "deploy"; git push

# CLEANUP
Remove-Item -Path .\supabase\.cache -Recurse -Force
Remove-Item -Path .\supabase\.temp -Recurse -Force
```

---

## 📅 Deployment Timeline

| Step | Time | Status |
|------|------|--------|
| Prerequisites Check | 2 min | ✓ |
| Supabase CLI Setup | 3 min | ✓ |
| Authentication | 1 min | ✓ |
| Project Link | 1 min | ✓ |
| Deployment | 2-3 min | ✓ |
| Verification | 2 min | ✓ |
| Testing | 3 min | ✓ |
| **Total** | **~15 min** | ✓ |

---

**Created**: November 23, 2025
**Platform**: Windows PowerShell
**Version**: 1.0
**Status**: 🟢 Ready for Production Deployment

---

### 🎯 Final Command to Deploy

```powershell
# Run this complete deployment workflow
supabase login; `
supabase link --project-ref mqfftubqlwiemtxpagps; `
supabase functions deploy; `
supabase functions list; `
npm run typecheck; `
git add .; `
git commit -m "deploy: Production deployment of edge functions"; `
git push
```

**Then test in browser at**: `https://your-domain/register`
