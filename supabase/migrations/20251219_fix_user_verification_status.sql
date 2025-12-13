-- Fix user verification status - add email_verified_at column and mark users as verified

-- Step 1: Add email_verified_at column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Step 2: Mark all users as verified if their auth email is confirmed
UPDATE public.users
SET 
  email_verified_at = au.email_confirmed_at,
  updated_at = now()
FROM auth.users au
WHERE public.users.auth_user_id = au.id
AND au.email_confirmed_at IS NOT NULL
AND public.users.email_verified_at IS NULL;

-- Step 3: Verify the update worked
SELECT email, email_verified_at, auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL;
