-- Verification Script for All IP Records Page Fix
-- Run this in Supabase SQL Editor to verify the fix is working

-- 1. Verify columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ip_records'
  AND column_name IN ('is_deleted', 'deleted_at')
ORDER BY column_name;

-- Expected: 2 rows showing is_deleted (boolean) and deleted_at (timestamp)

-- 2. Check record counts
SELECT
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_records,
  COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_records,
  COUNT(CASE WHEN status = 'draft' AND is_deleted = false THEN 1 END) as active_drafts,
  COUNT(CASE WHEN status != 'draft' AND is_deleted = false THEN 1 END) as active_workflow_records
FROM ip_records;

-- Expected: Shows breakdown of all records

-- 3. List active workflow records (non-drafts)
SELECT
  id,
  title,
  status,
  category,
  created_at,
  is_deleted
FROM ip_records
WHERE is_deleted = false
  AND status != 'draft'
ORDER BY created_at DESC;

-- Expected: List of workflow records (should match what frontend displays)

-- 4. List active draft records
SELECT
  id,
  title,
  status,
  category,
  created_at,
  is_deleted
FROM ip_records
WHERE is_deleted = false
  AND status = 'draft'
ORDER BY created_at DESC;

-- Expected: List of draft records (should match what frontend displays)

-- 5. Test the exact query the frontend uses (with joins)
SELECT
  ip.*,
  applicant.full_name as applicant_name,
  applicant.email as applicant_email,
  supervisor.full_name as supervisor_name,
  evaluator.full_name as evaluator_name
FROM ip_records ip
LEFT JOIN users applicant ON applicant.id = ip.applicant_id
LEFT JOIN users supervisor ON supervisor.id = ip.supervisor_id
LEFT JOIN users evaluator ON evaluator.id = ip.evaluator_id
WHERE ip.is_deleted = false
ORDER BY ip.created_at DESC
LIMIT 10;

-- Expected: Records with user details joined (mimics frontend query)

-- 6. Check for any RLS policy issues (run as admin user)
SELECT
  COUNT(*) as visible_records
FROM ip_records
WHERE is_deleted = false;

-- Expected: Should return same count as query #2 active_records

-- 7. Verify indexes exist for performance
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ip_records'
  AND indexname LIKE '%deleted%';

-- Expected: Shows indexes on is_deleted and deleted_at columns
