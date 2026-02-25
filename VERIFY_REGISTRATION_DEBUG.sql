-- Verify the registration flow worked end-to-end
-- Run these queries in Supabase SQL Editor (Database -> SQL Editor)

-- 1. Check if auth user was created with email verified
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%@%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if public.users profile was created (trigger fired)
SELECT 
  id,
  auth_user_id,
  email,
  full_name,
  role,
  is_approved,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if there are any errors in temp_registrations
SELECT 
  *
FROM public.temp_registrations
ORDER BY created_at DESC
LIMIT 5;

-- 4. If public.users is empty but auth.users has records:
-- The trigger failed! Check this:
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';
