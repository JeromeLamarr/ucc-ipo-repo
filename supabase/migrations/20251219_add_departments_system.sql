-- =====================================================
-- Add Departments Management System
-- =====================================================

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(active);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON departments(created_by);

-- Add department_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- =====================================================
-- RLS Policies for Departments
-- =====================================================

-- Enable RLS on departments table
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Anyone can view active departments" ON departments;
DROP POLICY IF EXISTS "Admins can view all departments" ON departments;
DROP POLICY IF EXISTS "Only admins can create departments" ON departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON departments;
DROP POLICY IF EXISTS "Only admins can delete departments" ON departments;

-- Policy: Everyone can read active departments (no auth required for public registration)
CREATE POLICY "Anyone can view active departments"
ON departments FOR SELECT
USING (active = true);

-- Policy: Admins can view all departments (checked via edge function)
CREATE POLICY "Admins can view all departments"
ON departments FOR SELECT
USING (true);

-- Policy: Only service role can create (checked via edge function)
CREATE POLICY "Service role can manage departments"
ON departments FOR INSERT
WITH CHECK (true);

-- Policy: Only service role can update (checked via edge function)
CREATE POLICY "Service role can update departments"
ON departments FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Only service role can delete (checked via edge function)
CREATE POLICY "Service role can delete departments"
ON departments FOR DELETE
USING (true);

-- =====================================================
-- Insert Initial Departments
-- =====================================================

INSERT INTO departments (name, description) VALUES
  ('Department of Computer Science', 'Computer Science and Technology'),
  ('Department of Engineering', 'Engineering and Technical Sciences'),
  ('Department of Business', 'Business and Management'),
  ('Department of Medicine', 'Medical and Health Sciences'),
  ('Department of Law', 'Law and Legal Studies'),
  ('Department of Agriculture', 'Agriculture and Environmental Science'),
  ('Department of Education', 'Education and Human Development'),
  ('Department of Art and Design', 'Art, Design and Creative Studies'),
  ('Department of Chemistry', 'Chemistry and Chemical Sciences'),
  ('Department of Physics', 'Physics and Physics-related Sciences')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Update trigger to set updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS departments_updated_at_trigger ON departments;

CREATE TRIGGER departments_updated_at_trigger
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION update_departments_updated_at();
