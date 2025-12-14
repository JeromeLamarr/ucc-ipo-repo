-- FIX: Recreate the trigger to properly handle department_id

-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
DROP FUNCTION IF EXISTS handle_verified_user();

-- Step 2: Create new function with proper department_id handling
CREATE OR REPLACE FUNCTION handle_verified_user()
RETURNS TRIGGER AS $$
DECLARE
  temp_full_name TEXT;
  temp_dept_id UUID;
BEGIN
  -- Only process when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND 
     (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    
    -- Check if user record already exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
      -- Get data from temp_registrations
      SELECT full_name, department_id 
      INTO temp_full_name, temp_dept_id
      FROM public.temp_registrations
      WHERE auth_user_id = NEW.id
      LIMIT 1;
      
      -- Set defaults if not found
      temp_full_name := COALESCE(temp_full_name, NEW.raw_user_meta_data->>'full_name', 'User');
      
      -- Create user record with department_id
      INSERT INTO public.users (
        auth_user_id,
        email,
        full_name,
        department_id,
        role,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        temp_full_name,
        temp_dept_id,
        'applicant',
        NOW(),
        NOW()
      );
      
      -- Clean up temp registration
      DELETE FROM public.temp_registrations WHERE auth_user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create new trigger
CREATE TRIGGER on_auth_user_verified
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_verified_user();

-- Step 4: Manually sync any users that were created before this fix
UPDATE public.users u
SET department_id = tr.department_id
FROM public.temp_registrations tr
WHERE u.auth_user_id = tr.auth_user_id
AND u.department_id IS NULL
AND tr.department_id IS NOT NULL;

-- Step 5: Verify the results
SELECT email, full_name, department_id FROM public.users WHERE email = 'jeromelamarr0409@yahoo.com';
