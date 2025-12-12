-- FIXED: Run this corrected version in Supabase SQL Editor

-- Step 1: Create function to handle new verified auth users
CREATE OR REPLACE FUNCTION handle_verified_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND 
     (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at = NEW.email_confirmed_at) THEN
    
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
      INSERT INTO public.users (
        auth_user_id,
        email,
        full_name,
        affiliation,
        role,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'affiliation',
        'applicant',
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_verified_user();

-- Step 3: Create user records for existing verified users without user records
-- Using simpler approach without ON CONFLICT
INSERT INTO public.users (
  auth_user_id,
  email,
  full_name,
  affiliation,
  role,
  created_at,
  updated_at
)
SELECT 
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'full_name', 'User'),
  a.raw_user_meta_data->>'affiliation',
  'applicant',
  NOW(),
  NOW()
FROM auth.users a
WHERE a.email_confirmed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = a.id
  );
