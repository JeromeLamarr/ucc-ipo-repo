-- Verification Script: Applicant Approval Workflow
-- Run these queries in Supabase SQL Editor to validate the fix
-- Expected date: 2026-02-25 onwards

-- =============================================================================
-- TEST 1: Verify column default is now FALSE
-- =============================================================================
-- Query: Check is_approved column default
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_approved'
AND table_schema = 'public';

-- Expected result:
-- column_name: is_approved
-- data_type: boolean
-- is_nullable: false
-- column_default: false (NOT TRUE)

-- =============================================================================
-- TEST 2: Count applicants by approval status (BEFORE admin approves)
-- =============================================================================
-- Query: Check pending applicants
SELECT 
  role,
  is_approved,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM users
WHERE role = 'applicant'
GROUP BY role, is_approved
ORDER BY is_approved;

-- Expected result for new applicants:
-- role         | is_approved | count | oldest            | newest
-- applicant    | false       | X     | 2026-02-25...     | 2026-02-25...
-- applicant    | true        | Y     | (older pre-fix)   | (older pre-fix)

-- =============================================================================
-- TEST 3: Verify trigger explicitly sets is_approved for new applicants
-- =============================================================================
-- Query: Check function source code (see is_approved_val :=)
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_verified_user';

-- Expected: Should see:
-- is_approved_val := CASE 
--   WHEN role_val = 'applicant' THEN FALSE
--   ELSE TRUE
-- END;

-- =============================================================================
-- TEST 4: Find the test applicant from the bug report
-- =============================================================================
-- Query: Check the problematic user
SELECT 
  id,
  email,
  full_name,
  role,
  is_approved,
  created_at,
  approved_at,
  rejected_at
FROM users
WHERE id = '67750368-eb29-4454-8618-0d618777439a'
OR email LIKE '%test%'
OR email LIKE '%prod-test%'
LIMIT 20;

-- Expected for new test user (created after fix):
-- is_approved: false
-- approved_at: NULL (until admin approves)

-- =============================================================================
-- TEST 5: Verify non-applicant roles still default to TRUE
-- =============================================================================
-- Query: Check admin/supervisor/evaluator users
SELECT 
  id,
  email,
  role,
  is_approved,
  created_at
FROM users
WHERE role IN ('admin', 'supervisor', 'evaluator')
LIMIT 10;

-- Expected: All should have is_approved = true

-- =============================================================================
-- TEST 6: Sanity check - No applicants should have NULL is_approved
-- =============================================================================
-- Query: Check for NULL is_approved values
SELECT COUNT(*) as count_null_is_approved
FROM users
WHERE is_approved IS NULL;

-- Expected: 0 (all rows should have explicit TRUE or FALSE)

-- =============================================================================
-- TEST 7: Verify RLS policies still work for unapproved applicants
-- =============================================================================
-- Query: Check RLS function (this should not change with the migration)
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'is_approved_applicant_or_privileged';

-- Expected: Should still check (role != 'applicant' OR (role = 'applicant' AND is_approved = true))

-- =============================================================================
-- CLEANUP: Remove test data (optional - only run if needed to clean up test users)
-- =============================================================================
-- WARNING: Uncomment only if you want to delete test users
-- DELETE FROM users WHERE email LIKE '%test%' AND created_at > NOW() - INTERVAL '1 day';
-- DELETE FROM auth.users WHERE email LIKE '%test%' AND created_at > NOW() - INTERVAL '1 day';
