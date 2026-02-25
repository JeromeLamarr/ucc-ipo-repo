-- =====================================================
-- Remove Legacy Affiliation Column
-- =====================================================
-- This migration removes the deprecated affiliation field after consolidation.
-- Run this AFTER verifying that:
-- 1. All users have been migrated to department_id
-- 2. The migration script has successfully mapped all affiliations to departments
-- 3. No application code is still using the affiliation field

-- Step 1: Drop the deprecated affiliation column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 2: Drop the deprecated affiliation column from verification_codes table (if it exists)
ALTER TABLE public.verification_codes DROP COLUMN IF EXISTS affiliation CASCADE;

-- Step 3: Drop the deprecated affiliation column from temp_registrations table (if it exists)
ALTER TABLE public.temp_registrations DROP COLUMN IF EXISTS affiliation CASCADE;

-- Verification query (comment out after running)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'affiliation';
-- Should return no rows
