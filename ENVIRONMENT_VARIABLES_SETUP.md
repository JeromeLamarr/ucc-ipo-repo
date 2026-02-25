# Release Engineer: Environment Variables & Setup Table

## 1. Complete Environment Variables Matrix

| Variable Name | Required? | Where to Set | Value Type | Example | Notes |
|---------------|-----------|-------------|-----------|---------|-------|
| **SUPABASE_URL** | ✅ YES | Supabase Edge Function Secrets | String | `https://xyzabc.supabase.co` | From Supabase Dashboard → Settings → API → Project URL |
| **SUPABASE_SERVICE_ROLE_KEY** | ✅ YES | Supabase Edge Function Secrets | String | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From Supabase Dashboard → Settings → API → Service Role Key (secret!) |
| **RESEND_API_KEY** | ✅ YES | Supabase Edge Function Secrets | String | `re_abcdef1234567890abcdef1234567890` | From https://resend.com → API Keys (secret!) |
| **APP_URL** | ✅ YES | Supabase Edge Function Secrets | String | `https://ucc-ipo.com` | Your production domain. Use `http://localhost:5173` for dev. |
| **RESEND_FROM_EMAIL** | ⓘ OPTIONAL | Supabase Edge Function Secrets | String | `noreply@ucc-ipo.com` | Must be a verified sender in Resend. Defaults to `noreply@ucc-ipo.com`. |
| **NODE_ENV** | ⓘ OPTIONAL | Supabase Edge Function Secrets | String | `production` | For logging level. Not critical. |

---

## 2. Where Each Variable Is Used

### In Supabase Edge Function (register-user)
```typescript
// Required at startup:
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const appUrl = Deno.env.get("APP_URL");
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

// Used for:
// - supabaseUrl + supabaseServiceKey → createClient() for Admin API calls
// - appUrl → generateLink({ type: "signup", options: { redirectTo: `${appUrl}/auth/callback` } })
// - resendApiKey → fetch("https://api.resend.com/emails", { headers: { "Authorization": `Bearer ${resendApiKey}` } })
// - resendFromEmail → email from header
```

### In Frontend (Vite) - NOT NEEDED
- ⓘ Note: Frontend calls the Edge Function via `POST /functions/v1/register-user`
- Frontend does NOT need any of these secrets
- Frontend only needs the **Supabase Anon Key** (which is already public)

---

## 3. How to Set Secrets in Supabase

### Option A: Via Dashboard (Easiest)
```
1. Go to: https://app.supabase.com
2. Select your project
3. Navigate: Settings → Edge Functions → register-user
4. Look for: "Environment Variables" section
5. Click: "Add Variable"
6. Enter:
   - Name: SUPABASE_URL
   - Value: <your value>
7. Repeat for each variable
8. Click: "Save" or similar
```

### Option B: Via Supabase CLI
```bash
# Navigate to project root
cd /path/to/project

# Set each secret
supabase secrets set SUPABASE_URL="https://xyzabc.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set APP_URL="https://ucc-ipo.com"
supabase secrets set RESEND_FROM_EMAIL="noreply@ucc-ipo.com"

# Verify secrets are set
supabase secrets list

# Deploy function
supabase functions deploy register-user
```

---

## 4. Validation Checklist Before Deployment

| Item | Check | Details |
|------|-------|---------|
| SUPABASE_URL | ✓ | Valid Supabase project URL from dashboard |
| SUPABASE_SERVICE_ROLE_KEY | ✓ | Long string starting with `eyJ...` not the Anon Key |
| RESEND_API_KEY | ✓ | Starts with `re_` (from https://resend.com/api-keys) |
| APP_URL | ✓ | Points to your app domain (include https://) |
| RESEND_FROM_EMAIL | ✓ | Verified as sender in Resend dashboard |

---

## 5. Environment-Specific Values

### Development (Local Testing)
```
SUPABASE_URL = https://xyzabc.supabase.co (staging/dev project)
SUPABASE_SERVICE_ROLE_KEY = <staging service key>
RESEND_API_KEY = re_... (can use same as production if Resend allows)
APP_URL = http://localhost:5173 (or whatever your dev port is)
RESEND_FROM_EMAIL = test@ucc-ipo.com or dev@ucc-ipo.com
```

### Production
```
SUPABASE_URL = https://xyzabc.supabase.co (production project)
SUPABASE_SERVICE_ROLE_KEY = <production service key>
RESEND_API_KEY = re_... (production key if different)
APP_URL = https://ucc-ipo.com
RESEND_FROM_EMAIL = noreply@ucc-ipo.com
```

---

## 6. Secret Security Notes

⚠️ **Critical Security Points:**

1. **SUPABASE_SERVICE_ROLE_KEY**
   - ❌ NEVER expose to frontend code
   - ❌ NEVER commit to git
   - ✅ ONLY in Edge Functions backend
   - Gives full admin access to database

2. **RESEND_API_KEY**
   - ❌ NEVER expose to frontend code
   - ❌ NEVER commit to git
   - ✅ ONLY in Edge Functions backend
   - Can send unlimited emails if leaked

3. **APP_URL** (Safe to see)
   - ✅ Can be in frontend .env
   - Used for redirect URL, not sensitive data

4. **Rotation**
   - If key is leaked, regenerate in Resend/Supabase immediately
   - Update in Edge Functions secrets
   - Redeploy function

---

## 7. Verification Steps

### Test Environment Variables Are Set
```bash
# Via Supabase CLI
supabase secrets list

# Should show:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# RESEND_API_KEY
# APP_URL
# RESEND_FROM_EMAIL
```

### Test Edge Function Can Read Them
Look at function logs after deployment. Should see:
```
[register-user] === REGISTER USER FUNCTION CALLED ===
[register-user] Supabase configured: true
[register-user] Creating auth user for email: test@example.com
[register-user] Generating email confirmation link for: test@example.com
[register-user] Sending verification email to: test@example.com
[register-user] Email service response status: 200
[register-user] Email sent successfully with ID: msg_xxxx
```

No errors about missing secrets = ✅ All set!

---

## 8. Troubleshooting: Missing Variables

If you see these errors in logs:

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing Supabase configuration` | SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set | Set in Edge Function secrets |
| `Email service not configured` | RESEND_API_KEY not set | Set in Edge Function secrets |
| `Failed to generate email confirmation link` | SUPABASE_SERVICE_ROLE_KEY invalid | Verify key is correct, redeploy |
| `Email service error (HTTP 401)` | RESEND_API_KEY invalid/expired | Get new key from Resend, update secrets |
| `Redirected to unknown redirect_to` | APP_URL invalid | Set APP_URL correctly, redeploy |
