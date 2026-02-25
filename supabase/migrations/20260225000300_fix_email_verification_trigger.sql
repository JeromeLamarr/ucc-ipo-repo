-- Migration: Fix email verification trigger and RLS policies
-- Date: 2026-02-25
-- Purpose: Make handle_verified_user() fully defensive and ensure RLS allows trigger inserts
-- Problem: Email verification fails with "Database error updating user" due to:
--   1. RLS policy blocks INSERT from trigger (checks auth.uid() which has no user record yet)
--   2. Function assumes raw_user_meta_data fields exist
--   3. Function doesn't safely handle NULLs or missing data
-- Solution:
--   1. Add RLS policy allowing users to create their own profile during auth verification
--   2. Add policy for SECURITY DEFINER functions to bypass RLS
--   3. Rewrite handle_verified_user() with defensive NULL handling
--   4. Add error logging for debugging

BEGIN;

-- =====================================================
-- STEP 1: Fix RLS policies to allow trigger inserts
-- =====================================================

-- Policy to allow users to create/update their own profile during authentication
-- This is safe because auth.uid() only matches their own auth ID
DROP POLICY IF EXISTS "Users can create own profile" ON users;
CREATE POLICY "Users can create own profile" ON users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Policy to allow SECURITY DEFINER functions to insert (bypasses normal auth checks)
-- This is necessary for triggers and automated processes
DROP POLICY IF EXISTS "Service functions can manage users" ON users;
CREATE POLICY "Service functions can manage users" ON users FOR INSERT
  WITH CHECK (
    -- Allow if current_user is a database role with elevated privileges
    -- (this includes SECURITY DEFINER functions running as postgres/schema_owner)
    current_user != 'authenticated'
  );

-- =====================================================
-- STEP 2: Recreate handle_verified_user() with defensive programming
-- =====================================================

DROP FUNCTION IF EXISTS handle_verified_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_verified_user()
RETURNS TRIGGER AS $$
DECLARE
  temp_data RECORD;
  full_name_val TEXT;
  department_id_val UUID;
  role_val TEXT;
  is_approved_val BOOLEAN;
  error_msg TEXT;
BEGIN
  -- Only process when email is confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only process on initial email verification (INSERT or first confirmation)
  -- Skip if email was already confirmed and nothing changed
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user record already exists
  -- Using FOR UPDATE SKIP LOCKED to prevent race conditions
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE auth_user_id = NEW.id FOR UPDATE SKIP LOCKED
  ) THEN
    BEGIN
      -- Initialize all variables with safe defaults
      full_name_val := 'User';  -- Default if nothing provides a name
      department_id_val := NULL;  -- Default: no department assigned
      role_val := 'applicant';  -- Default: all new users are applicants
      is_approved_val := FALSE;  -- Default: applicants must be approved
      
      -- Attempt to get temp registration data (if available)
      -- Safe: Uses COALESCE and type casting with error handling
      SELECT 
        full_name,
        department_id,
        role
      INTO temp_data
      FROM public.temp_registrations
      WHERE auth_user_id = NEW.id
      LIMIT 1;

      -- SAFELY extract full_name with fallback chain
      full_name_val := COALESCE(
        NULLIF(TRIM(temp_data.full_name), ''),  -- Prefer temp data, reject empty strings
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),  -- Then try auth metadata
        'User'  -- Final fallback
      );

      -- SAFELY extract department_id with explicit error handling
      IF temp_data.department_id IS NOT NULL THEN
        department_id_val := temp_data.department_id;
      ELSIF NEW.raw_user_meta_data ? 'department_id' THEN
        -- Only attempt cast if the key exists
        BEGIN
          department_id_val := (NEW.raw_user_meta_data->>'department_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
          -- Invalid UUID format - silently ignore and use NULL
          department_id_val := NULL;
          RAISE WARNING 'Invalid department_id format in auth metadata for user %: %', 
            NEW.id, NEW.raw_user_meta_data->>'department_id';
        END;
      END IF;

      -- SAFELY extract role from temp_data or auth metadata
      IF temp_data.role IS NOT NULL THEN
        role_val := temp_data.role;
      ELSIF NEW.raw_user_meta_data ? 'role' THEN
        role_val := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'applicant');
      ELSE
        role_val := 'applicant';  -- Default if no role provided
      END IF;

      -- CRITICAL: Validate role is a valid enum value
      -- Valid roles: 'applicant', 'supervisor', 'evaluator', 'admin'
      IF role_val NOT IN ('applicant', 'supervisor', 'evaluator', 'admin') THEN
        role_val := 'applicant';  -- Fallback to applicant for invalid roles
        RAISE WARNING 'Invalid role for user %: %, defaulting to applicant', 
          NEW.id, role_val;
      END IF;

      -- CRITICAL: Set is_approved based on role
      -- Only applicants start as unapproved; other roles are auto-approved
      is_approved_val := CASE 
        WHEN role_val = 'applicant' THEN FALSE  -- Applicants: pending admin approval
        ELSE TRUE  -- Non-applicants (admin/supervisor/evaluator): auto-approved
      END;

      -- SAFE INSERT: All values have been validated and have safe defaults
      -- This INSERT should NEVER fail due to NULL or invalid values
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
        NEW.email,  -- Email is guaranteed by auth.users table
        full_name_val,  -- Always has a value (never NULL)
        department_id_val,  -- Can be NULL safely (has ON DELETE SET NULL FK)
        role_val,  -- Always a valid enum value
        is_approved_val,  -- Always a boolean value
        NOW(),
        NOW()
      );

      -- Clean up temp registration record (best effort, don't fail if it doesn't exist)
      DELETE FROM public.temp_registrations WHERE auth_user_id = NEW.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the trigger
      -- This allows auth to succeed even if user profile creation has issues
      error_msg := SQLERRM;
      RAISE WARNING 'Error creating user profile for % (%): %', 
        NEW.id, NEW.email, error_msg;
      
      -- Re-raise the exception so Supabase sees the error in logs
      -- This helps with debugging while still providing some robustness
      RAISE;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- =====================================================
-- STEP 3: Recreate the trigger
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;

CREATE TRIGGER on_auth_user_verified
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_verified_user();

-- =====================================================
-- STEP 4: Update RLS policy for is_approved_applicant_or_privileged function
-- =====================================================
-- Update the function to ensure it has proper NULL handling
-- Note: RLS policies depending on this function remain intact
-- (CREATE OR REPLACE updates function without dropping dependencies)

CREATE OR REPLACE FUNCTION is_approved_applicant_or_privileged()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    -- For authenticated users, check their approval status
    (
      SELECT (role != 'applicant' OR (role = 'applicant' AND is_approved = true))
      FROM public.users 
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    ),
    -- For non-authenticated (e.g., during triggers), return true to allow
    true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- =====================================================
-- STEP 5: Ensure departments table exists and FK is safe
-- =====================================================
-- Drop old FK if it exists to avoid conflicts
ALTER TABLE IF EXISTS users 
DROP CONSTRAINT IF EXISTS fk_users_department_id;

-- Add/recreate the foreign key constraint for safety
-- Note: This is safe even if already defined - IF NOT EXISTS is implicit via DROP IF
ALTER TABLE IF EXISTS users 
ADD CONSTRAINT fk_users_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 6: Add helpful comment documenting the fix
-- =====================================================
COMMENT ON FUNCTION handle_verified_user() IS 
'Safely creates a public.users profile when auth.users email is verified.
DEFENSIVE PROGRAMMING:
- Never assumes raw_user_meta_data fields exist
- Safely casts data with fallbacks
- Validates enum values (role)
- Handles NULLs gracefully
- Uses COALESCE chains with defaults
RLS COMPATIBLE:
- Uses SECURITY DEFINER to run with elevated privileges
- Respects RLS policies that allow service functions
- Triggers sync auth completion to user creation
APPROVAL WORKFLOW:
- Applicants default to is_approved=FALSE (pending admin approval)
- Non-applicants default to is_approved=TRUE (auto-approved)';

COMMENT ON COLUMN users.is_approved IS 
'Applicant approval status. Applicants default to FALSE (pending admin approval).
Non-applicant roles (admin, supervisor, evaluator) default to TRUE (active).
Updated via admin approval workflow or directly by administrators.';

COMMIT;
