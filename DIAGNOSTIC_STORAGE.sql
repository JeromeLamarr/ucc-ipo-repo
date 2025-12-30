-- QUICK DIAGNOSTIC - Run this FIRST to identify the exact problem
-- Copy and paste into Supabase SQL Editor and run

-- Query 1: Check if 'documents' bucket exists
SELECT 
  'BUCKET CHECK' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents')
    THEN '✓ BUCKET EXISTS'
    ELSE '✗ BUCKET MISSING - CREATE IT IN STORAGE TAB'
  END as status,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents')
    THEN 'Go to Step 2'
    ELSE 'Go to FILE_UPLOAD_TROUBLESHOOTING.md Step 1'
  END as next_action;

-- Query 2: Check if RLS policies exist for documents bucket
SELECT 
  'RLS POLICIES' as check_type,
  COUNT(*) as policy_count,
  CASE WHEN COUNT(*) >= 4
    THEN '✓ POLICIES EXIST'
    ELSE '✗ POLICIES MISSING - RUN FIX_FILE_UPLOAD_ISSUE.sql'
  END as status,
  CASE WHEN COUNT(*) >= 4
    THEN 'Go to Step 3 (Test Upload)'
    ELSE 'Go to FILE_UPLOAD_TROUBLESHOOTING.md Step 2'
  END as next_action
FROM storage.policies 
WHERE name ILIKE '%documents%';

-- Query 3: Check if current user is admin
SELECT 
  'USER ADMIN CHECK' as check_type,
  COUNT(*) as admin_count,
  CASE WHEN COUNT(*) > 0
    THEN '✓ YOU ARE AN ADMIN'
    ELSE '✗ YOU ARE NOT AN ADMIN'
  END as status,
  'If not admin, ask admin user to perform uploads' as next_action
FROM public.users 
WHERE id = auth.uid() AND role = 'admin';

-- Query 4: List your admin users
SELECT 
  id,
  email,
  role
FROM public.users 
WHERE role = 'admin'
LIMIT 10;

-- Query 5: Test file upload with curl (requires ANON_KEY from project settings)
-- After setting up bucket and policies, test with:
-- curl -X POST \
--   "https://YOUR_PROJECT.supabase.co/storage/v1/object/documents/test/test.txt" \
--   -H "Authorization: Bearer YOUR_ANON_KEY" \
--   -H "Content-Type: text/plain" \
--   -d "test file content"
