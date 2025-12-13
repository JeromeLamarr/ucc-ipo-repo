-- Add department_id to temp_registrations table
ALTER TABLE temp_registrations ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Create index for department_id
CREATE INDEX IF NOT EXISTS idx_temp_registrations_department_id ON temp_registrations(department_id);
