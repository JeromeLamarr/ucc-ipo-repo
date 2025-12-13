-- Sync department data from temp_registrations to users table for all users

-- Step 1: Update users with department_id from temp_registrations where available
UPDATE public.users u
SET 
  department_id = tr.department_id,
  updated_at = now()
FROM public.temp_registrations tr
WHERE u.auth_user_id = tr.auth_user_id
AND u.department_id IS NULL
AND tr.department_id IS NOT NULL;

-- Step 2: Verify the update worked
SELECT email, department_id, updated_at FROM public.users ORDER BY updated_at DESC;
