# Email Sending Diagnostic & Fix Guide

## Problem Summary
Verification emails are not being received during registration because the **RESEND_API_KEY** environment variable is not configured in your Supabase project.

---

## Root Cause Analysis

### 1. **Missing RESEND_API_KEY in Supabase**
- The `send-notification-email` edge function requires `RESEND_API_KEY` to authenticate with Resend API
- When this variable is missing, email sending fails silently
- The registration continues (user is created), but the email is never sent

### 2. **Email Function Flow**
```
register-user (edge function)
    ↓
Calls: send-notification-email (edge function)
    ↓
Uses: RESEND_API_KEY (from Deno.env)
    ↓
If KEY MISSING → Email fails → No verification email sent ❌
```

### 3. **Current Error Handling**
The system currently returns success even when email fails:
```typescript
if (!emailResult.success) {
  console.error("Email service error:", emailResult.error);
  // User is created but email failed - still return success
  return new Response({
    success: true,
    message: "Account created but email delivery failed..."
  });
}
```

This makes it hard to debug because registration appears to succeed!

---

## How to Fix

### Step 1: Get Your Resend API Key

1. Go to **[https://resend.com](https://resend.com)**
2. Sign in to your account
3. Navigate to **API Keys** or **Settings → API Keys**
4. Copy your API key (starts with `re_`)
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**If you don't have a Resend account:**
- Create one at https://resend.com
- Verify your domain (ucc-ipo.com) - this enables sending from noreply@ucc-ipo.com
- Generate an API key

---

### Step 2: Add RESEND_API_KEY to Supabase

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Select your **ucc-ipo** project
3. Click **Settings** → **Environment Variables** (or **Configuration** → **Secrets**)
4. Click **+ New Secret**
5. Add the following:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your actual key)
6. Click **Save**

#### Option B: Using Supabase CLI

```bash
# Navigate to your project directory
cd "c:\Users\delag\Desktop\ucc ipo\project\ucc-ipo-repo"

# Add the secret
supabase secrets set RESEND_API_KEY=re_your_actual_key_here

# Verify it was added
supabase secrets list
```

---

### Step 3: Verify RESEND_FROM_EMAIL is Set

Check that this variable is also configured:
- **Name:** `RESEND_FROM_EMAIL`
- **Value:** `noreply@ucc-ipo.com`

If not present, add it alongside the API key.

---

### Step 4: Redeploy Functions (If Using Supabase CLI)

If you added secrets via CLI, redeploy:

```bash
supabase functions deploy send-notification-email
supabase functions deploy register-user
```

---

## Testing the Fix

### Test 1: Direct Email Sending

Use this script to test if emails work:

```bash
# PowerShell
$resendApiKey = "re_your_key_here"
$email = "test@example.com"

$body = @{
    to = $email
    subject = "Test Email"
    html = "<h1>Test</h1><p>If you see this, email works!</p>"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $resendApiKey"
    "Content-Type" = "application/json"
}

Invoke-WebRequest -Uri "https://api.resend.com/emails" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

### Test 2: Register and Check Logs

1. **Register with a test email**
   - Go to http://localhost:3000/register (or your deployment URL)
   - Fill in: Email, Full Name, Password
   - Click Register

2. **Check Supabase Edge Function Logs**
   - Go to Supabase Dashboard
   - Click **Functions** (left sidebar)
   - Select **register-user** 
   - View recent logs
   - Look for error messages about RESEND_API_KEY

3. **Check Resend Dashboard**
   - Go to https://resend.com/emails
   - Verify the email appears in the sent list
   - Check if it shows as "Delivered" or "Failed"

---

## Troubleshooting

### Issue: "Email service not configured" Error

**Cause:** `RESEND_API_KEY` is missing or not accessible

**Fix:**
1. Verify the key is added in Supabase Settings → Environment Variables
2. Check the exact spelling: `RESEND_API_KEY` (case-sensitive)
3. Redeploy functions after adding the key
4. Wait 30 seconds for changes to propagate

---

### Issue: "unauthorized" or "not verified" Error

**Cause:** Resend domain is not verified

**Fix:**
1. Go to Resend Dashboard
2. Click **Domains**
3. Verify **ucc-ipo.com** is verified (check DKIM, SPF, DMARC records)
4. If not verified, add the DNS records to your domain

Current DNS records needed:
```
DKIM:  v=DKIM1; p=MIGfMA0BGQKBgQCxxx...
SPF:   v=spf1 include:resend.com ~all
DMARC: v=DMARC1; p=quarantine; rua=mailto:admin@ucc-ipo.com
```

---

### Issue: Email Arrives but Says "onboarding@resend.dev"

**Cause:** `RESEND_FROM_EMAIL` is not set

**Fix:**
1. Add `RESEND_FROM_EMAIL=noreply@ucc-ipo.com` to Supabase Environment Variables
2. Redeploy the send-notification-email function
3. Test registration again

---

## Enhanced Error Handling (Optional)

To make debugging easier, update register-user function to be more explicit:

```typescript
// In register-user/index.ts, around line 480
const emailResponse = await fetch(...);
const emailResult = await emailResponse.json();

if (!emailResult.success) {
  console.error("Email service error:", {
    status: emailResponse.status,
    error: emailResult.error,
    resendDetails: emailResult,
    recipientEmail: email,
  });
  
  // Return 500 instead of 200 to signal email failure clearly
  return new Response(
    JSON.stringify({
      success: false,
      error: "Email delivery failed. Please check that RESEND_API_KEY is configured.",
      details: emailResult.error,
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## Checklist

- [ ] Get Resend API key from https://resend.com
- [ ] Add `RESEND_API_KEY` to Supabase Environment Variables
- [ ] Verify `RESEND_FROM_EMAIL=noreply@ucc-ipo.com` is set
- [ ] Redeploy edge functions (if using CLI)
- [ ] Test registration with a test email
- [ ] Verify email appears in Resend dashboard
- [ ] Check logs in Supabase for any errors
- [ ] Verify domain DNS records (DKIM, SPF, DMARC)

---

## Quick Summary

1. **Get API Key:** https://resend.com → API Keys → Copy key
2. **Add to Supabase:** Dashboard → Settings → Environment Variables → Add `RESEND_API_KEY=re_xxx`
3. **Test:** Register with test email and check Resend dashboard for delivery status
4. **Domain:** Verify ucc-ipo.com has DKIM/SPF/DMARC records for production

**That's it!** Emails should start working within 30 seconds of adding the key.
