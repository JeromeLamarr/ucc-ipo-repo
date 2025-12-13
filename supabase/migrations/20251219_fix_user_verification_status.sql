-- Fix user verification status - mark users as verified if their auth email is confirmed

-- Step 1: Mark all users as verified (is_verified = true) if their auth email is confirmed
UPDATE public.users
SET 
  is_verified = true,
  updated_at = now()
FROM auth.users au
WHERE public.users.auth_user_id = au.id
AND au.email_confirmed_at IS NOT NULL
AND public.users.is_verified = false;

-- Step 2: Also mark users as verified if they have a valid auth_user_id (they completed registration)
UPDATE public.users
SET 
  is_verified = true,
  updated_at = now()
WHERE auth_user_id IS NOT NULL
AND is_verified = false;

-- Step 3: Verify the update worked
SELECT email, is_verified, auth_user_id FROM public.users;
