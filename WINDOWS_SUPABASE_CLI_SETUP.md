# 🚀 Supabase CLI Setup & Edge Function Deployment Guide for Windows

**Platform**: Windows PowerShell 5.1+
**Supabase CLI**: Latest version
**Status**: Complete Production-Ready Guide

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase CLI Installation](#supabase-cli-installation)
3. [Project Link & Configuration](#project-link--configuration)
4. [Edge Function Deployment](#edge-function-deployment)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)

---

## ✅ Prerequisites

### System Requirements
- **Windows 10/11** with PowerShell 5.1 or higher
- **Node.js 18+** (npm/npx available)
- **Git** installed and configured
- **Internet connection** for Supabase Cloud

### Check Prerequisites
```powershell
# Check PowerShell version (should be 5.1 or higher)
$PSVersionTable.PSVersion

# Check Node.js
node --version
npm --version

# Check Git
git --version
```

### Required Credentials
Before starting, gather from [Supabase Dashboard](https://supabase.com/dashboard):
- Supabase Project URL
- Supabase Project Ref (e.g., `mqfftubqlwiemtxpagps`)
- Supabase Access Token (create in Settings → Access Tokens)

---

## 🔧 Supabase CLI Installation

### Option 1: Using npm (Recommended)

```powershell
# Install globally
npm install -g supabase

# Verify installation
supabase --version

# Login to Supabase
supabase login
```

**When prompted for your access token:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Create a new personal access token
3. Copy and paste into PowerShell (it won't show as you type - that's normal)
4. Press Enter

### Option 2: Using Scoop (Alternative)

```powershell
# If you have Scoop installed
scoop install supabase

# Verify
supabase --version
```

### Option 3: Direct Download (Manual)

1. Go to https://github.com/supabase/cli/releases
2. Download latest `supabase_windows_amd64.zip`
3. Extract to a folder (e.g., `C:\supabase`)
4. Add folder to PATH:
   - Win+X → System → Advanced system settings
   - Environment Variables → Edit PATH → Add: `C:\supabase`
5. Restart PowerShell and verify:
   ```powershell
   supabase --version
   ```

---

## 🔗 Project Link & Configuration

### Link to Your Supabase Project

```powershell
# Navigate to your project root
cd "c:\Users\delag\Desktop\ucc ipo\project\ucc-ipo-repo"

# Link to Supabase project
supabase link --project-ref mqfftubqlwiemtxpagps
```

**When prompted:**
- Enter your Supabase database password
- Or use an access token

### Verify Project Link

```powershell
# Check linked project
supabase projects list

# Should show your project with ref: mqfftubqlwiemtxpagps
```

### Check config.toml

```powershell
# View your supabase/config.toml
cat supabase\config.toml
```

Should contain all function configurations:
```toml
[functions.register-user]
verify_jwt = false

[functions.send-notification-email]
verify_jwt = false

# ... other functions
```

---

## 🚀 Edge Function Deployment

### Verify All Functions Exist

```powershell
# Check all edge functions
Get-ChildItem -Path supabase\functions -Directory | ForEach-Object { "Function: $($_.Name)" }
```

Should show:
```
Function: register-user
Function: send-notification-email
Function: generate-certificate
Function: send-verification-code
Function: verify-code
Function: create-user
Function: generate-pdf
Function: send-certificate-email
Function: send-completion-notification
Function: send-status-notification
Function: initialize-evaluators
```

### Deploy Single Function

```powershell
# Deploy register-user function
supabase functions deploy register-user

# Expected output:
# ✓ Function register-user deployed successfully!
# Endpoint: https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user
```

### Deploy All Functions

```powershell
# Deploy all functions at once
supabase functions deploy

# Will deploy each function and show status
```

### Deploy with Force Update

```powershell
# Force update if deployment fails
supabase functions deploy register-user --force

# Or all functions
supabase functions deploy --force
```

---

## ✅ Verification & Testing

### Check Deployed Functions

```powershell
# List all deployed functions
supabase functions list

# Should show status ✓ for all functions
```

### View Function Logs

```powershell
# View logs for specific function
supabase functions logs register-user

# View with live feed (--tail for continuous)
supabase functions logs register-user --tail

# View specific number of logs
supabase functions logs register-user --limit 20
```

### Test Function with curl

```powershell
# Test register-user function
$body = @{
    email = "test@example.com"
    fullName = "Test User"
    password = "TestPassword123"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

$response.Content | ConvertFrom-Json | Format-List
```

### Expected Success Response
```json
{
  "success": true,
  "message": "Account created successfully. Check your email for the verification link."
}
```

### Expected Error Responses
```json
{
  "success": false,
  "error": "Email already exists"
}
```

---

## 🆘 Troubleshooting

### Error: "Supabase CLI not found"

```powershell
# Install if missing
npm install -g supabase

# Or check PATH
$env:Path

# Close and reopen PowerShell after installation
```

### Error: "Not linked to a Supabase project"

```powershell
# Link to project again
supabase link --project-ref mqfftubqlwiemtxpagps

# Check if linked
supabase projects list
```

### Error: "401 Unauthorized on function call"

**Solution**: This is expected for unauthenticated endpoints. Verify in config.toml:
```toml
[functions.register-user]
verify_jwt = false  # ← This should be false
```

If false is set, error might be different. Check logs:
```powershell
supabase functions logs register-user
```

### Error: "Function deployment failed"

```powershell
# Check if index.ts exists in function folder
Test-Path supabase\functions\register-user\index.ts

# If not, function won't deploy

# Try force redeploy
supabase functions deploy register-user --force
```

### Error: "Connection timeout"

```powershell
# Check internet connection
Test-NetConnection supabase.com -Port 443

# If offline, wait for connection
# If online but still failing, check firewall/proxy settings
```

### Clear Supabase Cache

```powershell
# Remove local Supabase cache if issues persist
Remove-Item -Path .\supabase\.cache -Recurse -Force
Remove-Item -Path .\supabase\.temp -Recurse -Force

# Relink project
supabase link --project-ref mqfftubqlwiemtxpagps
```

---

## 🌍 Production Deployment

### Pre-Production Checklist

```powershell
# 1. Verify all functions exist
Get-ChildItem -Path supabase\functions -Directory

# 2. Check config.toml is complete
Select-String "^\[functions\." supabase\config.toml

# 3. Verify .env variables are set
type .env.local | Select-String "VITE_SUPABASE"

# 4. Run type check
npm run typecheck

# 5. Run linting
npm run lint
```

### Production Deployment Steps

```powershell
# 1. Ensure all changes are committed
git status

# 2. Deploy all functions
supabase functions deploy

# 3. Verify deployment
supabase functions list

# 4. Check logs for errors
supabase functions logs --limit 50

# 5. Test live function
$response = Invoke-WebRequest `
  -Uri "https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body (@{
    email = "prod-test@example.com"
    fullName = "Production Test"
    password = "TestPass123"
  } | ConvertTo-Json)

$response.StatusCode  # Should be 200
$response.Content | ConvertFrom-Json
```

### Post-Deployment Verification

```powershell
# 1. Test registration flow
# Go to your live site: https://your-domain/register

# 2. Try registering with test account

# 3. Check email for verification link

# 4. Click link and log in

# 5. Verify dashboard loads

# 6. Check logs for any errors
supabase functions logs --limit 100

# 7. Monitor for 24 hours before announcing
```

---

## 📱 Quick Reference Commands

```powershell
# ===== SETUP =====
supabase login
supabase link --project-ref mqfftubqlwiemtxpagps
npm install

# ===== DEVELOPMENT =====
npm run dev
supabase functions serve

# ===== DEPLOYMENT =====
supabase functions deploy register-user
supabase functions deploy

# ===== VERIFICATION =====
supabase functions list
supabase functions logs register-user --tail

# ===== GIT =====
git add .; git commit -m "deploy functions"; git push

# ===== CLEANUP =====
Remove-Item -Path .\supabase\.temp -Recurse -Force
Remove-Item -Path .\supabase\.cache -Recurse -Force
```

---

## 🎯 Complete Deployment Workflow

### Full End-to-End (5 minutes)

```powershell
# 1. Navigate to project
cd "c:\Users\delag\Desktop\ucc ipo\project\ucc-ipo-repo"

# 2. Ensure linked
supabase link --project-ref mqfftubqlwiemtxpagps

# 3. Deploy functions
supabase functions deploy

# 4. Verify deployment
supabase functions list

# 5. Commit and push
git add .; git commit -m "deploy: Deploy edge functions to production"; git push

# 6. Test live site
# Open: https://your-domain/register

echo "✅ Deployment complete!"
```

---

## 📚 Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Deno Docs](https://docs.deno.com/)
- [Project Settings](https://supabase.com/dashboard/project/_/settings/api)

---

## ✨ Summary

### What This Guide Covers
✅ Installing Supabase CLI on Windows
✅ Linking your Supabase project
✅ Deploying edge functions
✅ Verifying deployments
✅ Testing functions
✅ Troubleshooting common issues
✅ Production deployment workflow

### Key PowerShell Commands
✅ Uses `;` instead of `&&` for command chaining
✅ Uses `Get-ChildItem` instead of `ls`
✅ Uses `Remove-Item` instead of `rm`
✅ Uses PowerShell native commands where possible

### Success Indicators
✅ `supabase functions list` shows all functions Active
✅ Logs show no 401 or 500 errors
✅ Registration flow works end-to-end
✅ Email verification link arrives and works
✅ Dashboard accessible after verification

---

**Created**: November 23, 2025
**Platform**: Windows PowerShell 5.1+
**Status**: 🟢 Production Ready
**Next Step**: Run deployment commands above
