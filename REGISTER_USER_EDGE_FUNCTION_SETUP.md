# Register-User Edge Function Setup Guide

## Overview
The `register-user` Edge Function now implements **Option B**: Email verification using Supabase Admin API (`generateLink`) + Resend HTTP API for sending emails.

### Key Changes
- ✅ Uses `type: "signup"` (not `magiclink`) for email verification during registration
- ✅ Generates proper email confirmation links via Supabase Admin API
- ✅ Sends emails via **Resend REST API** (no Supabase SMTP required)
- ✅ Proper error handling and detailed logging
- ✅ CORS headers configured for browser requests

---

## Environment Variables

Add these to your **Supabase Edge Functions secrets**:

### Required Variables

| Variable | Value | Example |
|----------|-------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xyzabc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (use admin API only) | `eyJhbGciOiJIUzI1NiIs...` |
| `RESEND_API_KEY` | Your Resend API key | `re_xxxxxxxxxxxxx` |
| `APP_URL` | Your app's base URL (for callbacks) | `https://ucc-ipo.com` or `http://localhost:3000` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_FROM_EMAIL` | `noreply@ucc-ipo.com` | Sender email address |

---

## Setup Steps

### 1. Get Your Resend API Key
1. Go to [https://resend.com](https://resend.com)
2. Sign up / log in to your account
3. In the dashboard, navigate to **API Keys**
4. Create a new API key (or copy existing one)
5. Copy the key (starts with `re_`)

### 2. Configure Supabase Edge Function Secrets

**Via Supabase Dashboard:**
1. Navigate to **Edge Functions** → **register-user**
2. Click **Settings** (or edit icon)
3. Scroll to **Environment Variables** section
4. Add each required variable:
   - `SUPABASE_URL`: (Already visible, copy from settings)
   - `SUPABASE_SERVICE_ROLE_KEY`: (From **Settings** → **API** → copy service role key)
   - `RESEND_API_KEY`: (From your Resend account)
   - `APP_URL`: Your app domain

**Via Supabase CLI (recommended for automation):**
```bash
# Set each secret
supabase secrets set RESEND_API_KEY "re_xxxxxxxxxxxxx"
supabase secrets set APP_URL "https://ucc-ipo.com"

# Verify secrets are set
supabase secrets list
```

---

## How It Works

### Registration Flow

```
1. Frontend sends:
   POST /functions/v1/register-user
   {
     "email": "user@example.com",
     "password": "secure123",
     "fullName": "John Doe",
     "departmentId": "uuid-here" (optional)
   }

2. Edge Function:
   a) Validates input
   b) Creates auth user via Supabase Admin API (email_confirm=false)
   c) Generates email confirmation link using generateLink(type: "signup")
   d) Sends email via Resend with the confirmation link
   e) Returns { success: true }

3. User receives:
   HTML email with "Verify Email Address" button
   -> Click button -> Redirects to https://ucc-ipo.com/auth/callback?code=xyz
   -> Your auth callback handler verifies the user

4. Frontend can:
   - Show confirmation message: "Check your email for verification link"
   - Handle success/error appropriately
```

---

## Request/Response Format

### Request
```json
{
  "email": "applicant@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe",
  "departmentId": "550e8400-e29b-41d4-a716-446655440000"  // optional
}
```

### Success Response (HTTP 200)
```json
{
  "success": true,
  "message": "Account created successfully. Check your email for the verification link."
}
```

### Error Response (HTTP 200, check `success` field)
```json
{
  "success": false,
  "error": "Failed to generate email confirmation link: [details]",
  "details": "[Full error trace for debugging]"
}
```

---

## Frontend Integration Example

```typescript
// src/pages/Register.tsx (React/Next.js example)

import { useState } from 'react';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const departmentId = formData.get('departmentId') as string;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/register-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
            departmentId: departmentId || undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage('✅ Account created! Check your email for the verification link.');
        // Redirect to login or show confirmation screen
      } else {
        setMessage(`❌ Registration failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <input name="fullName" placeholder="Full Name" required />
      <input name="departmentId" placeholder="Department ID (optional)" />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Register'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

---

## Email Verification Callback Handler

Your app must have a callback handler to complete the verification flow:

**Frontend Route:** `https://ucc-ipo.com/auth/callback`

```typescript
// src/pages/auth/callback.tsx (Next.js example)

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // The Supabase SDK will automatically:
      // 1. Extract code from URL parameters
      // 2. Exchange code for session
      // 3. Verify email_confirmed_at is set

      try {
        // Supabase automatically handles the code exchange
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (data.session) {
          // User verified successfully
          router.push('/dashboard');
        } else {
          // Fallback: let Supabase SDK handle it
          router.push('/login?verified=true');
        }
      } catch (error) {
        console.error('Callback error:', error);
        router.push('/login?error=verification-failed');
      }
    };

    handleCallback();
  }, [router]);

  return <p>Verifying your email...</p>;
}
```

---

## Testing

### Manual Test via cURL
```bash
curl -X POST https://xyzabc.supabase.co/functions/v1/register-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "fullName": "Test User",
    "departmentId": null
  }'
```

### Check Edge Function Logs
1. Go to **Supabase Dashboard** → **Edge Functions** → **register-user**
2. Click the **Logs** tab
3. Look for `[register-user]` prefixed messages

---

## Troubleshooting

### Issue: "Email service not configured"
**Solution:** Ensure `RESEND_API_KEY` is set in Edge Function secrets.

### Issue: "Email confirmation link could not be generated"
**Solution:** 
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check user was created successfully (look for log entries)
- Ensure `type: "signup"` is being used

### Issue: "Email service error (HTTP 401)"
**Solution:** Your Resend API key is invalid or expired.
- Regenerate key in Resend dashboard
- Update `RESEND_API_KEY` secret

### Issue: User receives no email
**Solution:**
1. Check Edge Function logs for email send status
2. Verify `RESEND_FROM_EMAIL` is a verified sender in Resend
3. Check user's spam folder
4. Ensure `APP_URL` is correct (used in callback URL)

### Issue: "Link already used" or "Invalid link" when clicking email link
**Solution:**
- Links expire after 24 hours (by design)
- User cannot click the same link twice
- Links are one-use only (security feature)
- User should re-register if link expires

---

## Security Notes

⚠️ **Important:**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend code
- The Edge Function runs with elevated privileges (SECURITY DEFINER)
- Email links are one-time use and expire after 24 hours
- Use HTTPS in production (`APP_URL` should be `https://`, not `http://`)
- Validate all input on both frontend and backend

---

## Database Triggers

The registration flow relies on the `handle_verified_user()` trigger (from migration `20260225_fix_email_verification_trigger.sql`):

1. When email is verified, the auth trigger fires
2. Creates a record in `public.users` table
3. Sets `role = 'applicant'` and `is_approved = false` by default
4. Awaits admin approval before granting access

---

## Summary

| Aspect | Details |
|--------|---------|
| **Email Provider** | Resend (REST API) |
| **Link Generation** | Supabase Admin API (`generateLink` type: "signup") |
| **Link Expiry** | 24 hours |
| **Verification Method** | Email confirmation link |
| **Profile Creation** | Automatic via database trigger |
| **Approval Flow** | Admin approval required for applicants |
| **Error Handling** | Always returns HTTP 200, check `success` field |
