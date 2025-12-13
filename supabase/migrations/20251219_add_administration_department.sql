-- Add Administration department to departments table

INSERT INTO public.departments (name, description, active, created_at, updated_at)
VALUES (
  'Administration',
  'Administration Department',
  true,
  now(),
  now()
)
ON CONFLICT (name) DO NOTHING;

-- Verify the department was added
SELECT id, name, description, active FROM public.departments ORDER BY name;
