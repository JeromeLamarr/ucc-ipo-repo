# Resend Custom Domain Setup for ucc-ipo.com

## Overview

Your email verification system now supports sending emails from your custom domain `ucc-ipo.com` instead of the Resend testing domain. This guide walks you through configuring Resend with your domain.

---

## Current Implementation

### Changes Made

1. **Updated `send-notification-email` function** to use dynamic sender email
   - Reads from `RESEND_FROM_EMAIL` environment variable
   - Falls back to `noreply@ucc-ipo.com` if not set
   - Properly formats sender as "UCC IP Office <noreply@ucc-ipo.com>"

2. **Improved error handling** for domain verification issues
   - Logs detailed Resend API errors
   - Helps identify if domain is not verified

3. **Updated registration email template**
   - Changed color scheme to match UCC branding (blue #1a59a6)
   - Updated institution name to "University of Caloocan City"
   - Added website link to footer

---

## Step 1: Verify Your Domain in Resend

### 1.1 Access Resend Dashboard
1. Go to [https://resend.com](https://resend.com)
2. Sign in with your Resend account
3. Navigate to **Domains** section

### 1.2 Add Domain
1. Click **Add Domain**
2. Enter `ucc-ipo.com`
3. Resend will generate DNS records you need to add

### 1.3 Add DNS Records

Resend will provide you with DNS records to add:

**Typical DNS records (example - check your Resend dashboard):**

```
Type: CNAME
Name: default._domainkey.ucc-ipo.com
Value: default.ucc-ipo.resend.dev

Type: MX
Name: ucc-ipo.com
Value: feedback-smtp.region.amazonses.com (provided by Resend)
Priority: 10

Type: TXT (SPF)
Name: ucc-ipo.com
Value: v=spf1 include:resend.dev ~all

Type: CNAME (DMARC)
Name: _dmarc.ucc-ipo.com
Value: _dmarc.ucc-ipo.resend.dev
```

**Important:** Use the exact values from your Resend dashboard, not the examples above.

### 1.4 Update Domain Registrar

1. Access your domain registrar (Bolt, GoDaddy, Namecheap, etc.)
2. Go to DNS Settings
3. Add the records provided by Resend
4. **Wait 24-48 hours** for DNS propagation

### 1.5 Verify Domain in Resend

1. Return to Resend dashboard
2. Click **Verify Domain**
3. Resend will check if DNS records are properly configured
4. Once verified, you'll see a green checkmark

---

## Step 2: Configure Environment Variables

Once your domain is verified, set these environment variables:

### For Supabase Edge Functions

**Add to your Supabase project environment variables:**

```env
RESEND_FROM_EMAIL=noreply@ucc-ipo.com
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Your actual Resend API key
```

**Steps to add environment variables:**

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** → **Edge Functions**
3. Set the following variables:
   - `RESEND_FROM_EMAIL=noreply@ucc-ipo.com`
   - `RESEND_API_KEY=` (Your Resend API key - get from [https://resend.com/api-tokens](https://resend.com/api-tokens))

**Or via Bolt.new:**

1. In Bolt.new project settings
2. Environment variables section
3. Add the same variables above

---

## Step 3: Email Template Configuration

### Current Sender Email Format

```
From: UCC IP Office <noreply@ucc-ipo.com>
```

### To Use Different Sender Address

If you want to use a different sender email (e.g., `support@ucc-ipo.com`, `info@ucc-ipo.com`):

1. **Add the email as an alias in Resend dashboard**
   - Domains → ucc-ipo.com → Manage Aliases
   - Add your desired email address

2. **Update environment variable**
   ```env
   RESEND_FROM_EMAIL=support@ucc-ipo.com
   ```

3. **Or update function directly** (not recommended for production)
   - Edit `supabase/functions/send-notification-email/index.ts`
   - Change line 54: `const senderEmail = "support@ucc-ipo.com";`

---

## Step 4: Test Email Sending

### Method 1: Test via Registration Page

1. Go to [https://ucc-ipo.com/register](https://ucc-ipo.com/register)
2. Fill in registration form with a test email
3. Check the email inbox for verification link
4. Look at the email "From" address - should be `noreply@ucc-ipo.com`

### Method 2: Test via Direct API Call

```bash
curl -X POST https://api.resend.com/emails \
  -H 'Authorization: Bearer re_xxxxxxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "noreply@ucc-ipo.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1><p>This is a test email from your domain.</p>"
  }'
```

### Expected Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "from": "noreply@ucc-ipo.com",
  "to": "test@example.com",
  "created_at": "2025-12-11T10:30:00.000Z"
}
```

---

## Troubleshooting

### Issue: "Unauthorized" Error from Resend

**Cause:** Domain not verified or not configured in Resend

**Solution:**
1. Verify domain is showing green checkmark in Resend dashboard
2. Check DNS records are correctly added to your registrar
3. Wait 24-48 hours for DNS propagation
4. Use Resend test domain temporarily: `noreply@ucc-ipo.resend.dev`

### Issue: "Domain not verified"

**Cause:** Domain verification pending

**Solution:**
1. Go to Resend dashboard
2. Check domain status
3. Verify DNS records are correctly configured
4. Click "Retry verification"

### Issue: Emails going to spam

**Cause:** SPF/DKIM/DMARC not properly configured

**Solution:**
1. Ensure all DNS records from Resend are added
2. Wait 48+ hours for DNS propagation
3. Check SPF record includes `resend.dev`
4. Verify DKIM record is added

### Issue: Email still shows "onboarding@resend.dev"

**Cause:** Environment variable not set

**Solution:**
1. Verify `RESEND_FROM_EMAIL` is set in environment
2. Redeploy function after setting variable
3. Clear browser cache
4. Test with new registration

---

## Email Content Updates

### Current Email Template Structure

```
From: UCC IP Office <noreply@ucc-ipo.com>
Subject: Verify Your Email - UCC IP Management System
To: [User's email from registration]

Body:
- Header: "Welcome to UCC IP Management"
- Greeting: "Hello [Full Name]"
- Main text: Explanation of verification
- CTA Button: "Verify Email Address" (links to magic link)
- Fallback: Full link in case button doesn't work
- Security warning about not sharing link
- Footer: UCC IP Office info and website
```

### To Customize Email Template

Edit `supabase/functions/register-user/index.ts` lines 232-287:

**Common customizations:**

1. **Change button color:** Update `background: #1a59a6` to your preferred color
2. **Add logo:** Add `<img src="https://..." />` in header
3. **Change footer text:** Update footer section
4. **Add company address:** Include in footer

---

## Best Practices

1. **Use noreply email for automated messages**
   - Verification emails: noreply@ucc-ipo.com
   - Status notifications: noreply@ucc-ipo.com
   - System alerts: noreply@ucc-ipo.com

2. **Set up separate addresses for user replies** (optional)
   - Support requests: support@ucc-ipo.com
   - Inquiries: info@ucc-ipo.com
   - Billing: billing@ucc-ipo.com

3. **Monitor email deliverability**
   - Check Resend dashboard for bounce rates
   - Review spam complaints
   - Monitor authentication status

4. **Keep RESEND_API_KEY secure**
   - Never commit to version control
   - Use environment variables only
   - Rotate keys periodically
   - Use read-only API keys for external services

---

## Related Files

- `supabase/functions/send-notification-email/index.ts` - Email sending service
- `supabase/functions/register-user/index.ts` - Registration with email template
- `src/pages/RegisterPage.tsx` - Registration UI

---

## Resend Resources

- [Resend Dashboard](https://resend.com)
- [Resend Domain Verification Guide](https://resend.com/docs/get-started/domains)
- [Resend Email API Docs](https://resend.com/docs/api-reference/emails/send)
- [SPF/DKIM/DMARC Setup](https://resend.com/docs/get-started/dns)

---

## Next Steps

1. ✅ Code updated for custom domain support
2. ⏳ Verify domain in Resend (24-48 hours)
3. ⏳ Set RESEND_FROM_EMAIL environment variable
4. ⏳ Test with test email address
5. ⏳ Verify emails appear from noreply@ucc-ipo.com

---

**Last Updated:** December 11, 2025  
**Status:** Ready for domain verification  
**Domain:** ucc-ipo.com
