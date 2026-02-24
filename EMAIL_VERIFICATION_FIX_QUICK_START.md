QUICK START: Email Verification Fix Deployment
===============================================

THE PROBLEM (In 30 seconds)
❌ Users verify email → get "Database error updating user"  
❌ Root cause: RLS policy blocks trigger from inserting user record  
❌ Trigger function doesn't handle missing/invalid metadata  

THE SOLUTION (In 15 seconds)
✅ Add RLS policy allowing trigger to insert  
✅ Rewrite trigger with safe NULL/type handling  
✅ Validate all data before INSERT  

HOW TO APPLY (5 minutes)
========================

STEP 1: Copy the SQL file
  File: supabase/migrations/20260225_fix_email_verification_trigger.sql
  (Already created in your workspace)

STEP 2: Apply to Supabase
  Option A (Recommended - Via Dashboard):
    1. Open https://app.supabase.com/project/YOUR_PROJECT/sql
    2. Create new query
    3. Copy entire contents of migration file
    4. Click RUN
    5. See "BEGIN; ... COMMIT;" = success

  Option B (Via CLI):
    Terminal: supabase db push

STEP 3: Verify it worked
  Run in SQL Editor:
    SELECT tablename, policyname FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname LIKE '%create%';

  Should see ≥2 new policies:
    ✓ "Users can create own profile"
    ✓ "Service functions can manage users"

STEP 4: Test with real user
  1. Go to /register
  2. Fill form, submit
  3. Check email for verification link
  4. Click the link
  5. Should redirect to /pending-approval (not error page)
  6. Check database:
     SELECT email, role, is_approved FROM users 
     WHERE email = 'YOUR_TEST_EMAIL'
  7. Verify: role='applicant', is_approved=FALSE

DONE! ✅

WHAT WAS CHANGED
================

Before Fix:
  const problem = "RLS policy requires auth.uid() to be existing admin"
                  "But new user isn't in users table yet!"
                  "So INSERT fails with: Database error updating user"

After Fix:
  const solution = "Add policy: Users can create own profile"
                   "This checks: auth_user_id = auth.uid() (safe!)"
                   "Trigger can now INSERT successfully"

  const defensive = "Handle NULLs gracefully"
                    "Validate enum values"
                    "Type cast safely with error handling"
                    "Use fallback defaults"

TROUBLESHOOTING
===============

Q: "Still getting database error"
A: Make sure you applied the ENTIRE migration file including both:
   - The new RLS policies
   - The updated handle_verified_user() function

Q: "How do I know it's working?"
A: After verification, check:
   SELECT * FROM users WHERE email='test@example.com'
   Should see: is_approved=FALSE, role='applicant'

Q: "Do existing users need to re-verify?"
A: No. This only affects NEW registrations after the fix is applied.
   Existing users continue working as before.

Q: "What if I need to rollback?"
A: Run in SQL Editor:
   DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
   DROP FUNCTION IF EXISTS handle_verified_user() CASCADE;
   DROP POLICY IF EXISTS "Users can create own profile" ON users;
   DROP POLICY IF EXISTS "Service functions can manage users" ON users;
   
   Then reapply the old migration from git history.

FILES PROVIDED
==============

1. supabase/migrations/20260225_fix_email_verification_trigger.sql
   → The actual SQL migration to apply to Supabase

2. EMAIL_VERIFICATION_FIX_COMPLETE.md
   → Detailed explanation of every change and why it was needed

3. EMAIL_VERIFICATION_FIX_QUICK_START.md (this file)
   → Quick reference for deployment

KEY CHANGES SUMMARY
===================

RLS Policies Added:
  ✅ "Users can create own profile" - Allows auth trigger to insert
  ✅ "Service functions can manage users" - Allows SECURITY DEFINER functions

handle_verified_user() Function:
  ✅ Now handles NULL raw_user_meta_data
  ✅ Safely casts UUIDs with error handling
  ✅ Validates enum values (role)
  ✅ Uses COALESCE chains for safe defaults
  ✅ Prevents race conditions with FOR UPDATE SKIP LOCKED
  ✅ Has comprehensive error logging

Frontend Changes:
  ✅ NONE - Frontend code requires NO changes
  ✅ App.tsx already has /auth/callback route
  ✅ AuthContext already handles redirect to /pending-approval

TESTING CHECKLIST
=================

After applying fix:

[ ] Test Case 1: New applicant registration
    □ Register new user
    □ Verify email
    □ Check: Redirects to /pending-approval
    □ Check: User in database with is_approved=FALSE, role='applicant'

[ ] Test Case 2: Admin registration
    □ Create user via temp_registrations with role='admin'
    □ Verify email
    □ Check: Redirects to /dashboard (not /pending-approval)
    □ Check: is_approved=TRUE

[ ] Test Case 3: Invalid/missing metadata
    □ Create auth user with minimal metadata
    □ Verify email
    □ Check: No crash, user created with defaults

[ ] Test Case 4: Existing users still work
    □ Log in as existing user
    □ No issues accessing dashboard
    □ Approval workflow works normally

SUPPORT
=======

For detailed explanation of each change, see:
→ EMAIL_VERIFICATION_FIX_COMPLETE.md

For schema and related info:
→ supabase/migrations/ (other migration files)

Questions about the fix?
→ Check the DETAILED ANALYSIS section in EMAIL_VERIFICATION_FIX_COMPLETE.md

Need to rollback?
→ See TROUBLESHOOTING section above
