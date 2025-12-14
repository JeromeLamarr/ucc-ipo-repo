-- Fix user creation after email verification
-- This creates a trigger that automatically creates a user record in the users table
-- when an auth user is confirmed via email verification

-- Create function to handle new verified auth users
CREATE OR REPLACE FUNCTION handle_verified_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND 
     (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at = NEW.email_confirmed_at) THEN
    
    -- Check if user record already exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = NEW.id) THEN
      -- Get the temp registration data if available
      DECLARE
        temp_data RECORD;
        full_name_val TEXT;
        department_id_val UUID;
      BEGIN
        -- Try to get temp registration data
        SELECT full_name, department_id INTO temp_data
        FROM public.temp_registrations
        WHERE auth_user_id = NEW.id
        LIMIT 1;
        
        -- Set values from temp data or auth metadata
        full_name_val := COALESCE(
          temp_data.full_name,
          NEW.raw_user_meta_data->>'full_name',
          'User'
        );
        
        department_id_val := COALESCE(
          temp_data.department_id,
          (NEW.raw_user_meta_data->>'department_id')::UUID
        );
        
        -- Create user record
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
          full_name_val,
          department_id_val,
          'applicant',
          NOW(),
          NOW()
        );
        
        -- Clean up temp registration
        DELETE FROM public.temp_registrations WHERE auth_user_id = NEW.id;
        
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_verified_user();

-- Also handle existing verified users that don't have user records yet
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Create user records for any verified auth users that don't have user records
  FOR auth_user IN
    SELECT a.id, a.email, a.email_confirmed_at, a.raw_user_meta_data
    FROM auth.users a
    WHERE a.email_confirmed_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE auth_user_id = a.id
    )
  LOOP
    INSERT INTO public.users (
      auth_user_id,
      email,
      full_name,
      department_id,
      role,
      created_at,
      updated_at
    ) VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(
        auth_user.raw_user_meta_data->>'full_name',
        'User'
      ),
      (auth_user.raw_user_meta_data->>'department_id')::UUID,
      'applicant',
      NOW(),
      NOW()
    );
  END LOOP;
END $$;
