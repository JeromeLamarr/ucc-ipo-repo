# Applicant Approval Workflow - QA Verification Checklist

**Implementation Date:** 2026-02-24  
**Purpose:** Verify applicant approval workflow works correctly without breaking existing functionality  
**Scope:** New applicant registration, approval process, and backward compatibility

---

## SECTION 1: Backward Compatibility Tests

### 1.1 Existing Applicant Access ✓
- [ ] **Test 1.1.1:** Load a pre-migration applicant user into local database (manually set is_approved=TRUE)
- [ ] **Test 1.1.2:** Login with existing applicant credentials
- [ ] **Test 1.1.3:** Verify `/dashboard` loads without redirect
- [ ] **Test 1.1.4:** Verify `/dashboard/submit` is accessible  
- [ ] **Test 1.1.5:** Verify `/dashboard/submissions` shows past submissions
- [ ] **Test 1.1.6:** Verify existing applicant can create new submission

### 1.2 Other Role Access (Unaffected)
- [ ] **Test 1.2.1:** Supervisor can login and access `/dashboard/review`
- [ ] **Test 1.2.2:** Evaluator can login and access `/dashboard/evaluate`
- [ ] **Test 1.2.3:** Admin can login and access `/dashboard/analytics`
- [ ] **Test 1.2.4:** Department Head can login and access `/dashboard/department`
- [ ] **Test 1.2.5:** Verify non-applicant roles do NOT see pending approval redirect

---

## SECTION 2: New Applicant Registration Flow

### 2.1 Registration and Initial State
- [ ] **Test 2.1.1:** Open `/` (home page) and click "Register as Applicant"
- [ ] **Test 2.1.2:** Fill out registration form with valid data
- [ ] **Test 2.1.3:** Submit form and verify `register-user` edge function is called
- [ ] **Test 2.1.4:** Verify email verification email is sent
- [ ] **Test 2.1.5:** Check database: `users.is_approved` = FALSE for new applicant
- [ ] **Test 2.1.6:** Check database: `users.approved_at` = NULL
- [ ] **Test 2.1.7:** Check database: `users.approved_by` = NULL
- [ ] **Test 2.1.8:** Check database: `users.role` = 'applicant'

### 2.2 Email Verification
- [ ] **Test 2.2.1:** Copy verification link from email
- [ ] **Test 2.2.2:** Click verification link
- [ ] **Test 2.2.3:** Verify email is marked as confirmed
- [ ] **Test 2.2.4:** Verify page shows success message

### 2.3 Login with Unapproved Status
- [ ] **Test 2.3.1:** Navigate to `/login`
- [ ] **Test 2.3.2:** Enter new applicant email and password
- [ ] **Test 2.3.3:** Verify login succeeds (no auth-level block)
- [ ] **Test 2.3.4:** Verify immediately redirected to `/pending-approval`
- [ ] **Test 2.3.5:** Verify `/pending-approval` page displays with:
  - [ ] Clock icon
  - [ ] "Account Under Review" title
  - [ ] Timeline info showing typical review time
  - [ ] "Back to Home" button
  - [ ] "Log Out" button
  - [ ] "Contact Support" link

### 2.4 Blocked Dashboard Access
- [ ] **Test 2.4.1:** From `/pending-approval`, verify clicking "Back to Home" goes to `/`
- [ ] **Test 2.4.2:** Try navigating directly to `/dashboard` while unapproved
- [ ] **Test 2.4.3:** Verify redirected back to `/pending-approval`
- [ ] **Test 2.4.4:** Try navigating directly to `/dashboard/submit`
- [ ] **Test 2.4.5:** Verify redirected to `/pending-approval`
- [ ] **Test 2.4.6:** Try navigating directly to `/dashboard/submissions`
- [ ] **Test 2.4.7:** Verify redirected to `/pending-approval`

### 2.5 Backend Enforcement (RLS Policies)
- [ ] **Test 2.5.1:** While logged in as unapproved applicant, open browser DevTools
- [ ] **Test 2.5.2:** Inspect NewSubmissionPage network tab
- [ ] **Test 2.5.3:** Note the is_approved value in profile context (should be FALSE)
- [ ] **Test 2.5.4:** Attempt to submit via Supabase client directly (test API)
  ```javascript
  // In console, try:
  supabase.from('ip_records').insert({ applicant_id: userId, ... })
  // Should return 403 Forbidden due to RLS policy
  ```
- [ ] **Test 2.5.5:** Verify RLS policy prevents INSERT (expect error response)

---

## SECTION 3: Admin Approval Process

### 3.1 Admin Dashboard - Pending Applicants Section
- [ ] **Test 3.1.1:** Login as admin user
- [ ] **Test 3.1.2:** Navigate to `/dashboard/analytics` (AdminDashboard)
- [ ] **Test 3.1.3:** Verify "Pending Applicants" section displays at top
- [ ] **Test 3.1.4:** Verify count shows number of pending applicants
- [ ] **Test 3.1.5:** Verify pending applicant list shows:
  - [ ] Applicant full name
  - [ ] Applicant email
  - [ ] Days waiting (e.g., "submitted 2 days ago")
  - [ ] Department name
  - [ ] Submission timestamp

### 3.2 Admin Approve Action
- [ ] **Test 3.2.1:** In pending applicants list, locate a test applicant
- [ ] **Test 3.2.2:** Click "Approve" button
- [ ] **Test 3.2.3:** Verify success message appears
- [ ] **Test 3.2.4:** Verify applicant removed from pending list
- [ ] **Test 3.2.5:** Check database `users` table:
  - [ ] `is_approved` = TRUE
  - [ ] `approved_at` = timestamp (NOT NULL)
  - [ ] `approved_by` = admin user's ID
- [ ] **Test 3.2.6:** Verify activity log entry created with action='approve_applicant'

### 3.3 Admin Reject Action
- [ ] **Test 3.3.1:** In pending applicants list, locate another test applicant
- [ ] **Test 3.3.2:** Click "Reject" button
- [ ] **Test 3.3.3:** Verify textarea appears for rejection reason
- [ ] **Test 3.3.4:** Enter rejection reason (e.g., "Missing required certifications")
- [ ] **Test 3.3.5:** Click "Confirm Rejection"
- [ ] **Test 3.3.6:** Verify success message appears
- [ ] **Test 3.3.7:** Verify applicant removed from pending list
- [ ] **Test 3.3.8:** Check database `users` table:
  - [ ] `is_approved` = FALSE (unchanged)
  - [ ] `rejected_at` = timestamp (NOT NULL)
  - [ ] `rejection_reason` = "Missing required certifications"
  - [ ] `approved_at` = NULL (unchanged)
- [ ] **Test 3.3.9:** Verify activity log entry created with action='reject_applicant'

### 3.4 Approved Applicant Can Submit
- [ ] **Test 3.4.1:** Login as the approved applicant (from Test 3.2)
- [ ] **Test 3.4.2:** Verify NOT redirected to `/pending-approval`
- [ ] **Test 3.4.3:** Verify `/dashboard` loads successfully
- [ ] **Test 3.4.4:** Navigate to `/dashboard/submit`
- [ ] **Test 3.4.5:** Verify submission form loads (no approval error message)
- [ ] **Test 3.4.6:** Fill out minimal submission form (title, category, abstract, supervisor)
- [ ] **Test 3.4.7:** Click "Submit"
- [ ] **Test 3.4.8:** Verify submission created successfully
- [ ] **Test 3.4.9:** Verify no RLS 403 errors in console

---

## SECTION 4: Edge Cases and Error Handling

### 4.1 Applicant Status Changes During Session
- [ ] **Test 4.1.1:** Login as unapproved applicant, see pending approval page
- [ ] **Test 4.1.2:** In another browser/tab, admin approves this applicant
- [ ] **Test 4.1.3:** In original tab, refresh page or navigate
- [ ] **Test 4.1.4:** Verify user sees updated is_approved=TRUE from DB
- [ ] **Test 4.1.5:** Verify can now access `/dashboard`
- [ ] **Test 4.1.6:** Verify no stale data shown

### 4.2 Logout and Re-login After Approval
- [ ] **Test 4.2.1:** Login as unapproved applicant
- [ ] **Test 4.2.2:** Verify redirected to `/pending-approval`
- [ ] **Test 4.2.3:** Click "Log Out" button
- [ ] **Test 4.2.4:** Verify logged out and redirected to `/login`
- [ ] **Test 4.2.5:** Admin approves the applicant (in another session)
- [ ] **Test 4.2.6:** Re-login with same credentials
- [ ] **Test 4.2.7:** Verify NOT redirected to `/pending-approval`
- [ ] **Test 4.2.8:** Verify `/dashboard` is accessible

### 4.3 Concurrent Actions
- [ ] **Test 4.3.1:** Have 2 admin sessions open
- [ ] **Test 4.3.2:** In session A, approve applicant X
- [ ] **Test 4.3.3:** In session B, attempt to approve same applicant X
- [ ] **Test 4.3.4:** Verify session B gets updated list (no duplicate approve)
- [ ] **Test 4.3.5:** Verify database shows only 1 approval record

### 4.4 Database Consistency
- [ ] **Test 4.4.1:** Create new applicant, verify is_approved=FALSE
- [ ] **Test 4.4.2:** Manually check migration ran: `SELECT * FROM users WHERE role='applicant' LIMIT 1`
- [ ] **Test 4.4.3:** Verify all applicants have is_approved value (not NULL)
- [ ] **Test 4.4.4:** Run: `SELECT COUNT(*) FROM users WHERE role='applicant' AND is_approved IS NULL`
- [ ] **Test 4.4.5:** Expect 0 rows (no NULL is_approved)
- [ ] **Test 4.4.6:** Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename='users'`
- [ ] **Test 4.4.7:** Look for idx_users_pending_applicants index

---

## SECTION 5: UI/UX Validation

### 5.1 PendingApprovalPage Appearance
- [ ] **Test 5.1.1:** Login as unapproved applicant
- [ ] **Test 5.1.2:** Verify page layout is centered and responsive
- [ ] **Test 5.1.3:** Verify page works on mobile (320px, 768px, 1024px widths)
- [ ] **Test 5.1.4:** Verify gradient background displays correctly
- [ ] **Test 5.1.5:** Verify clock icon appears
- [ ] **Test 5.1.6:** Verify "Account Under Review" heading is prominent
- [ ] **Test 5.1.7:** Verify timeline info box shows estimated review time
- [ ] **Test 5.1.8:** Verify all buttons have hover effects
- [ ] **Test 5.1.9:** Verify Support link mailto works (verify email client opens)

### 5.2 AdminPendingApplicants Component
- [ ] **Test 5.2.1:** Admin navigates to dashboard
- [ ] **Test 5.2.2:** Pending applicants section is visible
- [ ] **Test 5.2.3:** Clock icon and title are clear
- [ ] **Test 5.2.4:** Pending count badge displays correctly
- [ ] **Test 5.2.5:** List items show all required info (name, email, days waiting)
- [ ] **Test 5.2.6:** Approve button is green and accessible
- [ ] **Test 5.2.7:** Reject button is red border and accessible
- [ ] **Test 5.2.8:** Rejection reason textarea appears on rejection click
- [ ] **Test 5.2.9:** Empty state shows when no pending applicants
- [ ] **Test 5.2.10:** Success/error messages appear and auto-dismiss after 5 seconds

### 5.3 Accessibility
- [ ] **Test 5.3.1:** Tab through `/pending-approval` page
- [ ] **Test 5.3.2:** Verify all buttons are keyboard accessible
- [ ] **Test 5.3.3:** Verify screen reader can read headings and descriptions
- [ ] **Test 5.3.4:** Verify color contrast meets WCAG AA standards
- [ ] **Test 5.3.5:** Test on mobile with touch targets (44px minimum)

---

## SECTION 6: Security Tests

### 6.1 Non-Admin Cannot Access Pending List
- [ ] **Test 6.1.1:** Login as supervisor (non-admin)
- [ ] **Test 6.1.2:** Navigate to `/dashboard/analytics`
- [ ] **Test 6.1.3:** Verify AdminDashboard NOT loaded (verify in UI or check role-based rendering)
- [ ] **Test 6.1.4:** Verify SupervisorDashboard or other role dashboard loads instead
- [ ] **Test 6.1.5:** Verify no "Pending Applicants" section visible

### 6.2 RLS Policy Enforcement
- [ ] **Test 6.2.1:** Login as unapproved applicant
- [ ] **Test 6.2.2:** Open browser DevTools → Network tab
- [ ] **Test 6.2.3:** Attempt to directly INSERT into `ip_records` table via Supabase client:
  ```javascript
  const { error } = await supabase.from('ip_records').insert({
    applicant_id: userId,
    title: 'Test IP',
    category: 'patent'
  });
  console.log(error); // Should see RLS permission denied
  ```
- [ ] **Test 6.2.4:** Verify error message includes "RLS policy" or "permission denied"
- [ ] **Test 6.2.5:** Verify no record is inserted in database

### 6.3 Authentication Required
- [ ] **Test 6.3.1:** Logout completely
- [ ] **Test 6.3.2:** Try accessing `/admin/pending-applicants` directly (if route exists)
- [ ] **Test 6.3.3:** Verify redirected to `/login`
- [ ] **Test 6.3.4:** Verify not shown any applicant data in source/network

### 6.4 Data Privacy
- [ ] **Test 6.4.1:** Verify applicants can only see their own profile
- [ ] **Test 6.4.2:** Verify applicants cannot access other applicants' submissions
- [ ] **Test 6.4.3:** Verify admin can view all applicant data for approval purpose
- [ ] **Test 6.4.4:** Verify no applicant emails leaked in frontend HTML (check source)
- [ ] **Test 6.4.5:** Verify no applicant data in browser console/network without auth

---

## SECTION 7: Performance & Load Testing

### 7.1 Dashboard Load Time
- [ ] **Test 7.1.1:** Login as admin
- [ ] **Test 7.1.2:** Navigate to AdminDashboard
- [ ] **Test 7.1.3:** Open DevTools Performance tab, reload
- [ ] **Test 7.1.4:** Verify page loads in < 3 seconds
- [ ] **Test 7.1.5:** Verify no UI jank or layout shift when pending applicants load
- [ ] **Test 7.1.6:** Measure CLS (Cumulative Layout Shift) < 0.1

### 7.2 Bulk Approval Performance
- [ ] **Test 7.2.1:** Create 10 test applicants
- [ ] **Test 7.2.2:** Admin views pending list (should show all 10)
- [ ] **Test 7.2.3:** Measure query time for fetching 10 pending applicants
- [ ] **Test 7.2.4:** Approve 5 applicants one by one
- [ ] **Test 7.2.5:** Verify no slowdown in approval button response
- [ ] **Test 7.2.6:** Verify database indexes are being used (`EXPLAIN` query analysis)

### 7.3 Large Database Scenario
- [ ] **Test 7.3.1:** Simulate database with 1000+ applicants
- [ ] **Test 7.3.2:** Query pending applicants (should be small subset)
- [ ] **Test 7.3.3:** Verify index on (role, is_approved) is used
- [ ] **Test 7.3.4:** Verify query returns results in < 200ms

---

## SECTION 8: Integration Tests

### 8.1 Registration → Approval → Submission Flow
- [ ] **Test 8.1.1:** Create new applicant account (end-to-end)
- [ ] **Test 8.1.2:** Verify email verification works
- [ ] **Test 8.1.3:** Verify can login but see pending approval
- [ ] **Test 8.1.4:** Have admin approve in separate session
- [ ] **Test 8.1.5:** Have applicant re-login
- [ ] **Test 8.1.6:** Verify can now submit IP record
- [ ] **Test 8.1.7:** Verify submission appears in supervisor queue
- [ ] **Test 8.1.8:** Verify no approval-related errors in console/logs

### 8.2 Approval + Supervisor Assignment
- [ ] **Test 8.2.1:** Approve applicant
- [ ] **Test 8.2.2:** Have applicant submit IP with supervisor
- [ ] **Test 8.2.3:** Verify supervisor receives notification
- [ ] **Test 8.2.4:** Verify supervisor can review submission
- [ ] **Test 8.2.5:** Verify workflow continues normally after approval

### 8.3 Activity Logging
- [ ] **Test 8.3.1:** Admin approves applicant
- [ ] **Test 8.3.2:** Check `activity_logs` table for entry
- [ ] **Test 8.3.3:** Verify action = 'approve_applicant'
- [ ] **Test 8.3.4:** Verify admin ID is recorded
- [ ] **Test 8.3.5:** Verify timestamp is current
- [ ] **Test 8.3.6:** Verify details include applicant info

---

## SECTION 9: Database Migration Validation

### 9.1 Migration Application
- [ ] **Test 9.1.1:** Backup production database
- [ ] **Test 9.1.2:** Apply migration using: `supabase db push`
- [ ] **Test 9.1.3:** Verify migration runs without errors
- [ ] **Test 9.1.4:** Verify migration takes < 30 seconds
- [ ] **Test 9.1.5:** Verify no tables locked during migration

### 9.2 Column Existence
- [ ] **Test 9.2.1:** Query: `SELECT is_approved FROM users LIMIT 1`
- [ ] **Test 9.2.2:** Verify column exists with type BOOLEAN
- [ ] **Test 9.2.3:** Query: `SELECT approved_at FROM users LIMIT 1`
- [ ] **Test 9.2.4:** Verify column exists with type TIMESTAMPTZ
- [ ] **Test 9.2.5:** Query: `SELECT approved_by FROM users LIMIT 1`
- [ ] **Test 9.2.6:** Verify column exists with type UUID
- [ ] **Test 9.2.7:** Query: `SELECT rejected_at FROM users LIMIT 1`
- [ ] **Test 9.2.8:** Query: `SELECT rejection_reason FROM users LIMIT 1`

### 9.3 Default Values
- [ ] **Test 9.3.1:** Insert new user record without specifying is_approved
- [ ] **Test 9.3.2:** Verify is_approved defaults to TRUE
- [ ] **Test 9.3.3:** Insert applicant record (register-user function)
- [ ] **Test 9.3.4:** Verify is_approved is FALSE (set by function, not default)

### 9.4 RLS Policies
- [ ] **Test 9.4.1:** Check policies exist: `SELECT * FROM pg_policies WHERE tablename='ip_records'`
- [ ] **Test 9.4.2:** Verify policy "Applicants can create their own IP records" exists
- [ ] **Test 9.4.3:** Verify policy includes is_approved check
- [ ] **Test 9.4.4:** Test policy in unapproved state (should fail INSERT)
- [ ] **Test 9.4.5:** Test policy in approved state (should succeed INSERT)

---

## SECTION 10: Rollback Plan (Contingency)

### 10.1 Emergency Rollback Steps
If critical issue found:

1. **Stop the deployment** - Do not deploy to production
2. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   npm run build
   ```
3. **Revert database migration** (Supabase):
   ```sql
   -- Revert RLS policies
   DROP POLICY IF EXISTS "Applicants can create their own IP records (must be approved)" ON ip_records;
   -- Restore original policy...
   
   -- Drop new columns (CAUTION: loses data)
   ALTER TABLE users DROP COLUMN IF EXISTS is_approved;
   ALTER TABLE users DROP COLUMN IF EXISTS approved_at;
   ALTER TABLE users DROP COLUMN IF EXISTS approved_by;
   ALTER TABLE users DROP COLUMN IF EXISTS rejected_at;
   ALTER TABLE users DROP COLUMN IF EXISTS rejection_reason;
   ```

### 10.2 Rollback Testing
- [ ] **Test 10.2.1:** Practice rollback steps in staging environment
- [ ] **Test 10.2.2:** Verify all systems functional after rollback
- [ ] **Test 10.2.3:** Verify no data corruption after rollback

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | _________________ | _________ | _______ |
| Developer | _________________ | _________ | _______ |
| Admin/Product | _________________ | _________ | _______ |

**Total Tests:** 120+  
**Pass Criteria:** All tests passed, no critical issues, backward compatibility verified

---

**Notes for Testers:**
- Test on Chrome, Firefox, Safari (desktop + mobile)
- Test with real data when possible (avoid dummy data for approval tests)
- Document any issues with severity level (Critical/High/Medium/Low)
- Run full test suite twice (once before, once after code changes)
- Keep test logs for audit trail
