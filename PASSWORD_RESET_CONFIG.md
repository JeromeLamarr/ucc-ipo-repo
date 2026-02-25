# Password Reset Flow - Custom Implementation

## Overview

The password reset feature uses custom Supabase Edge Functions with email tokens to provide a secure, beautiful password reset flow. Unlike Supabase's built-in recovery, this implementation:
- Uses secure random tokens (instead of built-in auth recovery links)
- Sends beautifully designed HTML emails (matching verification email style)
- Supports HashRouter URLs (`/#/reset-password?token=...`)
- Provides better UX and security controls

## Required Supabase Settings

### 1. Database Migration
The migration `20260226000000_add_password_reset_tokens.sql` creates the `password_reset_tokens` table. This must be applied to your Supabase database.

**Table structure:**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `token` (text, unique random 64-char token)
- `email` (text, for reference)
- `expires_at` (timestamptz, 1 hour expiration)
- `used` (boolean, tracks if token has been redeemed)
- `created_at` (timestamptz)

### 2. Edge Functions
Two new edge functions are required:
- `send-password-reset-email` - Generates token and sends email
- `reset-password-with-token` - Validates token and updates password

These are deployed automatically to your Supabase project at:
- `{SUPABASE_URL}/functions/v1/send-password-reset-email`
- `{SUPABASE_URL}/functions/v1/reset-password-with-token`

### 3. Environment Variables for Edge Functions
Ensure these Supabase project settings are configured:
- `SUPABASE_URL` - Your project URL (auto-configured)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-configured)
- Email service (Resend or Supabase built-in) configured under **Authentication > Email**

No additional configuration beyond standard Supabase setup is required.

## How the Password Reset Flow Works

### Step 1: User requests password reset
1. User visits `/#/forgot-password`
2. Enters their email address
3. Frontend calls `POST /functions/v1/send-password-reset-email` via edge function

### Step 2: Backend generates token and sends email
1. Edge function receives email
2. Looks up user in Supabase auth
3. **Generates secure random 64-character token**
4. Stores token in `password_reset_tokens` table with 1-hour expiration
5. Constructs beautiful HTML email with reset link: `https://ucc-ipo.com/#/reset-password?token=xxxxx`
6. Sends email via configured email service (Resend or Supabase)
7. **Returns success regardless of whether user exists** (prevents email enumeration)

### Step 3: User receives and clicks email link
1. Email arrives with "Reset Your Password" from UCC IP Office
2. Email includes:
   - User-friendly explanation
   - Large blue button: "Reset My Password"
   - Fallback link for copy-paste
   - Security warnings (never share link, 1-hour expiration)
3. User clicks button, redirected to `/#/reset-password?token=xxxxx`

### Step 4: Reset password page validates and updates
1. ResetPasswordPage extracts token from URL query params
2. Displays password form (password + confirm password)
3. User enters new password (minimum 8 characters)
4. On submit, frontend calls `POST /functions/v1/reset-password-with-token` with:
   - `token`: from URL params
   - `password`: new password
5. Backend validates:
   - Token exists in database
   - Token is not expired
   - Token has not been used before
6. **Updates user's Supabase auth password** via admin API
7. Marks token as `used = true` (prevents reuse)
8. Returns success

### Step 5: User redirected to login
1. ResetPasswordPage shows success message
2. Auto-redirects to `/#/login` after 2 seconds
3. User can now log in with new password

## Email Template Design

The password reset email uses the same professional design as the verification email:

**Visual Design:**
- Header: Gradient background (purple to pink) with "Reset Your Password" title
- Logo: UCC Intellectual Property Management System
- Main Content: Personalized greeting with explanation
- CTA Button: Large gradient button "Reset My Password"
- Fallback: Copy-paste link for users with image blocking
- Warning: Yellow alert box: "⏰ This link will expire in 1 hour"
- Footer: Security tips and contact info

**Email Content:**
```
Subject: Reset Your Password - UCC IP Management

Hello [User Name],

Password Reset Request

We received a request to reset the password for your UCC IP Management account.

Click the button below to reset your password:
[BUTTON: Reset My Password]

Or copy this link:
https://ucc-ipo.com/#/reset-password?token=xxxxx

⏰ This link will expire in 1 hour
For security reasons, you'll need to complete the password reset within 1 hour.

If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account's security.

---
For Your Security:
• Never share this link with anyone
• UCC Staff will never ask for your password
• Always verify the sender's email address

University Intellectual Property Management System
© 2026 University of Caloocan City
```

## Testing

### Local Testing
1. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
2. Ensure migration has been applied to your Supabase database
3. Ensure edge functions are deployed (`send-password-reset-email` and `reset-password-with-token`)
4. Run the app: `npm run dev`
5. Navigate to `http://localhost:3000/#/login`
6. Click "Forgot your password?"
7. Enter a test email that exists in your Supabase auth
8. Click "Send Reset Link"
9. Verify generic success message appears
10. Check your email inbox (watch for spam folder)
11. Click the "Reset My Password" button in the email
12. Verify you're redirected to `http://localhost:3000/#/reset-password?token=xxxxx`
13. Set a new password and submit
14. Verify success message and auto-redirect to login
15. Sign in with new password to confirm success

### Production Testing
1. Verify migration is applied to production database
2. Verify edge functions are deployed to production
3. Navigate to `https://ucc-ipo.com/#/login`
4. Click "Forgot your password?"
5. Test with real email address
6. Verify email arrives with proper styling
7. Click reset link and complete password reset
8. Confirm new password works on login

## Security Notes

- ✓ **Email Enumeration Prevention**: The frontend always shows a generic success message, whether the email exists or not
- ✓ **Password Safety**: Passwords are never logged or displayed in error messages
- ✓ **Session Validation**: The reset page validates that the user has a legitimate session before allowing password update
- ✓ **Redirect Safety**: Only whitelisted redirect URLs are accepted by Supabase
- ✓ **HTTPS Only**: In production, ensure the site URL uses HTTPS

## Troubleshooting

### Email not received
- Check email spam/junk folder
- Verify the email address exists in your Supabase auth users (check `auth.users` table)
- Check Supabase Edge Function logs: go to **Functions > send-password-reset-email > Logs**
- Verify email service is configured in **Authentication > Email** settings
- Check if token was created: query `password_reset_tokens` table for the email

### "Invalid or expired reset token" error
- Link may have expired (tokens valid for 1 hour only)
- User may have tried to use the same link twice
- Token may have been corrupted in email link
- Request a new reset link from the login page

### Reset email has poor formatting
- Check that your email client supports HTML (use desktop/webmail if mobile doesn't render)
- Verify the `send-password-reset-email` function is running correctly (check Function logs)
- The email is sent through your configured email service (Resend or Supabase) - verify that service is working

### User can't access reset password page
- Check the URL query param: should be `/#/reset-password?token=xxxxx`
- Verify token is at least 32 characters (should be 64)
- Ensure HashRouter is being used (URLs should have `/#/`)
- Check browser console for JavaScript errors

### Password update fails with "Unauthorized"
- The edge function may be missing or disabled
- Check Function logs for `reset-password-with-token`
- Verify the token is valid and exists in the `password_reset_tokens` table
- Ensure the token hasn't been marked as `used = true` already

### Email looks different than expected
- Email design may vary by email client (Gmail, Outlook, Apple Mail render differently)
- Some email clients strip certain CSS styles for security
- The fallback text link should always work even if styling is broken

### Token generation takes too long
- Edge Functions may be cold-starting
- Subsequent requests will be faster as the function warms up
- Check Function logs for any errors or timeouts

### Multiple reset tokens for same user
- This is expected behavior - each reset request generates a new token
- Old tokens can still be used as long as they haven't expired
- Only one token can successfully reset (once used, it can't be reused)

## Environment Variables

The app uses standard Supabase environment variables already configured in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The edge functions automatically use:
- `SUPABASE_URL` (auto-configured in edge function runtime)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-configured in edge function runtime)

No special environment variables needed for password reset beyond the standard Supabase setup.

## Database Deployment

The migration file must be applied to your Supabase database:
```
supabase/migrations/20260226000000_add_password_reset_tokens.sql
```

This migration:
- Creates the `password_reset_tokens` table
- Sets up appropriate indexes for performance
- Enables RLS (Row Level Security)
- Creates helper function for cleanup (optional)

Apply via Supabase CLI:
```bash
supabase db push
```

## Edge Functions Deployment

Both edge functions must be deployed:
1. `supabase/functions/send-password-reset-email/index.ts`
2. `supabase/functions/reset-password-with-token/index.ts`

Deploy via Supabase CLI:
```bash
supabase functions deploy send-password-reset-email
supabase functions deploy reset-password-with-token
```

Or if using Bolt deployment: push to main branch, Bolt will deploy automatically.

## Related Files

### Frontend Pages
- `src/pages/ForgotPasswordPage.tsx` - Forgot password form (calls edge function)
- `src/pages/ResetPasswordPage.tsx` - Reset password form (uses token from URL)
- `src/App.tsx` - Routes for `/forgot-password` and `/reset-password`

### Backend / Edge Functions
- `supabase/functions/send-password-reset-email/index.ts` - Generates token and sends email
- `supabase/functions/reset-password-with-token/index.ts` - Validates token and updates password

### Database
- `supabase/migrations/20260226000000_add_password_reset_tokens.sql` - Password reset tokens table
- Table: `password_reset_tokens` - Stores reset tokens with expiration

### Supabase Client
- `src/lib/supabase.ts` - Supabase client initialization (unchanged for password reset)
