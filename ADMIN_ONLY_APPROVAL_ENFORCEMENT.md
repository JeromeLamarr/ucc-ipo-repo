# Admin-Only Applicant Approval - Implementation & Test Checklist

## Summary

Enforced **strict admin-only approval**: Only users with `role === "admin"` can approve applicant accounts. Supervisors and evaluators are now prevented from approving.

**Build Status:** ✅ Clean (`npm run build` passed, 0 TypeScript errors)

---

## Changes Made

### 1. Edge Function Authorization (CRITICAL)

**File:** [supabase/functions/approve-applicant/index.ts](supabase/functions/approve-applicant/index.ts)
**Lines:** 143-151 (approved role check)

#### BEFORE:
```typescript
// Check if user is admin/supervisor/evaluator (has permission to approve)
const adminRoles = ["admin", "supervisor", "evaluator"];
if (!adminRoles.includes(adminProfile.role)) {
  console.warn(`Unauthorized approval attempt by ${adminProfile.role}:`, adminProfile.id);
  return new Response(
    JSON.stringify({ error: "Only admin users can approve applications" }),
    { status: 403, ... }
  );
}
```

#### AFTER:
```typescript
// Check if user is admin (only admins can approve applicants)
if (adminProfile.role !== "admin") {
  console.warn(`Unauthorized approval attempt by ${adminProfile.role}:`, adminProfile.id);
  return new Response(
    JSON.stringify({ 
      error: "Only administrators can approve applicant accounts. Contact your admin for assistance." 
    }),
    { status: 403, ... }
  );
}
```

**Security Impact:** 
- ✅ Supervisors attempting approval → HTTP 403 (Forbidden)
- ✅ Evaluators attempting approval → HTTP 403 (Forbidden)
- ✅ Only admins can invoke the function
- ✅ Check happens BEFORE any DB update/email

---

### 2. Email Error Handling (Safety)

**File:** [supabase/functions/approve-applicant/index.ts](supabase/functions/approve-applicant/index.ts)
**Lines:** 207-303 (entire approval logic refactored)

#### Key Changes:

**a) Response includes email_sent flag:**
```typescript
let emailSent = false;
let emailError: string | null = null;

// ... DB update happens first ...

// ... then email send ...

const response = {
  success: true,
  message: emailSent 
    ? "Applicant approved successfully and email sent"
    : "Applicant approved but email could not be sent: " + emailError,
  email_sent: emailSent,
  email_error: emailError || undefined,
};
```

**b) DB update is required to proceed:**
- If `updateError` → throw error, return 500 (approval fails)
- Email only called AFTER db update succeeds

**c) Email failure doesn't block approval:**
- If email fails → approval still succeeds (success=true)
- But `email_sent=false` indicates to frontend admin
- Admin UI shows warning: "Approved but email could not be sent"

**d) Activity logging happens regardless:**
- Logs success even if email fails
- Approval is recorded in activity_logs table

---

### 3. Admin Role Guard (Frontend)

**File:** [src/components/AdminPendingApplicants.tsx](src/components/AdminPendingApplicants.tsx)
**Lines:** 1-28 (imports + role check)

#### BEFORE:
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Check, X, Clock, Mail, Calendar } from 'lucide-react';

export function AdminPendingApplicants() {
  const { primaryColor } = useBranding();
  // ... no role check ...
}
```

#### AFTER:
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { Check, X, Clock, Mail, Calendar, AlertCircle } from 'lucide-react';

export function AdminPendingApplicants() {
  const { primaryColor } = useBranding();
  const { profile } = useAuth();
  
  // Authorization check: only admins can see/use this component
  if (profile?.role !== 'admin') {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 md:p-8">
        <div className="flex gap-4">
          <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-800">Only administrators can approve applicant accounts. If you need to approve applications, please contact the system administrator.</p>
          </div>
        </div>
      </div>
    );
  }
}
```

**UX Impact:**
- Non-admin users (supervisor/evaluator) who somehow access AdminPendingApplicants component see red "Access Denied" message
- No pending applicants list shown
- No approve/reject buttons available

---

### 4. Email Status Display (Admin UI)

**File:** [src/components/AdminPendingApplicants.tsx](src/components/AdminPendingApplicants.tsx)
**Lines:** 97-110 (success message handling)

#### BEFORE:
```typescript
setMessage({ type: 'success', text: `✓ Applicant approved. Email sent to ${result.applicant_email}` });
```

#### AFTER:
```typescript
// Show status based on email success
if (result.email_sent) {
  setMessage({ type: 'success', text: `✓ Applicant approved. Confirmation email sent to ${result.applicant_email}` });
} else {
  setMessage({ type: 'success', text: `✓ Applicant approved (email could not be sent: ${result.email_error || result.message}). Contact them to notify of approval.` });
}
```

**User Experience:**
- If email succeeds: "✓ Applicant approved. Confirmation email sent to [email]"
- If email fails: "✓ Applicant approved (email could not be sent: [reason]). Contact them to notify of approval."
- Admin knows immediately if email delivery failed

---

## Routing & Authorization Summary

### Approval Flow

```
Applicant Registration (new user, is_approved=false)
  ↓
Applicant tries to access /dashboard/*
  ↓
ProtectedRoute check: is_approved=false?
  ↓ YES
Navigate to /pending-approval page
  ↓
Applicant sees "Account Under Review" message
  
--- Meanwhile, Admin Flow ---
Admin logs in, routes to /dashboard
  ↓
getDashboardComponent() checks role === 'admin'
  ↓ YES
AdminDashboard loads
  ↓
AdminPendingApplicants component displays
  ↓
AdminPendingApplicants role check: profile.role === 'admin'?
  ↓ YES (or NO → show Access Denied)
Pending applicants list shown
  ↓
Admin clicks Approve
  ↓
→ Edge function: role check admin-only
  ↓
→ DB update (approval)
  ↓
→ Activity log
  ↓
→ Email send
  ↓
UI shows result (success + email status)
```

### Security Checkpoints

| Checkpoint | Method | Blocks | Status |
|------------|--------|--------|--------|
| **1. ProtectedRoute** | `profile.is_approved === false` → redirect | Unapproved applicants from /dashboard/* | ✅ ACTIVE |
| **2. getDashboardComponent()** | `role === 'admin'` → show AdminDashboard | Supervisors/evaluators from admin UI | ✅ ACTIVE |
| **3. AdminPendingApplicants** | `profile.role === 'admin'` → show list | Non-admins see "Access Denied" | ✅ NEW |
| **4. Edge Function** | `role === 'admin'` only | Supervisor/evaluator calls to edge fn | ✅ STRENGTHENED |
| **5. RLS Policies** | `is_approved_applicant_or_privileged()` | DB-level enforcement | ✅ EXISTING |

---

## Manual Test Checklist

### Test 1: New Applicant Pending Mode

**Setup:** Open incognito window, register new applicant

**Steps:**
- [ ] **1A:** Register new account at `/register`
  - Email: `test-applicant-admin-check@example.com`
  - Name: `Test Admin Check Applicant`
  - Password: `[test password]`
  - Expected: Account created with `is_approved=false`, redirected to verify email

- [ ] **1B:** Verify email, login
  - Check inbox for verification code
  - Complete email verification
  - Login with credentials
  - Expected: Redirected to `/pending-approval` (not /dashboard)

- [ ] **1C:** See pending mode page
  - Should see "Account Under Review" page with clock icon
  - Message: "Thank you for registering! Your account is currently under review..."
  - Shows "Typical review time: 1-3 business days"
  - Buttons: "Go Home" (logs out)
  - Expected: Cannot access /dashboard/*, only view pending page

---

### Test 2: Supervisor Attempts Approval (Should Fail)

**Setup:** 
- Keep applicant from Test 1 logged in (Session A)
- Login as supervisor in new window (Session B)
- Have access to admin panel or try to call edge function directly

**Steps:**
- [ ] **2A:** Supervisor tries to view pending applicants
  - Login as supervisor
  - Navigate to Admin Dashboard / Pending Applicants section
  - Expected: Either (a) page not accessible, or (b) see "Access Denied - Only administrators..." message

- [ ] **2B:** Supervisor tries to call edge function directly (console test)
  - Open browser console (F12)
  - Run:
    ```javascript
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-applicant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
      },
      body: JSON.stringify({ applicant_user_id: '[test-applicant-id]' })
    });
    console.log(await res.json());
    ```
  - Expected Response (HTTP 403):
    ```json
    {
      "error": "Only administrators can approve applicant accounts. Contact your admin for assistance."
    }
    ```

---

### Test 3: Evaluator Attempts Approval (Should Fail)

**Setup:** Same as Test 2, but with evaluator account

**Steps:**
- [ ] **3A:** Evaluator tries to view pending applicants
  - Expected: "Access Denied" message

- [ ] **3B:** Evaluator consumes edge function via API
  - Expected: HTTP 403 error with admin-only message

---

### Test 4: Admin Approves (Should Succeed + Email)

**Setup:** 
- Applicant still pending (Session A from Test 1)
- Login as admin in new window (Session B)

**Steps:**
- [ ] **4A:** Admin views pending applicants
  - Login as admin
  - Navigate to Admin Dashboard
  - Should see "Pending Applicants" section
  - List should show test applicant from Test 1
  - Expected: Name, email, "Created at" timestamp visible

- [ ] **4B:** Admin clicks Approve button
  - Click "Approve" (checkmark button)
  - Observe:
    - Button enters loading state (spinner or disabled)
    - Success message appears at top of component
    - If email_sent=true: "✓ Applicant approved. Confirmation email sent to [email]"
    - If email_sent=false: "✓ Applicant approved (email could not be sent: [reason])..."
    - Applicant removed from pending list

- [ ] **4C:** Admin checks browser console
  - Open F12 → Console tab
  - Should see log: `[AdminPendingApplicants] Approval successful: { applicantId: '...', emailSent: true/false, ... }`

- [ ] **4D:** Check approval email in applicant's inbox
  - Expected: Email from `noreply@ucc-ipo.com` (or configured RESEND_FROM_EMAIL)
  - Subject: "Your UCC IP Account is Approved"
  - Green header with "✓ Account Approved"
  - Greeting: "Welcome, Test Admin Check Applicant!"
  - Bulleted list of features they can now access
  - Professional footer with UCC branding
  
  **Note:** If RESEND_API_KEY not set in env, email won't send:
  - Admin UI will show: "email could not be sent: RESEND_API_KEY not configured"
  - This is expected in dev environment; configure in production

---

### Test 5: Applicant Gains Full Access

**Setup:** Admin just approved applicant (Test 4)

**Steps:**
- [ ] **5A:** Applicant refreshes dashboard (Session A from Test 1)
  - In applicant's browser window, press F5 (refresh)
  - Expected: 
    - Redirected from /pending-approval to /dashboard
    - See ApplicantDashboard with welcome message
    - **Pending Mode Banner GONE** (amber "Account Under Review" banner should disappear)
    - **New Submission button now ENABLED** (no longer greyed out)
    - Button tooltip gone on hover
    - Stats cards show 0 submissions, drafts, etc.

- [ ] **5B:** Applicant can now access submission page
  - Click "New Submission" button (should work now)
  - Expected: Navigate to `/dashboard/submit` page
  - Can interact with submission form
  - Can upload files, enter title, abstract, etc.

- [ ] **5C:** Browser F12 Console
  - Should NOT see any redirect logs or "pending" messages
  - Normal dashboard operation

---

### Test 6: Activity Log Entry

**Setup:** Admin just approved applicant (Test 4)

**Steps:**
- [ ] **6A:** Check activity_logs table entry
  - As admin, check Activity Logs (if UI available)
  - Expected entry:
    ```
    Action: approve_applicant
    User: [Admin name]
    Applicant: [Test Admin Check Applicant]
    Email: test-applicant-admin-check@example.com
    Timestamp: [recent time]
    ```

- [ ] **6B:** Verify via DB query (Supabase Dashboard)
  - Query: `SELECT * FROM activity_logs WHERE action = 'approve_applicant' ORDER BY created_at DESC LIMIT 1;`
  - Expected:
    ```
    {
      "id": "...",
      "user_id": "[admin_user_id]",
      "action": "approve_applicant",
      "details": {
        "applicant_id": "[applicant_id]",
        "applicant_email": "test-applicant-admin-check@example.com",
        "applicant_name": "Test Admin Check Applicant"
      },
      "created_at": "[timestamp]"
    }
    ```

---

### Test 7: Edge Cases

#### 7A: Try to approve already-approved applicant
- [ ] **Step:** Run edge function again with same applicant ID
- [ ] **Expected Response:** HTTP 400
  ```json
  {
    "success": false,
    "message": "Applicant is already approved",
    "applicant_email": "test-applicant-admin-check@example.com",
    "applicant_name": "Test Admin Check Applicant"
  }
  ```

#### 7B: Try to approve non-existent applicant
- [ ] **Step:** Call edge function with fake UUID
- [ ] **Expected Response:** HTTP 404
  ```json
  {
    "error": "Applicant not found"
  }
  ```

#### 7C: Call edge function without Authorization header
- [ ] **Step:** Fetch without Bearer token
- [ ] **Expected Response:** HTTP 401
  ```json
  {
    "error": "Missing Authorization header"
  }
  ```

---

## Diff Summary Table

| File | Type | Lines | Change |
|------|------|-------|--------|
| [supabase/functions/approve-applicant/index.ts](supabase/functions/approve-applicant/index.ts) | MODIFIED | 143-151 | Role check: admin-only (was: admin/supervisor/evaluator) |
| [supabase/functions/approve-applicant/index.ts](supabase/functions/approve-applicant/index.ts) | MODIFIED | 207-303 | Email error handling: track email_sent, separate error message |
| [src/components/AdminPendingApplicants.tsx](src/components/AdminPendingApplicants.tsx) | MODIFIED | 1-6 | Add useAuth import + AlertCircle icon |
| [src/components/AdminPendingApplicants.tsx](src/components/AdminPendingApplicants.tsx) | MODIFIED | 16-43 | Add profile from useAuth + role check with Access Denied UI |
| [src/components/AdminPendingApplicants.tsx](src/components/AdminPendingApplicants.tsx) | MODIFIED | 97-110 | Display email status in success message |

---

## Security Assertions

- ✅ **Edge Function:** Only `role === 'admin'` can call approve-applicant
- ✅ **Frontend Component:** Non-admin users see "Access Denied" message
- ✅ **Database:** RLS policies still protect ip_records, ip_documents from unapproved applicants
- ✅ **Email Handling:** DB update is required before email attempt
- ✅ **Error Handling:** Email failure doesn't block approval; admin is informed
- ✅ **Routing:** Unapproved applicants redirected to /pending-approval, not dashboard
- ✅ **Activity Logging:** All approvals logged regardless of email success

---

## Build Status

```
✓ npm run build passed
✓ 1616 modules transformed
✓ Built in 12.13s
✓ 0 TypeScript errors
```

---

## Rollout Notes

1. **No Database Migration Required:** Uses existing `users.is_approved`, `users.approved_at`, `users.approved_by` columns
2. **No Environment Variable Changes:** RESEND_API_KEY optional (graceful fallback if not set)
3. **Backward Compatible:** Existing approved applicants unaffected
4. **Deployment:** Deploy code, no migrations needed, optional email configuration

---

## Sign-Off

- [ ] Test 1: New applicant pending mode ✓
- [ ] Test 2: Supervisor blocked ✓
- [ ] Test 3: Evaluator blocked ✓
- [ ] Test 4: Admin approval + email ✓
- [ ] Test 5: Applicant gains access ✓
- [ ] Test 6: Activity log recorded ✓
- [ ] Test 7: Edge cases handled ✓
- [ ] Build passes: ✓

**Date:** ________________  
**Tester:** ________________  
**Status:** ☐ PASS ☐ FAIL

