# Step-by-Step: Adding RESEND_API_KEY to Supabase

## Required Environment Variables

You need to add **2 environment variables** to your Supabase project:

| Variable Name | Value | Purpose |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxx` | API authentication for sending emails |
| `RESEND_FROM_EMAIL` | `noreply@ucc-ipo.com` | Verified sender email address |

---

## 🔧 Step 1: Get Resend API Key

1. Go to **https://resend.com/api-keys**
2. Sign in with your account
3. Click **Create API Key**
4. Copy the generated key (looks like: `re_1234567890abcdef`)
5. Save it somewhere safe - **you'll need it in Step 2**

**Don't have a Resend account?**
- Create one at https://resend.com
- Add your domain (ucc-ipo.com) to verify sending address

---

## 🚀 Step 2: Add to Supabase Dashboard

### Method A: Web Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Click your **ucc-ipo** project

2. **Navigate to Environment Variables**
   - Click **⚙️ Settings** (left sidebar)
   - Click **Configuration** or **Secrets** tab
   - Look for **Environment Variables** section

3. **Add RESEND_API_KEY**
   - Click **+ New Variable** or **+ Add Secret**
   - Fill in:
     ```
     Name:  RESEND_API_KEY
     Value: re_xxxxxxxxxxxxxxxxxxxxxx  (your actual key)
     ```
   - Click **Save** or **Add**

4. **Add RESEND_FROM_EMAIL**
   - Click **+ New Variable** again
   - Fill in:
     ```
     Name:  RESEND_FROM_EMAIL
     Value: noreply@ucc-ipo.com
     ```
   - Click **Save**

---

### Method B: Using Supabase CLI

If you prefer command-line:

```powershell
# 1. Open PowerShell and navigate to project folder
cd "c:\Users\delag\Desktop\ucc ipo\project\ucc-ipo-repo"

# 2. Add RESEND_API_KEY
supabase secrets set RESEND_API_KEY=re_your_actual_key_here

# 3. Add RESEND_FROM_EMAIL
supabase secrets set RESEND_FROM_EMAIL=noreply@ucc-ipo.com

# 4. Verify they were added
supabase secrets list

# 5. Redeploy the email functions
supabase functions deploy send-notification-email
supabase functions deploy register-user
```

---

## ✅ Step 3: Verify Setup

### Check 1: Variables Are Set

**In Supabase Dashboard:**
1. Go to Settings → Environment Variables
2. You should see:
   - ✅ `RESEND_API_KEY` (value hidden for security)
   - ✅ `RESEND_FROM_EMAIL` = `noreply@ucc-ipo.com`

### Check 2: Functions Can Access Them

In your edge functions, they access these variables like:
```typescript
const resendApiKey = Deno.env.get("RESEND_API_KEY");       // ✅ Should work now
const senderEmail = Deno.env.get("RESEND_FROM_EMAIL");     // ✅ Should work now
```

### Check 3: Domain is Verified in Resend

1. Go to https://resend.com/domains
2. Check that **ucc-ipo.com** shows:
   - ✅ DKIM verified
   - ✅ SPF verified
   - ✅ DMARC verified (if configured)

If not verified, add the DNS records to your domain provider:

```
DKIM Record:
  Name: default._domainkey.ucc-ipo.com
  Value: (copy from Resend dashboard)

SPF Record:
  Name: ucc-ipo.com
  Value: v=spf1 include:resend.com ~all

DMARC Record (optional but recommended):
  Name: _dmarc.ucc-ipo.com
  Value: v=DMARC1; p=quarantine; rua=mailto:your-email@ucc-ipo.com
```

---

## 🧪 Step 4: Test Email Sending

### Test 1: Simple Registration Test

1. **Go to registration page**
   - If local: http://localhost:3000/register
   - If deployed: https://ucc-ipo.com/register

2. **Register with test email**
   ```
   Email:     testuser@gmail.com
   Full Name: Test User
   Password:  Password123
   ```

3. **Check your test email inbox**
   - ✅ Should receive "Verify Your Email" email from **noreply@ucc-ipo.com**
   - If not in Inbox, check Spam/Junk folder

4. **Check Supabase Logs** (if email didn't arrive)
   - Go to Functions → register-user
   - Click **Logs** tab
   - Look for error messages about RESEND_API_KEY

### Test 2: Direct Email API Test

If you want to test the Resend API directly:

```powershell
# Set your variables
$apiKey = "re_your_actual_key"
$toEmail = "testuser@gmail.com"

# Create email payload
$emailData = @{
    from    = "noreply@ucc-ipo.com"
    to      = @($toEmail)
    subject = "Test Email"
    html    = "<h1>Success!</h1><p>If you see this, emails are working.</p>"
} | ConvertTo-Json

# Send email via Resend API
$response = Invoke-WebRequest -Uri "https://api.resend.com/emails" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type"  = "application/json"
    } `
    -Body $emailData

# Show result
$response.Content | ConvertFrom-Json | Format-Table
```

---

## ❌ Troubleshooting

### Issue: Registration succeeds but no email received

**Check this in order:**

1. **RESEND_API_KEY is set?**
   - Go to Supabase Settings → Environment Variables
   - Look for `RESEND_API_KEY`
   - If missing → Add it (see Step 2)

2. **Check function logs**
   - Go to Functions → register-user → Logs
   - Look for any error messages
   - Common errors:
     ```
     "Email service not configured"              → Add RESEND_API_KEY
     "unauthorized" or "not verified"            → Verify domain in Resend
     "Cannot read property 'get' of undefined"   → Function can't access secrets
     ```

3. **Check Resend dashboard**
   - Go to https://resend.com/emails
   - Do you see the email attempt?
   - Click on it - what's the status?
     - 🟢 Delivered → Check spam folder
     - 🔴 Failed → Click for error details

4. **Wait 30 seconds**
   - After adding environment variables, changes need to propagate
   - Try registering again after waiting

---

### Issue: Email shows "onboarding@resend.dev" as sender

**This means:** `RESEND_FROM_EMAIL` is not set

**Fix:** Add it in Step 2 above

---

### Issue: "Domain not verified" error in Resend

**This means:** ucc-ipo.com doesn't have proper DNS records

**Fix:**
1. Go to https://resend.com/domains
2. Click ucc-ipo.com
3. Copy the DNS records (DKIM, SPF)
4. Add them to your domain provider (GoDaddy, Namecheap, etc.)
5. Wait 15-30 minutes for DNS to propagate
6. Click "Verify" in Resend dashboard

---

## 📋 Quick Checklist

After following these steps, check off:

- [ ] Created Resend account at https://resend.com
- [ ] Generated API key from Resend dashboard
- [ ] Added `RESEND_API_KEY` to Supabase Environment Variables
- [ ] Added `RESEND_FROM_EMAIL=noreply@ucc-ipo.com` to Supabase
- [ ] Verified domain in Resend dashboard (DKIM, SPF)
- [ ] Waited 30 seconds for variables to propagate
- [ ] Tested registration and received verification email
- [ ] Confirmed email came from noreply@ucc-ipo.com
- [ ] Checked Supabase function logs for any errors

**Once all checked:** Emails should work! 🎉

---

## Need Help?

If emails still aren't working:

1. **Check the logs:**
   - Supabase Dashboard → Functions → register-user → Logs
   - Look for the exact error message

2. **Check Resend logs:**
   - Go to https://resend.com/emails
   - See if your email attempt appears
   - Click it for error details

3. **Common quick fixes:**
   - Refresh Supabase dashboard after adding variables
   - Redeploy functions: `supabase functions deploy`
   - Check that `RESEND_API_KEY` value doesn't have extra spaces
   - Verify domain DKIM/SPF records in Resend dashboard
