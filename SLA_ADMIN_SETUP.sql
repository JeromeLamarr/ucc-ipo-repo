-- SQL: Admin Account Setup for SLA Policy Management
-- Purpose: Create or verify admin user has correct role
-- Run as: Service role (or direct database connection)
-- When: Before enabling SLA policy management

-- ==========================================
-- 1. VERIFY ADMIN USER EXISTS
-- ==========================================

SELECT id, email, full_name, role, created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Expected: Should see at least one admin user
-- If empty → Run section 2 to create one

-- ==========================================
-- 2. CREATE OR UPDATE ADMIN USER
-- ==========================================

-- Option A: Promote existing user to admin
-- UNCOMMENT and edit email:
/*
UPDATE users
SET role = 'admin'
WHERE email = 'john@ucc.edu';

-- Verify update
SELECT id, email, role FROM users WHERE email = 'john@ucc.edu';
*/

-- Option B: Create new admin user (requires Supabase auth setup)
-- This should be done via auth UI, but can also be manual:
-- 1. User must exist in auth.users table
-- 2. Then add/update role in public.users table
/*
UPDATE users
SET role = 'admin'
WHERE auth_user_id = 'auth-user-id-here';
*/

-- ==========================================
-- 3. VERIFY RLS POLICIES ALLOW ADMIN ACCESS
-- ==========================================

-- Check that RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'workflow_sla_policies';

-- Expected output:
-- tablename | rowsecurity
-- ---|---
-- workflow_sla_policies | t

-- ==========================================
-- 4. TEST ADMIN CAN READ POLICIES
-- ==========================================

-- Run as admin user (either via frontend or service role):
SELECT id, stage, duration_days, grace_days, is_active
FROM workflow_sla_policies
WHERE is_active = TRUE;

-- Expected: Should return all active policies
-- If error → Check RLS policy "Authenticated users can read..."

-- ==========================================
-- 5. TEST ADMIN CAN UPDATE POLICIES
-- ==========================================

-- Try updating a policy (as admin):
-- This would be done via frontend, but testing approach:
-- UPDATE workflow_sla_policies
-- SET duration_days = 8
-- WHERE stage = 'supervisor_review'
-- RETURNING *;

-- Expected: Successfully updates
-- If RLS violation → Check admin role in database

-- ==========================================
-- 6. VERIFY NON-ADMIN CANNOT MODIFY
-- ==========================================

-- Run as non-admin user:
-- UPDATE workflow_sla_policies
-- SET duration_days = 8
-- WHERE stage = 'supervisor_review';

-- Expected: Error like:
-- "new row violates row-level security policy"
-- Code: PGRST100

-- ==========================================
-- 7. LIST ALL RLS POLICIES ON TABLE
-- ==========================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'workflow_sla_policies'
ORDER BY policyname;

-- Expected: 4 rows for SELECT, INSERT, UPDATE, DELETE

-- ==========================================
-- 8. VERIFY SYSTEM FUNCTIONS CAN CREATE STAGES
-- ==========================================

-- These functions are called by edge functions (service role)
-- and should work without RLS blocking:

-- Test: Can service role create stage instance?
-- SELECT create_stage_instance(
--   'ip-record-id-uuid',
--   'supervisor_review',
--   'assigned-user-id-uuid'
-- );

-- Expected: Returns stage instance UUID
-- No RLS error

-- ==========================================
-- 9. CHECK ADMIN DASHBOARD ACCESS
-- ==========================================

-- If implementing SLAPolicyManager component, admins should see:
-- 1. Table of all policies
-- 2. Edit buttons enabled
-- 3. Update succeeded after clicking Save

-- Test scenario:
-- 1. Login as admin
-- 2. Open SLA Policy Manager component
-- 3. Try to update duration_days
-- 4. Should succeed

-- If fails → Check:
-- - User has role = 'admin' in database
-- - RLS policies exist
-- - Component sends update request

-- ==========================================
-- 10. COMMON ADMIN OPERATIONS
-- ==========================================

-- Update evaluation duration from 10 to 7 days:
UPDATE workflow_sla_policies
SET duration_days = 7, updated_at = NOW()
WHERE stage = 'evaluation' AND is_active = TRUE
RETURNING *;

-- Increase grace period for revision requests:
UPDATE workflow_sla_policies
SET grace_days = 5, updated_at = NOW()
WHERE stage = 'revision_requested' AND is_active = TRUE
RETURNING *;

-- Allow extensions on materials request:
UPDATE workflow_sla_policies
SET allow_extensions = TRUE, max_extensions = 3, extension_days = 7, updated_at = NOW()
WHERE stage = 'materials_requested' AND is_active = TRUE
RETURNING *;

-- Disable a policy without deleting:
UPDATE workflow_sla_policies
SET is_active = FALSE, updated_at = NOW()
WHERE stage = 'certificate_issued'
RETURNING *;

-- View all policies:
SELECT 
  id,
  stage,
  duration_days,
  grace_days,
  allow_extensions,
  max_extensions,
  extension_days,
  is_active,
  description,
  updated_at
FROM workflow_sla_policies
ORDER BY stage;

-- ==========================================
-- 11. TROUBLESHOOTING
-- ==========================================

-- Issue: Admin sees "Permission Denied"

-- Check 1: Is user marked as admin?
SELECT email, role FROM users WHERE email = 'admin@ucc.edu';
-- Should show role = 'admin'
-- If role = NULL or something else → UPDATE users SET role = 'admin' WHERE ...

-- Check 2: Is RLS enabled?
SELECT rowsecurity FROM pg_tables WHERE tablename = 'workflow_sla_policies';
-- Should show 't' (true)
-- If 'f' (false) → ALTER TABLE workflow_sla_policies ENABLE ROW LEVEL SECURITY;

-- Check 3: Do RLS policies exist?
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'workflow_sla_policies';
-- Should show 4 (SELECT, INSERT, UPDATE, DELETE)
-- If < 4 → Re-run the RLS migration

-- Check 4: Is admin in the right department/organization?
-- (if your system has department filtering)
SELECT id, email, role, department_id FROM users WHERE role = 'admin';

-- ==========================================
-- 12. ADMIN AUDIT LOG (optional)
-- ==========================================

-- To track who updated SLA policies:
SELECT 
  id,
  stage,
  duration_days,
  created_at,
  updated_at,
  created_by
FROM workflow_sla_policies
ORDER BY updated_at DESC
LIMIT 10;

-- To see which user updated a policy:
SELECT 
  u.email,
  u.full_name,
  wsp.stage,
  wsp.duration_days,
  wsp.updated_at
FROM workflow_sla_policies wsp
LEFT JOIN users u ON u.id = wsp.created_by
ORDER BY wsp.updated_at DESC;

-- ==========================================
-- 13. FINAL VERIFICATION
-- ==========================================

-- Run this complete check:
SELECT 
  'Admin users' as check_name,
  COUNT(*) as count
FROM users WHERE role = 'admin'
UNION ALL
SELECT 
  'RLS enabled',
  CASE WHEN rowsecurity THEN 1 ELSE 0 END
FROM pg_tables WHERE tablename = 'workflow_sla_policies'
UNION ALL
SELECT 
  'RLS policies',
  COUNT(*)
FROM pg_policies WHERE tablename = 'workflow_sla_policies'
UNION ALL
SELECT 
  'Active SLA policies',
  COUNT(*)
FROM workflow_sla_policies WHERE is_active = TRUE;

-- Expected output:
-- check_name            | count
-- ---|---
-- Admin users           | 1+ (at least one)
-- RLS enabled           | 1 (true)
-- RLS policies          | 4 (SELECT, INSERT, UPDATE, DELETE)
-- Active SLA policies   | 5 (one per stage)

-- ==========================================
-- SUMMARY
-- ==========================================

-- ✅ Admin account setup complete when:
-- • At least one user has role = 'admin'
-- • workflow_sla_policies has RLS enabled
-- • 4 RLS policies exist (SELECT/INSERT/UPDATE/DELETE)
-- • All 5 SLA policies are marked is_active = TRUE
-- • Admin can update policies
-- • Non-admin cannot update policies
