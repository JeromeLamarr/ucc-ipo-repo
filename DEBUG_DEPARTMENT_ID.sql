-- Debug: Check what's in temp_registrations for the new user
SELECT auth_user_id, email, full_name, department_id 
FROM public.temp_registrations 
WHERE email = 'jeromelamarr0409@yahoo.com';

-- Check the users table for this user
SELECT id, auth_user_id, email, full_name, department_id 
FROM public.users 
WHERE email = 'jeromelamarr0409@yahoo.com';
