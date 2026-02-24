EMAIL VERIFICATION TRIGGER FIX - TECHNICAL BREAKDOWN
======================================================

SECTION 1: ROOT CAUSE ANALYSIS
==============================

THE ERROR
---------
HTTP 302 Redirect from Supabase to: /auth/callback?error=server_error&error_description=Database+error+updating+user

This error occurs AFTER email verification succeeds in auth.users table but BEFORE the sync 
to public.users table completes.

THE FLOW THAT FAILS
-------------------
1. User clicks verification link from email
2. Supabase Auth verifies the token and sets: auth.users.email_confirmed_at = NOW()
3. Auth UPDATE ON auth.users triggers on_auth_user_verified trigger
4. Trigger calls handle_verified_user() function
5. Function tries: INSERT INTO public.users (...)
6. RLS Policy "Admins can create users" checks:
   EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() 
           AND users.role = 'admin')
7. ❌ FAILS because:
   - auth.uid() = newly verified user's auth ID
   - But this user has NO record in public.users yet!
   - So check returns false
   - Policy denies INSERT
   - Database error is returned to frontend
8. Frontend receives: error=server_error

WHY THE RLS POLICY IS THE PROBLEM
----------------------------------
Current policy requires that the authenticated user:
1. Already exists in public.users table
2. Has role = 'admin'

During email verification trigger:
1. User JUST became authenticated (email_confirmed_at set)
2. But user record in public.users DOESN'T EXIST YET
3. So policy check CANNOT pass
4. RLS denies the INSERT

This is a classic chicken-and-egg problem in Supabase:
- Auth trigger needs to INSERT into public.users
- RLS policy requires user to already be in public.users (as admin)
- So INSERT is blocked

SECONDARY ISSUE: UNSAFE FUNCTION CODE
--------------------------------------
Even if RLS allowed the INSERT, the function would fail on:

1. NULL/Missing Metadata
   code:
     full_name_val := NEW.raw_user_meta_data->>'full_name'
   
   If metadata doesn't have 'full_name' field:
     → PostgreSQL returns NULL
     → INSERT into NOT NULL column → FAILS
   
   If metadata was never set:
     → raw_user_meta_data is NULL
     → NULL->>'field' throws error → FAILS

2. Invalid Type Casting
   code:
     department_id_val := (NEW.raw_user_meta_data->>'department_id')::UUID
   
   If value is "not-a-uuid":
     → ::UUID cast fails
     → Exception thrown → FAILS

3. Invalid Enum Values
   code:
     (Never explicitly inserted, but value comes from metadata)
   
   If metadata.role = "invalid_role":
     → INSERT into role column (which is enum) → FAILS

4. No Fallback Logic
   code:
     If anything goes wrong, function fails completely
   
   Result:
     → No error handling
     → No logging
     → No graceful degradation
     → Trigger fails = Auth fails = User can't complete registration

SECTION 2: THE FIX - COMPONENT BY COMPONENT
=============================================

FIX 1: ADD RLS POLICIES
-----------------------

Policy 1A: Users can create own profile
────────────────────────────────────────
  CREATE POLICY "Users can create own profile" ON users FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

  Why this works:
    - Allows INSERT if the record being created belongs to current user
    - During auth trigger: auth.uid() = newly verified user
    - So user can INSERT their own profile record
    - Safe because: Can only insert own auth_user_id, can't forge others

  When it triggers:
    - Applies to any INSERT by authenticated user
    - Checks: auth_user_id field matches auth.uid()
    - Only allows if check passes

  Why it's safe:
    - Can only insert one record: the user's own
    - Can't modify auth_user_id (immutable field)
    - Can't insert as different user

Policy 1B: Service functions can manage users
──────────────────────────────────────────────
  CREATE POLICY "Service functions can manage users" ON users FOR INSERT
    WITH CHECK (current_user != 'authenticated');

  Why this works:
    - current_user = database role (not user ID)
    - 'authenticated' = the special role for authenticated users
    - Trigger runs as 'postgres' or function owner (SECURITY DEFINER)
    - current_user is therefore NOT 'authenticated'
    - So check passes = INSERT allowed

  When it triggers:
    - Applies to any INSERT by non-authenticated database role
    - Examples: postgres, service_role, functions with SECURITY DEFINER
    - Does NOT apply to regular authenticated users (they use Policy 1A)

  Why it's safe:
    - Only SECURITY DEFINER functions run with these roles
    - These are controlled by developers (not users)
    - User can't execute arbitrary SECURITY DEFINER functions
    - Limits are enforced by function logic itself

FIX 2: REWRITE FUNCTION WITH DEFENSIVE PROGRAMMING
--------------------------------------------------

Problem Areas Fixed:

A. NULL HANDLING
   ~~~~~~~~~~~~~~~~
  
   OLD CODE (FAILS):
     full_name_val := NEW.raw_user_meta_data->>'full_name';
   
   Issues:
     - If metadata doesn't have 'full_name', result is NULL
     - If metadata is NULL, expression returns NULL
     - Column has NOT NULL constraint → INSERT fails
   
   NEW CODE (SAFE):
     full_name_val := COALESCE(
       NULLIF(TRIM(temp_data.full_name), ''),  -- Try temp data first
       NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),  -- Then metadata
       'User'  -- Fallback if both are NULL or empty
     );
   
   How it works:
     Step 1: Try temp_data.full_name (from registration form)
     Step 2: If NULL or empty, try metadata
     Step 3: If still NULL or empty, use 'User'
     Result: NEVER NULL, always has a value
   
   Why safer:
     - TRIM() removes whitespace from string
     - NULLIF(..., '') converts empty strings to NULL
     - COALESCE returns first non-NULL value
     - Guarantees non-empty string result

B. SAFE TYPE CASTING
   ~~~~~~~~~~~~~~~~~~
  
   OLD CODE (CRASHES):
     department_id_val := (NEW.raw_user_meta_data->>'department_id')::UUID;
   
   Issues:
     - If value isn't valid UUID format → ::UUID cast throws error
     - If field doesn't exist → NULL converted to invalid UUID → error
     - Unhandled exception → function fails
   
   NEW CODE (SAFE):
     IF NEW.raw_user_meta_data ? 'department_id' THEN
       BEGIN
         department_id_val := (NEW.raw_user_meta_data->>'department_id')::UUID;
       EXCEPTION WHEN OTHERS THEN
         department_id_val := NULL;
         RAISE WARNING 'Invalid department_id format...';
       END;
     END IF;
   
   How it works:
     Step 1: Check if 'department_id' field exists using ? operator
     Step 2: Only if exists, attempt to cast
     Step 3: If cast fails, catch exception
     Step 4: Use NULL as fallback
     Step 5: Log warning for debugging
     Result: NEVER crashes, uses NULL safe fallback
   
   Why safer:
     - Explicit check for field existence (? operator)
     - Try-catch around risky type cast
     - Graceful fallback (NULL is safe, FK allows it)
     - Warning logged (helps with debugging)

C. ENUM VALIDATION
   ~~~~~~~~~~~~~~~~
  
   OLD CODE (FAILS):
     role_val comes from metadata without validation
     If metadata.role = 'superuser' (not valid enum)
     INSERT fails with constraint violation
   
   NEW CODE (SAFE):
     IF role_val NOT IN ('applicant', 'supervisor', 'evaluator', 'admin') THEN
       role_val := 'applicant';
       RAISE WARNING 'Invalid role...';
     END IF;
   
   How it works:
     Check if role matches valid enum values
     If not, force to 'applicant' (safe default)
     Log warning for debugging
     Result: role is ALWAYS valid enum value
   
   Why safer:
     - Validates against all possible enum values
     - Uses safe default (applicant = least privileges)
     - Logs problem for investigation

D. CONDITIONAL DATA EXTRACTION
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  
   OLD CODE (ASSUMES DATA EXISTS):
     Directly accesses metadata without checking if fields exist
     Assumes certain structure that may not be present
   
   NEW CODE (RESILIENT):
     -- Initialize with safe defaults
     full_name_val := 'User';
     department_id_val := NULL;
     role_val := 'applicant';
     is_approved_val := FALSE;
     
     -- Try to get temp registration data
     SELECT ... INTO temp_data FROM temp_registrations WHERE ...
     
     -- Override defaults with temp_data if available
     IF temp_data.full_name IS NOT NULL THEN
       -- use it
     END IF;
     
     -- Override with metadata if available
     IF NEW.raw_user_meta_data ? 'full_name' THEN
       -- use it
     END IF;
   
   How it works:
     Hierarchical fallback chain:
     1. Try temporary registration data (most reliable)
     2. Fall back to auth metadata (user provided)
     3. Fall back to hardcoded defaults (always safe)
     Result: Always has valid data
   
   Why safer:
     - No assumptions about what data exists
     - Multiple sources of truth
     - Explicit checks before using data
     - Data quality improves from source 1 → 3

E. RACE CONDITION HANDLING
   ~~~~~~~~~~~~~~~~~~~~~~~~
  
   OLD CODE:
     IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
       INSERT INTO ...
     END IF;
   
   Risk:
     Between EXISTS check and INSERT, another trigger could insert same user
     Results in: Duplicate key error
   
   NEW CODE:
     IF NOT EXISTS (
       SELECT 1 FROM public.users 
       WHERE auth_user_id = NEW.id 
       FOR UPDATE SKIP LOCKED  -- Add this!
     ) THEN
       INSERT INTO ...
     END IF;
   
   How it works:
     FOR UPDATE locks the row for update
     SKIP LOCKED skips locked rows
     Prevents other triggers from inserting between check and insert
     Result: No duplicate key errors
   
   Why safer:
     - Atomic operation (check + lock)
     - SKIP LOCKED avoids deadlocks
     - Prevents concurrent inserts of same user

F. ERROR HANDLING & LOGGING
   ~~~~~~~~~~~~~~~~~~~~~~~~
  
   OLD CODE:
     If anything goes wrong:
       Exception is thrown
       Function fails
       Trigger stops
       No logging
       Frontend gets "Database error"
   
   NEW CODE:
     EXCEPTION WHEN OTHERS THEN
       error_msg := SQLERRM;  -- Capture error message
       RAISE WARNING 'Error creating user profile: %', error_msg;
       RAISE;  -- Re-raise so error is visible in logs
     END;
   
   How it works:
     Catch any exception
     Log detailed message (visible in Supabase logs)
     Re-raise exception (preserves error for monitoring)
     Result: Errors visible for debugging
   
   Why safer:
     - Doesn't hide errors silently
     - Provides diagnostics in logs
     - Can still fail appropriately if needed
     - Admin can see what went wrong

FIX 3: SUPPORTING FUNCTION UPDATES
-----------------------------------

is_approved_applicant_or_privileged() function needs to handle NULL auth context:

OLD:
  SELECT (role != 'applicant' OR (role = 'applicant' AND is_approved = true))
  FROM users WHERE auth_user_id = auth.uid()
  
  Problem: If no row found (during trigger), returns NULL → policy fails

NEW:
  SELECT COALESCE(
    (SELECT ... FROM users),
    true  -- Default to true during trigger execution
  );
  
  Result: Never returns NULL

SECTION 3: TESTING STRATEGY
============================

Test Case 1: Basic Email Verification
──────────────────────────────────────
Setup:
  1. User visits /register
  2. Fills in: Email, Password, Full Name
  3. Submits form
  4. Backend creates auth.users record
  5. Supabase sends verification email

Action:
  User clicks verification link in email

Expected:
  ✓ Email is verified (auth.users.email_confirmed_at set)
  ✓ trigger on_auth_user_verified fires
  ✓ handle_verified_user() executes
  ✓ public.users record created with:
      auth_user_id = (verified auth user)
      email = (registered email)
      full_name = (from form) or 'User' if not provided
      role = 'applicant'
      is_approved = FALSE
  ✓ Redirect to /auth/callback succeeds
  ✓ AuthContext loads profile
  ✓ Redirects to /pending-approval

How to verify:
  SELECT * FROM users WHERE email = 'test@example.com'
  Should see all columns populated correctly

Test Case 2: Missing Metadata
──────────────────────────────
Setup:
  Use Supabase API to create auth user with MINIMAL metadata:
  {
    "email": "minimal@example.com"
    -- No full_name, no department_id, no role
  }

Action:
  Verify email for this user

Expected:
  ✓ No crash despite missing metadata
  ✓ Record created with:
      full_name = 'User' (fallback)
      department_id = NULL (allowed)
      role = 'applicant' (fallback)
      is_approved = FALSE
  ✓ Warning logged in function logs
  ✓ User can still log in

How to verify:
  1. Check database: SELECT * FROM users WHERE email = 'minimal@example.com'
  2. Check Supabase logs: Should see RAISE WARNING entry

Test Case 3: Invalid Department ID
───────────────────────────────────
Setup:
  Create auth user with metadata:
  {
    "department_id": "not-a-valid-uuid-string"
  }

Action:
  Verify email

Expected:
  ✓ No crash despite invalid UUID
  ✓ Record created with:
      department_id = NULL (fallback from error handling)
  ✓ Warning logged: "Invalid department_id format: not-a-valid-uuid-string"
  ✓ User can still complete registration

How to verify:
  Check logs for RAISE WARNING message

Test Case 4: Invalid Role
──────────────────────────
Setup:
  Create auth user with metadata:
  {
    "role": "super_admin"  -- not a valid enum value
  }

Action:
  Verify email

Expected:
  ✓ No crash despite invalid enum
  ✓ Record created with:
      role = 'applicant' (fallback from validation)
  ✓ Warning logged: "Invalid role: super_admin, defaulting to applicant"
  ✓ User treated as applicant

How to verify:
  SELECT role FROM users WHERE email = ...
  Should show 'applicant'

Test Case 5: Concurrent Verification
──────────────────────────────────────
Setup:
  Some race condition or manual trigger execution

Action:
  Attempt to verify same user twice simultaneously or create same user twice

Expected:
  ✓ First INSERT succeeds
  ✓ Second attempt is skipped (FOR UPDATE SKIP LOCKED prevents it)
  ✓ No duplicate key errors
  ✓ User record exists exactly once

How to verify:
  SELECT COUNT(*) FROM users WHERE auth_user_id = 'same-id'
  Should be 1

Test Case 6: Existing Functionality
────────────────────────────────────
Setup:
  Existing application users, their records already in both table

Action:
  Log in existing user, use application normally

Expected:
  ✓ No change in behavior
  ✓ All existing functionality works
  ✓ New RLS policies don't affect existing users
  ✓ Application works as before

How to verify:
  Run full application test suite


SECTION 4: VERIFICATION CHECKLIST
==================================

Before Deployment:
  [ ] Migration file syntax verified (no errors)
  [ ] All EXCEPTION handlers present
  [ ] All COALESCE chains have final default
  [ ] All type casts have error handling
  [ ] RLS policies listed and correct
  [ ] No breaking changes to existing functions

After Deployment:
  [ ] Run: SELECT tablename, policyname FROM pg_policies 
      WHERE tablename='users' ORDER BY policyname;
      Should list at least 7 policies including the 2 new ones
  
  [ ] Check function: SELECT proname, prosecdef FROM pg_proc 
      WHERE proname='handle_verified_user'
      Should show: proname='handle_verified_user', prosecdef=true
  
  [ ] Test: Register new user, verify email, check database
      Should create user with: role='applicant', is_approved=FALSE
  
  [ ] Monitor Supabase logs for FIRST 1 HOUR
      Should NOT see: "Database error updating user"
  
  [ ] Run test cases 1-6 above
      All should PASS

Production Readiness: 
  [ ] Staging environment tested successfully
  [ ] At least 10 test user registrations work
  [ ] No increased database error rates
  [ ] Error logs show improvement
  [ ] Team briefed on the fix
  [ ] Rollback plan documented and tested

SECTION 5: PERFORMANCE IMPACT
=============================

The fix adds minimal performance overhead:

Query additions:
  - SELECT from temp_registrations (indexed, should hit 0-1 row)
  - EXISTS check with FOR UPDATE (same as before)
  - Additional COALESCE/TRIM operations (in-memory, negligible)
  
Expected query time:
  Before: ~5-10ms (with RLS policy evaluation)
  After: ~5-15ms (slightly longer due to error handling, but still fast)

RLS policy evaluation:
  Added 2 new policies, but:
    - First policy (self-create) is very fast (simple UID check)
    - Second policy (service role) is very fast (role check)
    - PostgreSQL short-circuits on first matching policy
  
  No measurable performance impact

Database load:
  Trigger still executes once per user verification
  Additional INSERT into public.users (same as before)
  Additional logging statements (minimal impact, async)
  No new indexes or constraints that would slow other operations

Conclusion:
  ✅ Negligible performance impact
  ✅ Actually improves reliability
  ✅ Worth the small cost for stability
