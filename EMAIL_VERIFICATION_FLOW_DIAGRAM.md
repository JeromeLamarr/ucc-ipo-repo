EMAIL VERIFICATION FLOW - BEFORE & AFTER
=========================================

BEFORE FIX (BROKEN FLOW)
========================

User clicks verification link
         ↓
Supabase Auth verifies token
         ↓
auth.users.email_confirmed_at = NOW()
         ↓
Trigger: on_auth_user_verified fires
         ↓
Function: handle_verified_user() starts
         ↓
❌ PROBLEM: Extract raw_user_meta_data->>'full_name'
          (May be NULL if not provided)
         ↓
full_name_val = NULL
         ↓
INSERT INTO public.users (full_name, ...)
VALUES (NULL, ...)
         ↓
❌ FAILS: Column full_name has NOT NULL constraint
         ↓
Function throws exception
         ↓
Trigger fails
         ↓
Database error returned to frontend
         ↓
/auth/callback?error=server_error&error_description=Database+error+updating+user
         ↓
❌ User sees ERROR PAGE instead of /pending-approval
         ↓
User cannot complete registration


ADDITIONAL PROBLEM: RLS POLICY BLOCKING
========================================

Even if full_name issue fixed:

Function tries: INSERT INTO public.users (...)
         ↓
RLS Policy evaluates: "Admins can create users"
         ↓
Check: EXISTS (SELECT 1 FROM users 
              WHERE auth_user_id = auth.uid() 
              AND role = 'admin')
         ↓
Auth.uid() = newly verified user ID
         ↓
❌ User not in public.users table yet!
         ↓
❌ Check returns false
         ↓
❌ RLS policy denies INSERT
         ↓
Database error: "violates row level security policy"
         ↓
❌ Same error: Database+error+updating+user
         ↓
User stuck on error page


AFTER FIX (WORKING FLOW)
========================

User clicks verification link
         ↓
Supabase Auth verifies token
         ↓
auth.users.email_confirmed_at = NOW()
         ↓
Trigger: on_auth_user_verified fires
         ↓
Function: handle_verified_user() starts
         ↓
✅ FIX 1: Safely extract full_name with defaults
full_name_val := COALESCE(
  temp_data.full_name,
  NEW.raw_user_meta_data->>'full_name',
  'User'  ← Fallback if both NULL
)
         ↓
full_name_val = 'User' (guaranteed non-NULL)
         ↓
✅ FIX 2: Safely extract department_id with error handling
IF NEW.raw_user_meta_data ? 'department_id' THEN
  BEGIN
    department_id_val := cast_to_uuid(...)
  EXCEPTION WHEN OTHERS THEN
    department_id_val := NULL  ← Graceful fallback
  END
END
         ↓
department_id_val = NULL (safe fallback)
         ↓
✅ FIX 3: Validate enum value
IF role = 'invalid' THEN role := 'applicant' END
         ↓
role = 'applicant' (always valid)
         ↓
INSERT INTO public.users (
  auth_user_id, email, full_name, department_id, role, is_approved, ...
) VALUES (
  auth.uid(), 'test@example.com', 'User', NULL, 'applicant', FALSE, ...
)
         ↓
✅ FIX 4: RLS Policy allows insert now!
Policy: "Users can create own profile"
Check: auth_user_id = auth.uid() ✓ MATCH!
         ↓
✓ RLS policy ALLOWS INSERT
         ↓
INSERT succeeds
         ↓
New user record created in public.users:
  auth_user_id: '12345...'
  email: 'test@example.com'
  full_name: 'User'
  role: 'applicant'
  is_approved: FALSE
  created_at: NOW()
         ↓
Function returns NEW (success)
         ↓
Trigger completes
         ↓
Frontend continues with /auth/callback
         ↓
AuthContext fetches user profile
         ↓
✓ Profile found in public.users
         ↓
ProtectedRoute checks: is_approved = FALSE && role = 'applicant'
         ↓
✓ Redirects to /pending-approval
         ↓
✅ User sees: PENDING APPROVAL PAGE
         ↓
✅ User successfully registered
         ↓
✅ Waiting for admin approval


DATA FLOW COMPARISON
====================

BEFORE (Full Failure):
┌─────────────┐          ┌──────────────┐
│ auth.users  │ TRIGGER  │ public.users │
│ (created)   │ ------X→ │ (never)      │
└─────────────┘          └──────────────┘
       ✓                         ❌
   Email works             Record never created

AFTER (Complete Success):
┌─────────────┐          ┌──────────────┐
│ auth.users  │ TRIGGER  │ public.users │
│ (created)   │ ------→  │ (created)    │
└─────────────┘          └──────────────┘
       ✓                         ✓
   Email works          Record created successfully


KEY IMPROVEMENTS BY COMPONENT
==============================

RLS Policies:
  New: "Users can create own profile"
       Allows new user to insert own record
       Check: auth_user_id = auth.uid()
  
  New: "Service functions can manage users"
       Allows SECURITY DEFINER functions to insert
       Check: current_user != 'authenticated'
  
  Result: Trigger gains permission to INSERT

Function Defensive Programming:
  OLD: full_name := raw_metadata->>'full_name'  (may be NULL)
  NEW: full_name := COALESCE(..., 'User')      (never NULL)
  
  OLD: dept_id := raw_metadata->>'dept_id'::UUID  (may error)
  NEW: BEGIN ... EXCEPTION ... END              (error safe)
  
  OLD: role := raw_metadata->>'role'             (may be invalid)
  NEW: IF role NOT IN (...) THEN role = 'app'   (validated)
  
  Result: Function never crashes on edge cases

Race Condition Prevention:
  OLD: IF NOT EXISTS (...) THEN INSERT
  NEW: IF NOT EXISTS (... FOR UPDATE SKIP LOCKED) THEN INSERT
  
  Result: Safe concurrent execution

Error Handling:
  OLD: Exception thrown → Function fails → Trigger fails → Error
  NEW: Exception caught → Logged → Re-raised → Visible in logs
  
  Result: Better debugging capability


AFFECTED SCENARIOS
==================

Scenario 1: User provides full name in registration
  BEFORE: ❌ Metadata extracted but might be NULL anyway
  AFTER:  ✅ Used from temp_registrations (more reliable)

Scenario 2: User doesn't provide department ID
  BEFORE: ❌ Crashes on invalid/missing UUID
  AFTER:  ✅ Gracefully uses NULL (allowed by FK)

Scenario 3: User registers as admin
  BEFORE: ❌ RLS blocks insert even with valid data
  AFTER:  ✅ RLS policy "service functions" allows it

Scenario 4: Metadata missing entirely
  BEFORE: ❌ Function crashes
  AFTER:  ✅ Uses fallback defaults (full_name='User', etc)

Scenario 5: Invalid role in metadata
  BEFORE: ❌ Enum constraint violation
  AFTER:  ✅ Validated to 'applicant' before insert

Scenario 6: Concurrent verification requests
  BEFORE: ❌ Possible duplicate key errors
  AFTER:  ✅ FOR UPDATE SKIP LOCKED prevents duplicates


SUCCESS CRITERIA
================

Fix is successful when:

1. Email Verification Works
   ✅ User can complete /register → verify email → see /pending-approval
   ✅ No "Database error updating user" messages
   ✅ User record created in public.users

2. Data Integrity
   ✅ All applicants have is_approved = FALSE
   ✅ All non-applicants have is_approved = TRUE
   ✅ No NULL values in required columns
   ✅ All role values are valid enums

3. Error Handling
   ✅ Graceful fallbacks for missing data
   ✅ No crashes on invalid metadata
   ✅ Helpful warning messages in logs
   ✅ Clear error messages for debugging

4. RLS Compliance
   ✅ Users can only see/modify own records
   ✅ Admins can manage all users
   ✅ Service triggers can create records
   ✅ Approval workflow is enforced

5. Performance
   ✅ No increase in query time
   ✅ No new bottlenecks
   ✅ Efficient fallback chains
   ✅ Minimal logging overhead

6. Backward Compatibility
   ✅ Existing users unaffected
   ✅ No breaking changes
   ✅ No data migration needed
   ✅ No frontend changes required


MONITORING METRICS
==================

After deployment, monitor:

1. Error Reduction
   Before: "Database error updating user" appears frequently
   After:  Should drop to ~0
   Target: 100% reduction in this error

2. User Registration Success Rate
   Before: May be ~80-90% (due to verification failures)
   After:  Should be 100%
   Monitor: Count of users reaching /pending-approval

3. NULL Values
   Before: May have NULL in columns
   After:  Should have 0 NULLs in required columns
   Query: SELECT COUNT(*) FROM users WHERE full_name IS NULL

4. Invalid Enums
   Before: May have invalid role values
   After:  Should only see: applicant, supervisor, evaluator, admin
   Query: SELECT DISTINCT role FROM users

5. is_approved Distribution
   Before: Inconsistent (some bugs in assignment)
   After:  Applicants = FALSE, Others = TRUE
   Query: SELECT role, is_approved, COUNT(*) FROM users 
          GROUP BY role, is_approved

6. Function Warnings
   Before: None (or hidden)
   After:  Should see occasional warnings for edge cases
   Monitor: Supabase function logs for RAISE WARNING


DEPLOYMENT READINESS CHECKLIST
===============================

Pre-Deployment:
  [ ] Understand the root cause (RLS + missing defaults)
  [ ] Review all 4 documentation files
  [ ] Have backup of current migration state
  [ ] Plan staging test (at least 5 test users)
  [ ] Notify team of upcoming deployment

Staging Deployment:
  [ ] Apply migration to staging Supabase project
  [ ] Run verification queries
  [ ] Test full registration flow (5+ times)
  [ ] Check database state after each test
  [ ] Monitor logs for warnings
  [ ] Verify existing users still work

Production Deployment:
  [ ] Schedule during low-traffic window
  [ ] Apply migration to production
  [ ] Run verification queries immediately
  [ ] Test with real user registration
  [ ] Monitor error logs for 1 hour
  [ ] Verify no increase in error rates
  [ ] Notify team of successful deployment

Post-Deployment:
  [ ] Daily monitoring for 1 week
  [ ] Track registration success rate
  [ ] Document any issues found
  [ ] Update team documentation
  [ ] Celebrate fix with team! 🎉
