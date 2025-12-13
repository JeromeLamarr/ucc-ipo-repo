-- Clean up stale auth users that have no corresponding user profile
-- This will help fix the "already verified" issue for emails without profiles

-- Find auth users that have no profile in the users table
SELECT auth.users.id, auth.users.email, auth.users.email_confirmed_at
FROM auth.users
WHERE auth.users.id NOT IN (
  SELECT DISTINCT auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL
)
AND auth.users.email = 'jeromelamarr0409@yahoo.com';

-- If you want to DELETE them, use this (uncomment after verification):
-- DELETE FROM auth.users
-- WHERE id NOT IN (
--   SELECT DISTINCT auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL
-- )
-- AND email = 'jeromelamarr0409@yahoo.com';
