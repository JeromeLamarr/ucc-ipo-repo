-- Create user profiles from temp_registrations and auth users
-- This matches auth users with temp registration data and creates user profiles with department_id

INSERT INTO public.users (
  auth_user_id,
  email,
  full_name,
  role,
  department_id,
  is_verified,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(tr.full_name, au.raw_user_meta_data->>'full_name', 'User'),
  'applicant',
  tr.department_id,
  CASE WHEN au.email_confirmed_at IS NOT NULL THEN true ELSE false END,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.temp_registrations tr ON au.id = tr.auth_user_id
WHERE au.id NOT IN (SELECT auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL)
ON CONFLICT (auth_user_id) DO NOTHING;

-- Verify the data was inserted
SELECT email, full_name, department_id, is_verified FROM public.users WHERE auth_user_id IS NOT NULL ORDER BY created_at DESC LIMIT 10;
