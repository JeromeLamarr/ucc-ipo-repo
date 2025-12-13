-- Create temp_registrations table to store registration data before email verification

CREATE TABLE IF NOT EXISTS public.temp_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_temp_registrations_auth_user_id ON public.temp_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_temp_registrations_email ON public.temp_registrations(email);
CREATE INDEX IF NOT EXISTS idx_temp_registrations_department_id ON public.temp_registrations(department_id);
