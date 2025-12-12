# Email Troubleshooting Flowchart

## 🔍 Is Your Email System Working? Follow This Chart

```
┌─────────────────────────────────────────────────┐
│  Did you register and NOT receive an email?     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Check Supabase │
        │   Error Logs   │
        └────────┬───────┘
                 │
    ┌────────────┼────────────┬──────────────┬──────────────┐
    │            │            │              │              │
    ▼            ▼            ▼              ▼              ▼
  NO       MISSING      UNAUTHORIZED    INVALID        OTHER
  ERROR    API KEY      DOMAIN          API KEY        ERROR
    │      OR NOT       (Not                │
    │      FOUND        Verified)           │
    │         │            │               │
    │         │            │               │
    │    👉 FIX #1     👉 FIX #2       👉 FIX #1
    │                                      
    ▼ (Check Inbox/Spam)
  Email might be delayed
  
  Wait 5 minutes, then:
  - Check Spam/Junk folder
  - Check Resend dashboard logs
  - Verify DKIM/SPF records
```

---

## 🛠️ Quick Fixes by Error Type

### FIX #1: Missing or Invalid RESEND_API_KEY

**You see one of these errors:**
```
"Email service not configured"
"RESEND_API_KEY not found"
"invalid_api_key"
```

**How to fix:**

1. Get API key from https://resend.com/api-keys
2. Go to **Supabase Dashboard** → **Settings** → **Environment Variables**
3. Add:
   ```
   Name:  RESEND_API_KEY
   Value: re_xxxxxxxxxxxxx (your actual key)
   ```
4. Click **Save**
5. Wait 30 seconds, try again

✅ **Check:** You should see `RESEND_API_KEY` in the environment variables list

---

### FIX #2: Domain Not Verified in Resend

**You see one of these errors:**
```
"unauthorized"
"not verified"
"Domain signature is invalid"
```

**How to fix:**

1. Go to **https://resend.com/domains**
2. Check if **ucc-ipo.com** is listed
3. If not verified, click it and copy the DNS records:
   - **DKIM record** - Copy this value
   - **SPF record** - Usually `v=spf1 include:resend.com ~all`

4. Add to your domain provider (GoDaddy, Namecheap, etc.):
   ```
   DKIM:
   Name:  default._domainkey.ucc-ipo.com
   Value: [copy from Resend]
   
   SPF (if not already set):
   Name:  ucc-ipo.com
   Value: v=spf1 include:resend.com ~all
   ```

5. Wait 15-30 minutes for DNS to propagate
6. Go back to Resend and click **Verify Domain**

✅ **Check:** All DNS records should show green checkmarks in Resend dashboard

---

### FIX #3: Email Sender Address Wrong

**Symptoms:**
```
Email arrives from: "onboarding@resend.dev"
Expected:          "noreply@ucc-ipo.com"
```

**How to fix:**

1. Go to **Supabase Dashboard** → **Settings** → **Environment Variables**
2. Add:
   ```
   Name:  RESEND_FROM_EMAIL
   Value: noreply@ucc-ipo.com
   ```
3. Click **Save**
4. Wait 30 seconds, try registering again

✅ **Check:** Email should now come from noreply@ucc-ipo.com

---

## 🔍 Deep Diagnosis: Check Logs

### Check Supabase Function Logs

1. Go to **Supabase Dashboard** → **Functions** (left sidebar)
2. Click **register-user**
3. Click **Logs** tab
4. Look for recent errors (last 5-10 minutes)
5. Read the error message carefully

**Common log messages:**

| Message | Meaning | Fix |
|---------|---------|-----|
| `Email service not configured` | RESEND_API_KEY missing | FIX #1 |
| `unauthorized` | Domain not verified | FIX #2 |
| `invalid_api_key` | Key is wrong or expired | FIX #1 |
| `Cannot read property 'get'` | Env var syntax error | Check spelling |
| No error, but email failed | Check Resend dashboard | FIX #2 |

---

### Check Resend Dashboard Logs

1. Go to **https://resend.com/emails**
2. Do you see your email attempt?
   - 🟢 **Delivered** → Email was sent, check spam/junk folder
   - 🔴 **Failed** → Click for error details
   - ❌ **Not there** → API key issue or network problem

---

## 📝 Testing Steps

### Test 1: Send Test Email Directly

Use PowerShell to test Resend API directly:

```powershell
$apiKey = "re_your_key_here"  # Replace with your actual key
$to = "your-test-email@gmail.com"

$body = @{
    from    = "noreply@ucc-ipo.com"
    to      = @($to)
    subject = "Direct Test Email"
    html    = "<h1>Success!</h1><p>If you see this, API is working.</p>"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://api.resend.com/emails" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $apiKey"
        "Content-Type"  = "application/json"
    } `
    -Body $body

$response.Content | ConvertFrom-Json
```

**Result:**
- ✅ If you get an email in 5 seconds → API is working, check FIX #3
- ❌ If you get an error → Check the error message, use FIX #1 or #2

---

### Test 2: Register and Check Everything

1. Go to **/register** page
2. Fill in:
   ```
   Email:     testuser123@gmail.com (use a fresh test email)
   Full Name: Test User
   Password:  TestPassword123
   ```
3. Click Register

4. Immediately check:
   - [ ] Supabase console shows new auth user
   - [ ] Check the function logs (Functions → register-user → Logs)
   - [ ] Check Resend dashboard for email attempt
   - [ ] Check your test email inbox
   - [ ] Check spam/junk folder

5. Based on what you find:
   - Email appears in Resend but not in inbox → Check spam folder
   - Email doesn't appear in Resend → API key problem (FIX #1)
   - Error in Supabase logs → Read error message, apply matching fix

---

## 🎯 Verification Checklist

Before saying "emails work", verify all of these:

- [ ] RESEND_API_KEY is in Supabase Environment Variables
- [ ] RESEND_FROM_EMAIL is set to `noreply@ucc-ipo.com`
- [ ] Domain is verified in Resend dashboard (DKIM/SPF green)
- [ ] Test registration received verification email
- [ ] Email came from `noreply@ucc-ipo.com` (not from onboarding@resend.dev)
- [ ] Email appears in Resend dashboard as "Delivered"
- [ ] Supabase function logs show no errors
- [ ] Multiple test emails all worked consistently

---

## 🆘 Still Not Working?

### Step 1: Collect Information
```
- What exact error message do you see? (copy from Supabase logs)
- When did you add the RESEND_API_KEY?
- Which email addresses did you try registering with?
- Do the emails appear in Resend dashboard?
- Have you verified the domain in Resend?
```

### Step 2: Check These Specific Things
1. Exact spelling of `RESEND_API_KEY` (case-sensitive)
2. API key format starts with `re_`
3. Domain is actually verified (green checkmarks in Resend)
4. 30+ seconds have passed since adding variables
5. You redeployed functions (if using CLI)

### Step 3: Nuclear Option - Redeploy Everything
```powershell
cd "c:\Users\delag\Desktop\ucc ipo\project\ucc-ipo-repo"

# Restart Supabase (if local)
supabase stop
supabase start

# Or redeploy to production
supabase functions deploy send-notification-email
supabase functions deploy register-user
supabase functions deploy send-certificate-email
```

---

## 📞 Last Resort

If nothing works:

1. **Check Resend support:** https://resend.com/support
2. **Check Supabase docs:** https://supabase.com/docs
3. **Look at project logs:**
   - Supabase Dashboard → Functions → Click function → Logs
   - Copy any error messages exactly
4. **Verify domain records:**
   - Resend Dashboard → Domains → Click domain
   - All records should be ✅ verified

---

## ✅ Success Signs

Your email system is working when:

✅ User registers with email  
✅ User receives "Verify Your Email" email within 10 seconds  
✅ Email is from `noreply@ucc-ipo.com`  
✅ Email has a working "Verify Email Address" button  
✅ Clicking button takes to email verification flow  
✅ After verification, user can sign in  

If all of these happen → **You're done!** 🎉

---

## Quick Reference: Which Error → Which Fix

| Error/Symptom | Cause | Solution |
|---|---|---|
| "Email service not configured" | Missing RESEND_API_KEY | FIX #1 |
| "unauthorized" or "not verified" | Domain not verified | FIX #2 |
| Email from wrong address | RESEND_FROM_EMAIL not set | FIX #3 |
| No error, but email doesn't arrive | Check Resend logs | FIX #2 or wait |
| Emails arrive in spam | Domain reputation | Check SPF/DKIM |
| Supabase function times out | Network issue | Check API key, try again |

---

**Last updated:** December 2025  
**Status:** All email fixes deployed ✅
