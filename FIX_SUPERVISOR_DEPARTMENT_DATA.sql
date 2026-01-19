-- =====================================================
-- Fix Supervisor Affiliation and Department Mixed Data
-- =====================================================

-- This script fixes Catherine Llena's record specifically
-- Issue: Has placeholder affiliation text instead of NULL, department_id not aligned

-- Step 1: Fix Catherine Llena's record specifically
UPDATE public.users
SET 
  affiliation = NULL,
  updated_at = now()
WHERE 
  email = 'jeromelamarr0409@gmail.com'
  AND full_name = 'Catherine Llena'
  AND role = 'supervisor';

-- Verify the fix
SELECT 
  id,
  email,
  full_name,
  role,
  department_id,
  affiliation,
  updated_at
FROM public.users
WHERE email = 'jeromelamarr0409@gmail.com'
LIMIT 1;

-- =====================================================
-- Fix ALL Supervisors with Placeholder Affiliation
-- =====================================================

-- Step 2: Clear all placeholder affiliation values for supervisors
UPDATE public.users
SET 
  affiliation = NULL,
  updated_at = now()
WHERE 
  role IN ('supervisor', 'evaluator', 'admin')
  AND (
    affiliation = 'Enter your affiliation'
    OR affiliation = ''
    OR affiliation LIKE 'Enter your%'
    OR affiliation LIKE 'Placeholder%'
    OR affiliation IS NULL
  )
  AND department_id IS NOT NULL;

-- Step 3: Verify all supervisors/evaluators/admins have clean data
SELECT 
  id,
  email,
  full_name,
  role,
  d.name as department_name,
  affiliation,
  is_verified,
  updated_at
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE role IN ('supervisor', 'evaluator', 'admin')
ORDER BY role, updated_at DESC;

-- =====================================================
-- Comprehensive Audit and Fix
-- =====================================================

-- Step 4: Find all users with mixed/incorrect affiliation data
SELECT 
  id,
  email,
  full_name,
  role,
  d.name as department_name,
  affiliation,
  CASE 
    WHEN affiliation IS NOT NULL AND affiliation != '' AND affiliation != 'NULL' THEN 'Has affiliation text'
    WHEN affiliation IS NULL AND department_id IS NOT NULL THEN 'Correct (affiliation NULL, has dept_id)'
    WHEN affiliation IS NULL AND department_id IS NULL THEN 'No dept or affiliation'
    ELSE 'Unknown'
  END as status
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE 
  role IN ('supervisor', 'evaluator', 'admin')
  OR affiliation LIKE 'Enter your%'
ORDER BY 
  status DESC,
  role,
  created_at DESC;

-- =====================================================
-- Final Verification Query
-- =====================================================

-- Step 5: Verify Catherine Llena's record is fixed
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  d.name as department_name,
  d.id as department_id,
  u.affiliation,
  u.is_verified,
  u.updated_at
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE u.email = 'jeromelamarr0409@gmail.com';
