-- Check for database triggers that might be creating duplicate profiles

-- List all triggers on auth schema
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- List all triggers on public schema related to users
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'users'
ORDER BY trigger_name;

-- Check for functions that might be creating users
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- If there's a trigger creating duplicates, we can disable it:
-- ALTER TABLE auth.users DISABLE TRIGGER ALL;
-- Then manually recreate only necessary triggers

-- Check current users and count duplicates by email
SELECT email, COUNT(*) as count
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- View all users to see if there are duplicates
SELECT id, auth_user_id, email, full_name, role, created_at
FROM public.users
ORDER BY email, created_at;
