-- Migration: Fix applicant approval defaults and trigger logic
-- Date: 2026-02-25
-- Purpose: Enforce is_approved=FALSE for new applicants, fix trigger to set explicit values
-- Impact: 
--   1. Column default changes from TRUE to FALSE
--   2. Trigger explicitly sets is_approved based on role
--   3. Applicants created via any path become is_approved=FALSE
--   4. Non-applicants (admin/supervisor/evaluator) remain is_approved=TRUE
--   5. Existing applicants with is_approved=TRUE remain unaffected (backward compatible)

BEGIN;

-- STEP 1: Change column default from TRUE to FALSE
-- This ensures new rows (if any direct INSERT happens without trigger) default to pending
ALTER TABLE IF EXISTS users 
ALTER COLUMN is_approved SET DEFAULT FALSE;

-- STEP 2: Update the handle_verified_user() function to explicitly set is_approved
-- based on the user's role. Applicants get FALSE (pending), others get TRUE (active)
DROP FUNCTION IF EXISTS handle_verified_user() CASCADE;

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
        role_val TEXT := 'applicant'; -- Default role
        is_approved_val BOOLEAN := FALSE; -- Default for applicants: pending approval
      BEGIN
        -- Try to get temp registration data
        SELECT full_name, department_id, role INTO temp_data
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

        -- Determine role: prefer temp_data, then auth metadata, default to 'applicant'
        role_val := COALESCE(temp_data.role, 'applicant');

        -- CRITICAL: Set is_approved based on role
        -- Applicants default to FALSE (pending admin approval)
        -- All other roles (admin, supervisor, evaluator) default to TRUE (active)
        is_approved_val := CASE 
          WHEN role_val = 'applicant' THEN FALSE
          ELSE TRUE  -- Non-applicants (admin/supervisor/evaluator) are pre-approved
        END;
        
        -- Create user record with explicit is_approved value
        INSERT INTO public.users (
          auth_user_id,
          email,
          full_name,
          department_id,
          role,
          is_approved,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.email,
          full_name_val,
          department_id_val,
          role_val,
          is_approved_val,
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

-- STEP 3: Recreate the trigger with the updated function
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;

CREATE TRIGGER on_auth_user_verified
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_verified_user();

-- STEP 4: Fix the DO block that handles existing verified auth users
-- This ensures any auth users without profiles get is_approved set correctly
DO $$
DECLARE
  auth_user RECORD;
  determined_role TEXT;
  determined_is_approved BOOLEAN;
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
    -- Determine role from metadata or default to applicant
    determined_role := COALESCE(
      auth_user.raw_user_meta_data->>'role',
      'applicant'
    );

    -- Set is_approved: FALSE for applicants, TRUE for others
    determined_is_approved := CASE
      WHEN determined_role = 'applicant' THEN FALSE
      ELSE TRUE
    END;

    INSERT INTO public.users (
      auth_user_id,
      email,
      full_name,
      department_id,
      role,
      is_approved,
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
      determined_role,
      determined_is_approved,
      NOW(),
      NOW()
    );
  END LOOP;
END $$;

-- STEP 5: Add explicit comment documenting the new behavior
COMMENT ON COLUMN users.is_approved IS 
'Applicant approval status. Applicants default to FALSE (pending admin approval). 
Non-applicant roles (admin, supervisor, evaluator) default to TRUE (active). 
Updated via admin approval workflow or directly by administrators.';

COMMIT;
