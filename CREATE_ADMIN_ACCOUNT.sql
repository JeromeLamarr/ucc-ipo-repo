-- Create a new admin user
-- These are temporary credentials - change them after first login

-- Admin credentials:
-- Email: admin@ucc-ipo.com
-- Password: AdminPassword123!
-- Role: admin

-- This script creates both the auth user and the user profile

-- Step 1: Create the auth user (run this in SQL Editor)
-- Note: You may need to use the Supabase dashboard to create auth users, or use the CLI

-- Step 2: Create the user profile
INSERT INTO public.users (
  email,
  full_name,
  role,
  auth_user_id,
  department_id,
  created_at,
  updated_at
) VALUES (
  'admin@ucc-ipo.com',
  'System Administrator',
  'admin',
  gen_random_uuid(), -- This will be replaced with actual auth user ID
  NULL,
  now(),
  now()
);

-- After running the above, go to Supabase Auth dashboard and:
-- 1. Click "Add user"
-- 2. Create user with:
--    Email: admin@ucc-ipo.com
--    Password: AdminPassword123!
-- 3. Note the User ID
-- 4. Update the users table with the correct auth_user_id

-- OR use this to find and update the auth user ID:
-- UPDATE public.users 
-- SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'admin@ucc-ipo.com')
-- WHERE email = 'admin@ucc-ipo.com';
