-- Create admin user with Administration department

-- Note: This is a template. The admin user will be created through Supabase Auth.
-- After creating the user in Supabase Auth, run this query with the correct auth_user_id:

-- Step 1: Get the Administration department ID
-- SELECT id FROM public.departments WHERE name = 'Administration';

-- Step 2: Create the admin user profile (replace auth_user_id with actual UUID from auth.users)
-- INSERT INTO public.users (
--   auth_user_id,
--   email,
--   full_name,
--   role,
--   is_verified,
--   department_id,
--   created_at,
--   updated_at
-- )
-- SELECT 
--   'REPLACE_WITH_AUTH_USER_ID_HERE',
--   'admin@ucc-ipo.com',
--   'Administrator',
--   'admin',
--   true,
--   id,
--   now(),
--   now()
-- FROM public.departments
-- WHERE name = 'Administration';

-- Instructions:
-- 1. Run this migration in Supabase
-- 2. Create admin user in Supabase Auth (admin@ucc-ipo.com)
-- 3. Copy the user ID from auth.users
-- 4. Replace 'REPLACE_WITH_AUTH_USER_ID_HERE' with the actual UUID
-- 5. Run the commented INSERT query above
-- 6. Or use the SQL below directly after getting the Administration department ID:

INSERT INTO public.users (
  auth_user_id,
  email,
  full_name,
  role,
  is_verified,
  department_id,
  created_at,
  updated_at
)
SELECT 
  'REPLACE_WITH_AUTH_USER_ID_FROM_SUPABASE_AUTH',
  'admin@ucc-ipo.com',
  'Administrator',
  'admin',
  true,
  d.id,
  now(),
  now()
FROM public.departments d
WHERE d.name = 'Administration'
ON CONFLICT (email) DO NOTHING;

-- Verify the admin user was created
SELECT email, full_name, role, is_verified, d.name as department
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE u.email = 'admin@ucc-ipo.com';
