# Email Verification: 5-Minute Troubleshooting Guide

**Goal:** Quickly diagnose why emails aren't arriving or verification isn't working.

---

## Quick Decision Tree

```
Email not arriving?
├─ YES → Go to: STEP 1
└─ NO → Go to: STEP 2

STEP 1: Check Resend Delivery
├─ Email shows "Delivered" in Resend? ✅ → Problem is not email sending
│   └─ Go to: STEP 3
└─ Email shows "Failed" or "Bounced"? ❌ → Problem is email delivery
    └─ Go to: FIX 1
```

---

## STEP 1: Check Resend Dashboard (2 minutes)

### 1a. Go to Resend

```
1. Open: https://resend.com/dashboard
2. Click: Emails tab
3. Look for: Recent email to your test recipient
4. Check: Status column
```

### 1b. Check Email Status

| Status | Meaning | Next Action |
|--------|---------|------------|
| **Delivered** ✅ | Email successfully sent to inbox | Go to STEP 2 |
| **Bounced** ❌ | Invalid recipient email address | Verify email is correct |
| **Failed** ❌ | Resend API error or temporary issue | Check error details below |
| **Complained** ⚠️ | User marked as spam | Check sender domain reputation |
| **Deferred** ⏳ | Temporary delay (retrying) | Wait 5 mins, refresh |

### 1c. Click Email to See Details

If status is "Failed" or "Bounced":
```
1. Click the email in list
2. Look for: "Error" or "Reason" field
3. Common errors:
   - "Invalid email address" → Check email format
   - "Domain not verified" → Verify sender domain in Resend
   - "Rejected by ISP" → Email domain issue, not code
   - "Rate limited" → Too many emails, wait a bit
```

---

## STEP 2: Check Edge Function Logs (2 minutes)

### 2a. Go to Logs

```
1. Open: https://app.supabase.com
2. Select: Your project
3. Navigate: Edge Functions → register-user → Logs tab
4. Look for: Most recent entries (within last 5 minutes)
```

### 2b. Read the Log

```
[register-user] === REGISTER USER FUNCTION CALLED ===
[register-user] Environment validated. Creating Supabase client...
[register-user] Step: Creating auth user
[register-user] ✓ Auth user created successfully
[register-user] User ID: abcd-1234-wxyz
[register-user] Step: Generating email confirmation link
[register-user] ✓ Email confirmation link generated successfully
[register-user] Link preview: https://xyzabc.supabase.co/auth/v1/verify?token=...
[register-user] Step: Sending verification email via Resend
[register-user] Email to: user@example.com
[register-user] From: UCC IP Office <noreply@ucc-ipo.com>
[register-user] Resend API endpoint: https://api.resend.com/emails
[register-user] Sending POST request to Resend API...
[register-user] Resend response status: 200 OK
[register-user] ✓ Resend API response received
[register-user] Email ID from Resend: msg_xxxxx
[register-user] ✓ Email sent successfully to: user@example.com
[register-user] ✓ REGISTRATION COMPLETE
```

### 2c. Look for ERRORS

```bash
# If you see lines like:
[register-user] ERROR: ...
[register-user] ❌ ...

# Common error patterns:

ERROR: Missing SUPABASE_SERVICE_ROLE_KEY
→ Fix: Set in Supabase Edge Function secrets

ERROR: Missing RESEND_API_KEY
→ Fix: Set in Supabase Edge Function secrets

ERROR: generateLink failed
→ Fix: Check SUPABASE_SERVICE_ROLE_KEY is correct

ERROR: Resend API returned error, Status: 401
→ Fix: Check RESEND_API_KEY is correct and not expired

ERROR: action_link missing from response
→ Fix: Check Supabase auth admin API is working

ERROR: Email service error (HTTP 422)
→ Fix: Check "from" email is verified in Resend

ERROR: No message ID in Resend response
→ Fix: Check Resend response is valid JSON
```

---

## STEP 3: Check Email Actually Arrived (1 minute)

### 3a. Check Spam/Promotions Folder

```
1. Open your test email account
2. Check:
   - Inbox
   - Spam folder
   - Promotions tab (Gmail)
   - Updates tab (Gmail)
   - Other folders
```

### 3b. Look for

```
From: UCC IP Office <noreply@ucc-ipo.com>
Subject: Verify Your Email - UCC IP Management System
Content: Blue "Verify Email Address" button
         + Fallback link starting with https://...
```

### 3c. If Email Not Found

- **In Logs:** Shows "Email sent successfully" ✓
- **In Resend:** Shows "Delivered" ✓
- **Not in Inbox:** Cause = ISP/Gmail filtering

→ Go to: FIX 2 (Email Domain Issues)

---

## FIX 1: Email Delivery Failed (Resend Says "Failed" or "Bounced")

### Check 1: Is Email Address Valid?

```
✓ user@example.com → Valid format
✓ user+tag@example.com → Valid
✗ user @ example.com → Invalid (space)
✗ user@example → Invalid (no TLD)
✗ @example.com → Invalid (no local part)
```

→ If email invalid: Re-register with correct email

### Check 2: Is Sender Domain Verified in Resend?

```
1. Go to: https://resend.com/settings/integrations
2. Look for: Domains section
3. Check: noreply@ucc-ipo.com is listed and verified

If not verified:
1. Click: "Add Domain"
2. Enter: ucc-ipo.com
3. Follow: Resend's verification steps (add DNS records)
4. Wait: 5-30 minutes for DNS propagation
5. Click: "Verify" when ready
```

**Why:** Unverified domains are blocked by ISPs (spam prevention)

### Check 3: Is API Key Correct?

```
1. Go to: https://resend.com/api-keys
2. Copy: Your API key (should start with "re_")
3. Go to: Supabase Dashboard → Settings → Edge Functions → register-user
4. Update: RESEND_API_KEY to match exactly
5. Redeploy: Function if Supabase requires it

OR use CLI:
supabase secrets set RESEND_API_KEY="re_xxxxx..."
supabase functions deploy register-user
```

### Check 4: Is Resend Account in Good Standing?

```
1. Go to: https://resend.com/dashboard
2. Look for: Any warning messages
3. Check: Account balance/credits
4. Check: Usage limits reached?

If suspended or issues:
→ Contact Resend support (usually resolved within 1 hour)
```

---

## FIX 2: Email Delivered But Not in Inbox (Spam/Filter)

### Check 1: Add to Contacts

```
If in Spam folder:
1. Click on email
2. Click: "Not spam" or "Move to Inbox"
3. Click: "Add to Contacts" (marks sender as trusted)
```

### Check 2: Email Domain Reputation

```
Check Resend sender reputation:
1. Go to: https://resend.com/dashboard
2. Look for: "Sender Reputation" or similar
3. If low: Resend may need warm-up period

Common causes:
- New Resend account (first 48 hours may have issues)
- Sending to multiple invalid emails (bounces)
- High complaint rate

Solution: Wait 24-48 hours, try again
```

### Check 3: Gmail/Outlook Filter Rules

```
1. In Gmail: Settings → Filters and Block Addresses
2. Check: No filters blocking noreply@ucc-ipo.com
3. Create filter (if missing):
   From: noreply@ucc-ipo.com
   Action: "Never send to Spam"
   Click: Create filter

Same for Outlook/Yahoo/etc.
```

---

## FIX 3: Link Click Doesn't Work (Redirect Issues)

### Symptom
- Email arrived ✓
- Clicked link ✓
- Got error message ❌

### Check 1: Is /auth/callback Route Implemented?

```javascript
// Should exist in your frontend
// React: src/pages/auth/callback.tsx
// SvelteKit: src/routes/auth/callback.svelte
// Next.js: app/auth/callback/page.tsx

// Should:
1. Read URL parameter:  ?code=exchange_code_from_supabase
2. Call: supabase.auth.exchangeCodeForSession(code)
3. Show: "Verifying..." → "Verified!" → redirect to dashboard
```

If not implemented:
→ Create route using template: [AUTH_CALLBACK_HANDLER.tsx](AUTH_CALLBACK_HANDLER.tsx)

### Check 2: Is APP_URL Correct?

```
Check what you set:
Supabase Edge Function secrets → APP_URL

Should be:
✓ https://ucc-ipo.com (production)
✓ http://localhost:5173 (dev)
✗ https://api.ucc-ipo.com (wrong - backend domain)
✗ https://admin.ucc-ipo.com (if different subdomain)

If wrong:
1. Go to: Supabase Dashboard → Edge Functions → register-user
2. Update: APP_URL to correct domain
3. Redeploy: supabase functions deploy register-user
4. Try registration again
```

### Check 3: Browser Developer Tools

```
1. Click verification link
2. Open browser DevTools (F12)
3. Look at: Console tab for errors
4. Look at: Network tab for failed requests

Common errors:
- "CORS error" → Check CORS headers in function
- "404 Not Found" → /auth/callback route doesn't exist
- "Cannot read properties of undefined" → supabase client not initialized
```

---

## FIX 4: User Can't Log In After Verification

### Check 1: Was Email Actually Verified?

```sql
-- In Supabase SQL Editor:
SELECT email, email_confirmed_at FROM auth.users 
WHERE email = 'user@example.com';

-- Should show:
email: user@example.com
email_confirmed_at: 2026-02-25 14:30:00 (NOT NULL)

-- If NULL: Email not verified yet
-- If has timestamp: Email is verified ✓
```

### Check 2: Did Profile Get Created?

```sql
-- In Supabase SQL Editor:
SELECT id, email, role, is_approved FROM public.users 
WHERE email = 'user@example.com';

-- Should show:
id: xxx
email: user@example.com
role: applicant
is_approved: false (pending admin approval)

-- If no record: Trigger didn't fire
-- If record exists: Wait for admin to approve
```

### Check 3: Is User Approved?

```
If user created but not approved:
1. Go to: Admin Dashboard → Pending Approvals
2. Find: User's name or email
3. Click: Approve
4. User should now be able to log in

If admin dashboard missing:
→ Implement approval workflow (separate task)
```

---

## FIX 5: Startup Error (Function Won't Deploy)

### Symptom
```
Error: STARTUP ERROR: Missing required environment variables
```

### Fix

```
1. Go to: https://app.supabase.com
2. Select: Your project
3. Navigate: Settings → Edge Functions → register-user
4. Click: Settings/Config icon
5. Verify you have ALL 4 of these:
   ✓ SUPABASE_URL
   ✓ SUPABASE_SERVICE_ROLE_KEY
   ✓ RESEND_API_KEY
   ✓ APP_URL

6. If any missing:
   supabase secrets set VAR_NAME="value"
   supabase functions deploy register-user

7. Check logs:
   Should now say: "All required environment variables configured"
```

---

## Quick Diagnostic Command

```bash
# Copy-paste this to test everything at once:

echo "=== 1. Testing Supabase Function ===" && \
curl -s -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/register-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"Test123!","fullName":"Test"}' | jq . && \

echo -e "\n=== 2. Checking Secrets ===" && \
supabase secrets list && \

echo -e "\n=== 3. Checking Recent Logs ===" && \
supabase functions logs register-user --tail 5 || echo "Logs not available via CLI"
```

---

## Escalation Path

### If you've done steps 1-5 and still stuck:

1. **Collect information:**
   ```
   - Edge Function logs (screenshot or copy)
   - Resend dashboard status (screenshot)
   - Error messages (exact text)
   - Test email used
   - APP_URL configured
   ```

2. **Check Resend Status:**
   - Site: https://status.resend.com
   - Are there API outages?

3. **Contact Support:**
   - Resend: https://resend.com/support (if email delivery issue)
   - Supabase: https://supabase.com/support (if function/auth issue)
   - Your team: Tag issue as "email-verification"

4. **Emergency Rollback:**
   ```bash
   # Revert to previous version
   git checkout HEAD~1 -- supabase/functions/register-user/index.ts
   supabase functions deploy register-user
   ```

---

## Summary Flowchart

```
Is email arriving?
│
├─ YES (in Inbox) ✅
│  └─ Click link
│     ├─ Works ✅ → Login works?
│     │           ├─ YES → All good! 🎉
│     │           └─ NO → FIX 4 (Check approval)
│     └─ Fails ❌ → FIX 3 (Check /auth/callback)
│
└─ NO (not arriving) ❌
   ├─ In Spam folder?
   │  └─ YES → FIX 2 (Domain reputation)
   └─ Not found at all?
      ├─ Edge logs show sent? ✓
      │  └─ Resend shows delivered? ✓
      │     └─ FIX 2 (ISP filtering)
      └─ Edge logs show error? ❌
         └─ FIX 1 (Check RESEND_API_KEY, domain)
```

---

**Avg. resolution time with this guide: 5-15 minutes** ⏱️
