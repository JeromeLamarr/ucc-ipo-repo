# 🔧 DIAGNOSIS: Registration Error "Failed to create account"

## Current Error Status
**Browser Shows**: "Failed to create account. Please try again."
**Root Cause**: Unknown (need to check logs)

---

## 🎯 MOST LIKELY CAUSES (In Order)

### 1. ⚠️ **Edge Function NOT Deployed** (Most Likely)
The registration form is calling `supabase.functions.invoke('register-user')`, but the function might not be deployed to Supabase Cloud yet.

**Quick Check**:
```powershell
# Install Supabase CLI first
npm install -g supabase

# Then check if functions are deployed
supabase functions list

# If register-user doesn't show ✓, it's not deployed
```

**Solution**: Deploy the function
```powershell
supabase login
supabase link --project-ref mqfftubqlwiemtxpagps
supabase functions deploy register-user
```

---

### 2. 🔑 **Missing Environment Variables in Edge Function**
The edge function needs access to Supabase service credentials.

**What it needs**:
- `SUPABASE_URL` - Set automatically by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Needs to be configured

**Check in Supabase Dashboard**:
1. Go: https://supabase.com/dashboard/project/[your-project]/settings/functions
2. Ensure both variables are set
3. If not, add them manually

---

### 3. 🚫 **Incorrect Function Endpoint**
The frontend might be calling the wrong URL or the function might be misconfigured.

**Verify in Browser DevTools**:
```
1. Open: https://university-intellect-dq14.bolt.host/register
2. Press: F12 (Developer Tools)
3. Go to: Network tab
4. Try to register
5. Look for: POST request to supabase function
6. Check: Status code and response
```

**Expected**:
- Status: 200 or 400 (not 401 or 500)
- Response: `{ "success": true/false, "error": "..." }`

---

### 4. ⚙️ **config.toml Not Deployed**
The `verify_jwt = false` setting for `register-user` might not be active.

**Check**:
```powershell
# Verify it's in the file
cat supabase\config.toml | Select-String "register-user" -A 2

# Should show:
# [functions.register-user]
# verify_jwt = false
```

**Deploy it**:
```powershell
supabase functions deploy --force
```

---

## 🔍 STEP-BY-STEP DIAGNOSIS

### Step 1: Open Browser DevTools
```
1. Press F12 on the registration page
2. Go to Console tab
3. Try to register
4. Look for error messages
5. Copy any errors shown
```

### Step 2: Check Network Activity
```
1. Go to Network tab
2. Register to try submit
3. Find POST request to supabase edge function
4. Click on it
5. Check "Response" tab for error details
```

### Step 3: Check Supabase Deployment
```powershell
# Install CLI if needed
npm install -g supabase

# Authenticate
supabase login

# Check functions
supabase functions list

# View logs
supabase functions logs register-user --limit 30
```

---

## 📋 QUICK FIXES (Try in Order)

### Fix 1: Deploy the Function
```powershell
supabase functions deploy register-user
# Wait for: ✓ Function register-user deployed successfully!
```

### Fix 2: Force Redeploy
```powershell
supabase functions deploy --force
```

### Fix 3: Check Configuration
```powershell
# Verify config.toml
cat supabase\config.toml

# Should have:
# [functions.register-user]
# verify_jwt = false
```

### Fix 4: Verify Environment Variables
In Supabase Dashboard:
- Settings → Functions
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

---

## 📱 FULL DEBUGGING PROCESS

### 1. Install & Setup CLI
```powershell
npm install -g supabase
supabase login
supabase link --project-ref mqfftubqlwiemtxpagps
```

### 2. Deploy Functions
```powershell
supabase functions deploy
supabase functions list
```

### 3. Check Logs
```powershell
supabase functions logs register-user --tail
# Leave running and try to register in browser
# Watch for errors in real-time
```

### 4. Test with curl
```powershell
$body = @{
    email = "test@example.com"
    fullName = "Test User"
    password = "TestPassword123"
} | ConvertTo-Json

$response = Invoke-WebRequest `
  -Uri "https://mqfftubqlwiemtxpagps.supabase.co/functions/v1/register-user" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body `
  -SkipHttpErrorCheck

$response.StatusCode
$response.Content | ConvertFrom-Json
```

---

## 🎯 WHAT TO DO NOW

### Immediate Actions
1. [ ] Install Supabase CLI: `npm install -g supabase`
2. [ ] Authenticate: `supabase login`
3. [ ] Link project: `supabase link --project-ref mqfftubqlwiemtxpagps`
4. [ ] Deploy: `supabase functions deploy`
5. [ ] Check: `supabase functions list`

### Then Test
1. [ ] Open browser DevTools (F12)
2. [ ] Go to Console tab
3. [ ] Try registration again
4. [ ] Look for error messages
5. [ ] Share the error details

### If Still Not Working
1. [ ] Run: `supabase functions logs register-user --limit 50`
2. [ ] Look for any error messages in logs
3. [ ] Verify environment variables in Supabase dashboard
4. [ ] Check config.toml has `verify_jwt = false`

---

## 📊 COMMON ERROR MESSAGES & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | JWT verification required | `verify_jwt = false` in config.toml |
| Missing Supabase configuration | Env vars not set | Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Supabase |
| Email already exists | User registered before | Use different email or check database |
| Invalid request body | JSON parsing error | Check form sends all required fields |
| Failed to create auth user | Auth error in Supabase | Check Supabase dashboard auth settings |

---

## ✅ SUCCESS INDICATORS

When fixed, you should see:
1. ✓ No 401 error
2. ✓ "Check your email" message appears
3. ✓ Email arrives with verification link
4. ✓ Click link works
5. ✓ User can log in
6. ✓ Dashboard loads

---

## 🚨 NEXT STEPS

**DO THIS NOW**:
```powershell
# 1. Install CLI
npm install -g supabase

# 2. Setup
supabase login
supabase link --project-ref mqfftubqlwiemtxpagps

# 3. Deploy
supabase functions deploy

# 4. Verify
supabase functions list

# 5. Watch logs
supabase functions logs register-user --tail

# 6. Try registration in browser
```

Then share:
- Output of `supabase functions list`
- Any errors from the logs
- Browser console error messages
- Network response from the failed request
