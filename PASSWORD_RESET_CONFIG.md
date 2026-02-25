# Password Reset Flow - Supabase Configuration

## Overview

The password reset feature uses Supabase's built-in password recovery functionality (`resetPasswordForEmail` and `updateUser`). This document outlines the required Supabase settings to make the forgot password and reset password flows work correctly.

## Required Supabase Settings

### 1. Site URL
The Site URL is the base URL of your application. Supabase uses this to construct the password reset email links.

**For Production:**
- Site URL: `https://ucc-ipo.com`

**For Local Development:**
- Note: Local development typically uses the default Supabase settings; no special configuration needed for localhost during development.

### 2. Redirect URLs

Supabase needs to whitelist the redirect URLs that password reset emails can direct users to. Since the app uses HashRouter (`/#/` routes), the redirect URLs must include the hash.

Add these redirect URLs in your Supabase dashboard under **Authentication > Settings > Redirect URLs**:

#### Production Redirect URL
```
https://ucc-ipo.com/#/reset-password
```

#### Local Development Redirect URL
```
http://localhost:3000/#/reset-password
```

**Important:** The `#/` is required because the app uses React Router with HashRouter for client-side routing.

### 3. Email Configuration

Supabase sends password reset emails from your configured email service. Two options are supported:

#### Option A: Supabase Built-in Email (Recommended)
- No additional configuration required
- Emails are sent from your Supabase project's default email address
- Uses SMTP configured by Supabase

#### Option B: Custom Email (Resend)
If you've configured Resend as your email provider:
- Set `RESEND_API_KEY` in environment variables (if used for other notifications)
- Note: Password reset emails use Supabase's auth service, not Resend

## How the Password Reset Flow Works

1. **User visits /#/forgot-password**
   - Enters their email address
   - Frontend calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#/reset-password` })`
   - User always sees: "If that email exists, a reset link will be sent shortly" (prevents email enumeration)

2. **Email is sent**
   - Supabase sends an email with a recovery link
   - Link includes a session token and redirects to `/#/reset-password`

3. **User clicks email link**
   - Browser redirects to `/#/reset-password` with session token in URL fragment
   - Supabase automatically detects and validates the session (via `detectSessionInUrl: true` in client config)
   - Frontend checks `supabase.auth.getSession()` and validates the user

4. **User sets new password**
   - Enters new password (minimum 8 characters) and confirms it
   - Frontend calls `supabase.auth.updateUser({ password: newPassword })`
   - On success, redirects to `/#/login`

## Email Template (Default Supabase)

The default Supabase password reset email includes:
- Subject: "Reset your password"
- A clickable button linking to your redirect URL with session token
- Plain text fallback

To customize the email template, go to **Authentication > Email Templates** in your Supabase dashboard.

## Testing

### Local Testing
1. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`
2. Run the app: `npm run dev`
3. Navigate to `http://localhost:3000/#/login`
4. Click "Forgot your password?"
5. Enter a test email
6. Check your actual email (you'll need an email account registered in your Supabase project)
7. Click the reset link in the email
8. Verify you're redirected to `http://localhost:3000/#/reset-password`
9. Set a new password and verify you can log in

### Production Testing
1. Verify `https://ucc-ipo.com/#/reset-password` is in your Supabase redirect URLs (with the hash)
2. Navigate to `https://ucc-ipo.com/#/login`
3. Test with real email addresses in production
4. Verify email link redirects to `https://ucc-ipo.com/#/reset-password`

## Security Notes

- ✓ **Email Enumeration Prevention**: The frontend always shows a generic success message, whether the email exists or not
- ✓ **Password Safety**: Passwords are never logged or displayed in error messages
- ✓ **Session Validation**: The reset page validates that the user has a legitimate session before allowing password update
- ✓ **Redirect Safety**: Only whitelisted redirect URLs are accepted by Supabase
- ✓ **HTTPS Only**: In production, ensure the site URL uses HTTPS

## Troubleshooting

### Email not received
- Check email spam/junk folder
- Verify the email address exists in your Supabase users table
- Check Supabase project logs for email sending errors

### "Invalid or expired reset link" error
- Reset links typically expire after 1 hour (configurable in Supabase)
- User should request a new reset link

### Password update fails
- Ensure password is at least 8 characters
- Check browser console for specific error messages
- Verify Supabase project is running and accessible

## Environment Variables

These are already configured in `.env` but needed for the password reset flow:

```
VITE_SUPABASE_URL=https://mqfftubqlwiemtxpagps.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

No special environment variables are needed for the password reset feature beyond these standard Supabase credentials.

## Related Files

- Frontend Pages:
  - `src/pages/ForgotPasswordPage.tsx` - Forget password form
  - `src/pages/ResetPasswordPage.tsx` - Password reset form
- Routing:
  - `src/App.tsx` - Routes configured for `/forgot-password` and `/reset-password`
- Supabase Client:
  - `src/lib/supabase.ts` - Supabase client initialization
