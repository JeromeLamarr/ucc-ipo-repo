# Email Verification System - Quick Start Guide

## What Was Fixed

Your email system now supports sending verification emails from your custom domain `ucc-ipo.com` instead of the Resend testing domain. Users can register with ANY email address and receive verification emails.

---

## Changes Made (Commit: 3189d9a)

### 1. **Dynamic Email Sender** 
- **File:** `supabase/functions/send-notification-email/index.ts`
- **Change:** Uses configurable sender email instead of hardcoded `onboarding@resend.dev`
- **Default:** `noreply@ucc-ipo.com` (configurable via `RESEND_FROM_EMAIL` env var)

### 2. **Updated Email Template**
- **File:** `supabase/functions/register-user/index.ts`
- **Changes:**
  - Color scheme updated to UCC branding (blue #1a59a6)
  - Institution name corrected to "University of Caloocan City"
  - Website link added to footer pointing to ucc-ipo.com
  - Professional formatting maintained

### 3. **Better Error Handling**
- Detailed logging of domain verification issues
- Clear error messages if domain is not verified
- Helps troubleshoot email delivery problems

---

## Setup Steps (Quick Checklist)

### ✅ Step 1: Verify Domain in Resend (24-48 hours)
- [ ] Go to https://resend.com/domains
- [ ] Click "Add Domain"
- [ ] Enter `ucc-ipo.com`
- [ ] Copy DNS records provided by Resend
- [ ] Add DNS records to your domain registrar (Bolt, GoDaddy, etc.)
- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Click "Verify Domain" in Resend dashboard
- [ ] Wait for green checkmark ✓

### ✅ Step 2: Set Environment Variables
Option A - Via Supabase Dashboard:
- [ ] Go to Supabase → Settings → Edge Functions
- [ ] Add variable: `RESEND_FROM_EMAIL` = `noreply@ucc-ipo.com`
- [ ] Verify `RESEND_API_KEY` is already set (check it exists)

Option B - Via Bolt.new:
- [ ] Go to Bolt.new project settings
- [ ] Environment section
- [ ] Add `RESEND_FROM_EMAIL=noreply@ucc-ipo.com`

### ✅ Step 3: Test Email Sending
- [ ] Go to https://ucc-ipo.com/register
- [ ] Sign up with a test email (e.g., your email)
- [ ] Check inbox for verification email
- [ ] Verify "From" address is `noreply@ucc-ipo.com` (not onboarding@resend.dev)
- [ ] Click verification link and complete signup

---

## Current Behavior

### What Users Experience (After Setup)

1. **User registers** at https://ucc-ipo.com/register
   ```
   Full Name: Jerome Lamarr
   Email: jerome@example.com
   Password: ••••••••
   Affiliation: CSD
   ```

2. **Email received:**
   ```
   From: UCC IP Office <noreply@ucc-ipo.com>
   Subject: Verify Your Email - UCC IP Management System
   To: jerome@example.com
   
   Body includes:
   - Welcome message
   - Verification link button
   - Fallback link (copy-paste option)
   - 24-hour expiration notice
   - Security warning
   ```

3. **User clicks link** → Email verified → Account active

---

## File Changes Summary

### Modified Files (2)

**1. `supabase/functions/send-notification-email/index.ts`**
```typescript
// BEFORE:
const emailPayload = {
  from: "UCC IP Office <onboarding@resend.dev>",  // ❌ Test domain only
  to: [to],
  ...
};

// AFTER:
const senderEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@ucc-ipo.com";  // ✅ Custom domain
const senderName = "UCC IP Office";

const emailPayload = {
  from: `${senderName} <${senderEmail}>`,  // ✅ Dynamic sender
  to: [to],
  ...
};
```

**2. `supabase/functions/register-user/index.ts`**
```typescript
// Updated email template:
- Color scheme: #1a59a6 (UCC blue)
- Institution: "University of Caloocan City" (was "University of Cape Coast")
- Footer: Added website link to https://ucc-ipo.com
- Branding: Matches your institution
```

### New Documentation

**`RESEND_CUSTOM_DOMAIN_SETUP.md`**
- Complete domain setup guide
- Step-by-step DNS configuration
- Troubleshooting for common issues
- Email customization options

---

## Troubleshooting

### Issue: Emails still from "onboarding@resend.dev"

**Cause:** Environment variable not set

**Solution:**
1. Set `RESEND_FROM_EMAIL=noreply@ucc-ipo.com` in environment
2. Redeploy function (Bolt.new auto-deploys on commit)
3. Test again with new registration

### Issue: "Unauthorized" error in email logs

**Cause:** Domain not verified in Resend

**Solution:**
1. Go to https://resend.com/domains
2. Check if `ucc-ipo.com` shows green checkmark
3. If not, verify DNS records were added correctly
4. Wait 24-48 hours for DNS propagation
5. Temporarily use `noreply@ucc-ipo.resend.dev` to test (Resend's test domain)

### Issue: Emails not received

**Cause:** Multiple possible reasons

**Solution - Check in order:**
1. Check spam/junk folder first
2. Verify domain is verified in Resend (green checkmark)
3. Check DNS records are correct (use MXToolbox)
4. Wait 48+ hours for full DNS propagation
5. Check Resend dashboard for bounce messages
6. Check email logs in Supabase functions

---

## Email Flow Diagram

```
User Registration
      ↓
register-user function
      ├─ Creates auth user
      ├─ Generates magic link
      ├─ Prepares HTML email
      └─ Calls send-notification-email
            ↓
send-notification-email function
      ├─ Gets RESEND_FROM_EMAIL env var
      ├─ Builds email payload with custom domain
      ├─ Sends via Resend API
      └─ Returns email ID
            ↓
Resend API
      ├─ Verifies sender domain (ucc-ipo.com)
      ├─ Signs email with DKIM
      └─ Delivers to recipient
            ↓
User Email Inbox
      └─ Receives: "From: UCC IP Office <noreply@ucc-ipo.com>"
```

---

## Environment Variables Needed

Add these to your Supabase/Bolt environment:

```env
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx        # Your Resend API key
RESEND_FROM_EMAIL=noreply@ucc-ipo.com  # NEW: Custom domain sender
```

**Where to set:**
- Supabase: Settings → Edge Functions → Environment Variables
- Bolt.new: Project Settings → Environment

---

## Email Customization Options

### To Use Different Sender Email

Edit environment variable:
```env
RESEND_FROM_EMAIL=support@ucc-ipo.com  # or any verified email
```

### To Change Email Template

Edit `supabase/functions/register-user/index.ts` lines 232-287:

**Examples:**
```typescript
// Change sender name
const senderName = "UCC IP Office Support";  // Instead of "UCC IP Office"

// Change button color
background: #1a59a6  // Change to any hex color

// Add logo
<img src="https://your-domain.com/logo.png" />

// Update footer
<p>Email: support@ucc-ipo.com</p>
```

---

## Testing Checklist

- [ ] Domain verified in Resend (green checkmark)
- [ ] `RESEND_FROM_EMAIL` environment variable set
- [ ] Test registration with any email address
- [ ] Verify email received
- [ ] Check "From" address is correct
- [ ] Click verification link works
- [ ] User can complete registration
- [ ] Email appears professional and branded

---

## Next Steps

1. **Immediate:** Set `RESEND_FROM_EMAIL` environment variable
2. **Within 48 hours:** Complete domain verification in Resend
3. **Testing:** Register with test email to verify everything works
4. **Deploy:** Live email verification system is ready!

---

## Support

For detailed setup instructions, see: **`RESEND_CUSTOM_DOMAIN_SETUP.md`**

For email system architecture, see: **`AUTO_EMAIL_NOTIFICATION_SYSTEM.md`**

---

**Status:** ✅ Code Updated | ⏳ Awaiting Domain Verification | ⏳ Awaiting Env Var Setup

**Commit:** 3189d9a  
**Date:** December 11, 2025
