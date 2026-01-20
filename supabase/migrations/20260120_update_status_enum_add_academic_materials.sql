/*
  # Update Status Enum to Include Academic Presentation Materials Stage

  ## Overview
  This migration updates the ip_status enum to add the new 'academic_presentation_materials' stage
  and removes the old 'preparing_legal' stage, replacing it with the new workflow.
*/

-- Update the ip_status enum type to include new stage
-- Note: PostgreSQL doesn't allow direct enum value removal, so we need to recreate the type

-- Step 1: Create new enum type with updated values
DO $$ BEGIN
  -- Create the new enum with the updated values
  CREATE TYPE ip_status_new AS ENUM (
    'draft',
    'submitted',
    'waiting_supervisor',
    'supervisor_revision',
    'supervisor_approved',
    'waiting_evaluation',
    'evaluator_revision',
    'evaluator_approved',
    'academic_presentation_materials',
    'ready_for_filing',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Alter ip_records table to use new enum
ALTER TABLE ip_records 
  ALTER COLUMN status TYPE ip_status_new USING status::text::ip_status_new;

-- Step 3: Drop old enum type
DROP TYPE IF EXISTS ip_status CASCADE;

-- Step 4: Rename new enum to original name
ALTER TYPE ip_status_new RENAME TO ip_status;

-- Step 5: Update any references in views or functions
-- Update the status checks in existing functions/views if needed

-- Verify the change
SELECT enum_range(NULL::ip_status);
