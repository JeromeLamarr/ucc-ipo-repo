-- =====================================================
-- Consolidate Affiliation and Department Fields
-- =====================================================
-- This migration consolidates the legacy affiliation field into the 
-- new departments system by:
-- 1. Creating departments from existing unique affiliations
-- 2. Mapping all users with affiliation to their new department_id
-- 3. Clearing the legacy affiliation field

-- Step 1: Create departments from existing affiliations
-- This ensures every unique affiliation text value has a corresponding department
INSERT INTO public.departments (name, description, active, created_at, updated_at)
SELECT DISTINCT 
  TRIM(u.affiliation) as name,
  'Auto-created from legacy affiliation data' as description,
  true as active,
  now() as created_at,
  now() as updated_at
FROM public.users u
WHERE 
  u.affiliation IS NOT NULL 
  AND u.affiliation != ''
  AND u.affiliation != 'No affiliation'
  AND u.affiliation != 'NULL'
  AND TRIM(u.affiliation) != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.departments d 
    WHERE LOWER(TRIM(d.name)) = LOWER(TRIM(u.affiliation))
  )
ON CONFLICT (name) DO NOTHING;

-- Step 2: Update users to have department_id based on affiliation
-- Match each user's affiliation to the corresponding department
UPDATE public.users u
SET 
  department_id = d.id,
  updated_at = now()
FROM public.departments d
WHERE 
  u.affiliation IS NOT NULL 
  AND u.affiliation != ''
  AND u.affiliation != 'No affiliation'
  AND u.affiliation != 'NULL'
  AND LOWER(TRIM(u.affiliation)) = LOWER(TRIM(d.name))
  AND u.department_id IS NULL;

-- Step 3: Create a "No Department" department for users with NULL or empty affiliations
INSERT INTO public.departments (name, description, active, created_at, updated_at)
VALUES (
  'No Department',
  'Default department for users without affiliation',
  true,
  now(),
  now()
)
ON CONFLICT (name) DO NOTHING;

-- Step 4: Assign unaffiliated users to "No Department" (optional - comment out if you prefer to leave NULL)
-- UPDATE public.users
-- SET department_id = (SELECT id FROM public.departments WHERE name = 'No Department')
-- WHERE department_id IS NULL AND (affiliation IS NULL OR affiliation = '' OR affiliation = 'No affiliation');

-- Step 5: Clear legacy affiliation field for users who now have department_id
UPDATE public.users
SET affiliation = NULL
WHERE department_id IS NOT NULL;

-- Step 6: Document the migration in a system log (optional)
-- Add this comment to the users table about the migration
COMMENT ON COLUMN public.users.affiliation IS 
  'DEPRECATED: Legacy field. Use department_id instead. Kept for backwards compatibility.';

-- Verification queries (comment these out or remove after confirming)
-- SELECT COUNT(*) as users_with_department, COUNT(*) FILTER (WHERE affiliation IS NOT NULL) as users_with_old_affiliation FROM public.users;
-- SELECT COUNT(*) FROM public.departments;
-- SELECT id, name, description FROM public.departments ORDER BY name;
