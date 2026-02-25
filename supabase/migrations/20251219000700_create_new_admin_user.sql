-- Create new admin user with Administration department
-- Step 1: Ensure Administration department exists

INSERT INTO public.departments (name, description, active, created_at, updated_at)
VALUES (
  'Administration',
  'Administration Department',
  true,
  now(),
  now()
)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get the department ID (verify it was created)
SELECT id, name FROM public.departments WHERE name = 'Administration';

-- Step 3: MANUAL STEP - Create admin user in Supabase Auth
-- 1. Go to Supabase Dashboard
-- 2. Click on Authentication → Users
-- 3. Click "Add User"
-- 4. Fill in:
--    - Email: admin@ucc-ipo.com
--    - Password: AdminPassword123!
--    - Auto confirm: YES (toggle ON)
-- 5. Click "Create User"
-- 6. Copy the UUID from the new user row

-- Step 4: Insert admin profile (REPLACE auth_user_id with the UUID from step 6)
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
  'REPLACE_WITH_AUTH_USER_UUID_FROM_STEP_6',
  'admin@ucc-ipo.com',
  'ucc ipo admin',
  'admin',
  true,
  id,
  now(),
  now()
FROM public.departments
WHERE name = 'Administration'
ON CONFLICT (email) DO NOTHING;

-- Step 5: Verify admin user was created
SELECT email, full_name, role, is_verified, d.name as department
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE u.email = 'admin@ucc-ipo.com';
