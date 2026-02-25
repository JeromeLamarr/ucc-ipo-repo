# Password Reset Feature - Manual Test Checklist

## Pre-Testing Setup
- [ ] Ensure `.env` file has valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Run `npm install` to ensure dependencies are installed
- [ ] Start dev server: `npm run dev`
- [ ] Have a test email account that you monitor (can be real email or Supabase test user)

## Test Case 1: Forgot Password Link Navigation
**Purpose**: Verify the login page link works correctly

- [ ] Visit `http://localhost:3000/login`
- [ ] Verify "Forgot your password?" link is visible
- [ ] Click the link
- [ ] Verify page navigates to `http://localhost:3000/forgot-password`
- [ ] Verify page displays "Reset Password" heading
- [ ] Verify email input field is present and focused
- [ ] Verify "Back to login" link is present

## Test Case 2: Forgot Password Form Submission (Nonexistent Email)
**Purpose**: Verify security feature - no email enumeration

- [ ] On `/forgot-password` page, enter a non-existent email (e.g., `nonexistent@test.com`)
- [ ] Click "Send Reset Link"
- [ ] Verify loading message appears: "Sending reset link..."
- [ ] Verify generic success message appears: "If that email exists in our system, a reset link will be sent..."
- [ ] Verify message is shown for 3 seconds, then auto-redirects to `/login`
- [ ] Verify NO error indicates the email doesn't exist

## Test Case 3: Forgot Password Form Submission (Existing Email)
**Purpose**: Verify real password reset email is sent

- [ ] Create a test user in Supabase or use an existing test email account
- [ ] On `/forgot-password` page, enter the registered test email
- [ ] Click "Send Reset Link"
- [ ] Verify generic success message appears (same as Test Case 2)
- [ ] Verify auto-redirect to `/login` after 3 seconds
- [ ] Check your email inbox for a password reset email from Supabase
  - [ ] Email arrives within 1 minute
  - [ ] Email is from Supabase (sender: auth@supabase.io or similar)
  - [ ] Email contains a reset link button or plain text link
  - [ ] Email link contains a token and redirects to your app

## Test Case 4: Reset Password Link Validation
**Purpose**: Verify the reset page validates the session

- [ ] Directly visit `http://localhost:3000/reset-password` (without clicking email link)
- [ ] Verify "Validating your reset link..." message appears briefly
- [ ] Verify error message appears: "Invalid or expired reset link"
- [ ] Verify "Request a new reset link" button is present and clickable
- [ ] Click button and verify redirect to `/forgot-password`

## Test Case 5: Valid Reset Password Form
**Purpose**: Verify password reset works with valid session

- [ ] From previous test case, go back to `/forgot-password`
- [ ] Enter your test email again
- [ ] Send reset link
- [ ] Check email and click the password reset link
- [ ] Verify page navigates to `/reset-password` with form showing
- [ ] Verify form contains:
  - [ ] "New Password" input field
  - [ ] "Confirm Password" input field
  - [ ] "Update Password" button

## Test Case 6: Password Validation (Too Short)
**Purpose**: Verify minimum password length requirement

- [ ] On the reset password form with valid session, enter:
  - New Password: `short1`
  - Confirm Password: `short1`
- [ ] Click "Update Password"
- [ ] Verify error message: "Password must be at least 8 characters long"
- [ ] Verify form fields remain filled and button is re-enabled

## Test Case 7: Password Validation (Mismatch)
**Purpose**: Verify password confirmation matching

- [ ] On the reset password form, enter:
  - New Password: `NewPassword123`
  - Confirm Password: `DifferentPass123`
- [ ] Click "Update Password"
- [ ] Verify error message: "Passwords do not match"
- [ ] Verify form fields remain filled and button is re-enabled

## Test Case 8: Successful Password Reset
**Purpose**: Verify password is actually updated

- [ ] On the reset password form with valid session, enter:
  - New Password: `NewSecurePassword123`
  - Confirm Password: `NewSecurePassword123`
- [ ] Click "Update Password"
- [ ] Verify loading message: "Updating password..."
- [ ] Verify success message appears:
  - [ ] Green checkmark icon shown
  - [ ] "Password Updated" heading
  - [ ] "You can now sign in with your new password"
  - [ ] "Redirecting to login..." message
- [ ] Verify auto-redirect to `/login` after 2 seconds
- [ ] On login page, verify old password no longer works
- [ ] On login page, sign in with new password and verify success

## Test Case 9: Expired Reset Link
**Purpose**: Verify expired tokens are rejected

- [ ] From Test Case 5, generate a new reset email
- [ ] Copy the reset link from email but DO NOT click it yet
- [ ] Wait 1+ hour (or manually expire the token in Supabase if possible)
- [ ] Click the reset link
- [ ] Verify error message: "Invalid or expired reset link"
- [ ] Verify user can request a new link

## Test Case 10: Form Validation (Empty Fields)
**Purpose**: Verify required field validation

- [ ] On `/forgot-password` page, click "Send Reset Link" without entering email
- [ ] Verify HTML5 browser validation appears: "Please fill out this field"
- [ ] Similarly test reset password form with empty password fields
- [ ] Verify validation message appears

## Test Case 11: Browser Navigation
**Purpose**: Verify users can navigate back safely

- [ ] On `/forgot-password`, enter an email and click "Send Reset Link"
- [ ] Before redirect, click browser back button
- [ ] Verify back navigation works
- [ ] Go forward to test redirect happens as expected
- [ ] Similarly test on `/reset-password`

## Test Case 12: UI/UX Checks
**Purpose**: Verify styling and user experience

- [ ] On `/forgot-password`:
  - [ ] Page header and subheading are clear
  - [ ] Form is visually consistent with login/register pages
  - [ ] Error messages have red background and icon
  - [ ] Success message has green checkmark
  - [ ] Loading state shows spinning icon or text
  - [ ] Links have proper hover states

- [ ] On `/reset-password`:
  - [ ] Same visual consistency checks as above
  - [ ] Password strength hint is clear: "Minimum 8 characters"
  - [ ] Icon placeholders for password fields look correct
  - [ ] Form layout is responsive on mobile (if applicable)

## Test Case 13: Production Redirect URL (If Deploying)
**Purpose**: Verify links work in production

- [ ] In Supabase dashboard, verify these redirect URLs are added:
  - [ ] `https://ucc-ipo.com/reset-password` (production)
  - [ ] `http://localhost:3000/reset-password` (local dev)
- [ ] Deploy to production or test with production domain
- [ ] Repeat Test Cases 3 and 5 with production domain
- [ ] Verify email link redirects to `https://ucc-ipo.com/reset-password`
- [ ] Verify password reset works in production

## Test Case 14: Concurrent Login Attempts
**Purpose**: Verify session handling with multiple browser tabs

- [ ] In Tab 1, navigate to `/forgot-password`
- [ ] In Tab 2, simultaneously try to log in with old credentials
- [ ] Verify no conflicts occur
- [ ] Complete password reset in Tab 1
- [ ] Verify login with new password works in Tab 2
- [ ] Verify old password no longer works

## Test Case 15: Error Handling (Supabase Down)
**Purpose**: Verify graceful error handling

- [ ] Stop Supabase or disconnect network
- [ ] Try to submit forgot password form
- [ ] Verify user-friendly error message appears (not a raw API error)
- [ ] Verify form can be resubmitted when connection restored

## Sign-Off

- [ ] All tests passed
- [ ] No console errors in developer tools
- [ ] No TypeScript/linting errors in build
- [ ] Code follows existing project style
- [ ] Ready to commit and merge

**Tested By**: ________________  
**Date**: ________________  
**Notes**: 

---

## Quick Reference: Test Commands

```bash
# Start dev server
npm run dev

# Run linter
npm run lint

# Build for production
npm build

# Run type check
npm run typecheck
```

## Quick Email Testing Tips

- Use a real email address you control for testing
- Check spam/junk folders for emails
- Gmail users can use `+` suffix for testing: `your-email+test@gmail.com`
- For local testing without email, check Supabase project logs for email content
