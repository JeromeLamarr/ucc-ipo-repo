# Applicant Approval UX & Email Notification - Test Checklist

## Overview
This test checklist covers the new Pending Mode Dashboard UI and automatic approval email notifications.

---

## Test 1: New Applicant Registration & Pending Mode Dashboard

### Setup
- Use an incognito window or new browser session
- Register a new applicant account with a valid email

### Test Steps
1. ✅ **Register new applicant**
   - Go to `/register` page
   - Fill out registration form with new email, password, and name
   - Verify: Account created successfully (should redirect to login or verification)

2. ✅ **Verify email and login**
   - Check email inbox for verification code/link
   - Complete email verification
   - Login with new credentials

3. ✅ **Verify Pending Mode UI is shown**
   - Should NOT redirect to `/pending-approval` (ProtectedRoute check only applies there)
   - Should see **"Account Under Review"** banner on Dashboard (amber/yellow styling)
   - Banner should display:
     - Warning icon (AlertCircle)
     - Title: "Account Under Review"
     - Message about 1-2 business days
     - Info about getting approval email confirmation

4. ✅ **Verify New Submission button is disabled**
   - **New Submission** button should be **disabled** (greyed out)
   - Hovering over button should show tooltip: "Available after account approval"
   - Button should NOT be clickable
   - Attempting direct navigation to `/dashboard/submit` should redirect to `/pending-approval`

5. ✅ **Verify dashboard is otherwise functional**
   - Stats cards visible (0 submissions total/pending/approved/rejected)
   - No submitted records (applicant hasn't submitted anything yet)
   - Can view account settings
   - Can logout

---

## Test 2: Admin Approval & Email Notification

### Setup
- Have 2 browser/session windows: Admin and New Applicant (from Test 1)
- Keep applicant logged in on one window
- Login as admin on another window

### Test Steps

1. ✅ **Admin views pending applicants**
   - Go to Admin Dashboard (e.g., `/dashboard/admin` or admin section)
   - Find "Pending Applicants" section (in AdminPendingApplicants component)
   - Verify the new applicant from Test 1 is listed:
     - Show name, email, department (if set)
     - Show "Pending" status with clock icon
     - Display "Created at" timestamp

2. ✅ **Admin approves the applicant**
   - Click **Approve** button next to the new applicant
   - Observe:
     - Button shows loading state (spinner or disabled)
     - Success message appears: "✓ Applicant approved. Email sent to [email]"
     - Applicant is removed from pending list immediately
   - Check browser console (F12 > Console) for logs:
     - Should see "[AdminPendingApplicants] Approval successful" log

3. ✅ **Verify approval email is sent**
   - Check applicant's email inbox (the email used in registration)
   - Should receive email titled: **"Your UCC IP Account is Approved"**
   - Email should contain:
     - Green header with "✓ Account Approved"
     - "Welcome, [Applicant Name]!" header
     - Message: "Great news! Your account has been approved..."
     - "What You Can Now Do" section listing features
     - UCC IP Office footer with copyright info
   - **Note:** If using development environment without RESEND_API_KEY configured:
     - Check browser console for warning: "RESEND_API_KEY not configured - email not sent"
     - This is expected in dev; configure RESEND_API_KEY in Supabase for production

4. ✅ **Verify applicant gains full access** (Applicant's browser window)
   - Refresh the applicant dashboard (F5)
   - Pending banner should **disappear**
   - **New Submission** button should now be **enabled** (colored, clickable)
   - Button should no longer show tooltip on hover
   - Can now click "New Submission" to start creating a disclosure
   - ProtectedRoute checks will allow navigation to `/dashboard/submit`

5. ✅ **Verify activity log entry**
   - As admin, check Activity Logs (if available in UI)
   - Should see entry for approval:
     - Action: "approve_applicant"
     - User: Admin name
     - Details: applicant ID, applicant email, applicant name
     - Timestamp: When approval was executed

---

## Test 3: Edge Cases & Error Handling

### Test 3.1: Cannot approve already-approved applicant
1. ✅ **Re-approve same applicant**
   - Try to approve the same applicant again (via direct DB or API call)
   - Should get error: "Applicant is already approved"
   - Database should not duplicate approved_at/approved_by records

### Test 3.2: Non-admin cannot approve
1. ✅ **Try approval as non-admin user**
   - Login as applicant (different account from the one being approved)
   - Manually make fetch request to edge function (via browser console):
     ```javascript
     fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-applicant`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token },
       body: JSON.stringify({ applicant_user_id: '[some_user_id]' })
     }).then(r => r.json()).then(console.log)
     ```
   - Should get error: "Only admin users can approve applications"
   - No database updates should occur

### Test 3.3: Reject applicant (existing functionality, verify not broken)
1. ✅ **Reject a pending applicant**
   - As admin, click **Reject** button on a pending applicant
   - Fill in rejection reason
   - Should see success message
   - Applicant should be removed from pending list
   - Applicant should not be able to login/access dashboard (if is_approved=false and rejected_at is set)

---

## Test 4: Authorization & Security

### Test 4.1: Unauthenticated access
1. ✅ **Call edge function without auth**
   - Try to call `/functions/v1/approve-applicant` without Authorization header
   - Should get 401 error: "Missing Authorization header"

### Test 4.2: Invalid applicant ID
1. ✅ **Try to approve non-existent applicant**
   - As admin, make edge function call with fake UUID
   - Should get 404 error: "Applicant not found"

### Test 4.3: RLS policies still enforce approval
1. ✅ **Unapproved applicant cannot create submissions (RLS level)**
   - Unapproved applicant manually try to insert into ip_records via API
   - Should get RLS violation error
   - ProtectedRoute + RLS policies + frontend checks = 3-layer defense

---

## Test 5: Multi-Day Scenario (Optional)

### Setup
- Register applicants on different days
- Let approval sit pending overnight

### Test Steps
1. ✅ **Pending list persists across sessions**
   - Register applicant A on day 1
   - Logout and login next day as admin
   - Pending list should still show applicant A

2. ✅ **Approval email timing**
   - Approve applicant A
   - Verify email timestamp matches approval timestamp
   - Verify no duplicate emails sent

---

## Test 6: Email Content Verification

### Email validation checklist
- [ ] Sender: "UCC IP Office <noreply@ucc-ipo.com>" (or configured RESEND_FROM_EMAIL)
- [ ] Subject: "Your UCC IP Account is Approved"
- [ ] Recipient: Correct applicant email
- [ ] Header gradient: Green (approval color, not purple)
- [ ] Links work (if any included)
- [ ] Responsive on mobile (email client test)
- [ ] Plain text fallback present

---

## Common Issues & Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Error sending email" in console | RESEND_API_KEY not set | Configure in Supabase env vars |
| Applicant redirect to /pending-approval when already approved | ProtectedRoute not refreshing profile | Clear browser cache, logout/login |
| "Only admin users can..." error | Using applicant session for approval | Use admin session for approve buttons |
| Pending banner still shows after approval | Profile cache not updated | Refresh page (F5) to force profile reload |
| New Submission button still disabled | Same as above | Refresh page |

---

## Sign-off Checklist

- [ ] **Test 1** - Pending Mode Dashboard: All checks passed
- [ ] **Test 2** - Admin Approval & Email: Email sending verified
- [ ] **Test 3** - Edge Cases: Error handling works correctly
- [ ] **Test 4** - Authorization: RLS/Auth checks enforced
- [ ] **Test 5** - Multi-day scenario: Persists across sessions
- [ ] **Test 6** - Email content: Professional and accurate

**Overall Status:** ☐ PASS ☐ FAIL

**Date Tested:** ________________

**Tester Name:** ________________

**Notes:**
```
[Add any bugs, unexpected behaviors, or recommendations here]
```
