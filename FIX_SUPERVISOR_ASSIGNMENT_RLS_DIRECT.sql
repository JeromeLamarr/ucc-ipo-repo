-- Direct RLS fix for supervisor_assignments table
-- This allows admins to create supervisor assignments

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Create assignments" ON public.supervisor_assignments;

-- Recreate it with applicant access
CREATE POLICY "Applicants create assignments" ON public.supervisor_assignments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ip_records WHERE public.ip_records.id = public.supervisor_assignments.ip_record_id
  AND public.ip_records.applicant_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
));

-- Add new policy for admins to create supervisor assignments
CREATE POLICY "Admins create supervisor assignments" ON public.supervisor_assignments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users 
  WHERE auth_user_id = auth.uid() AND role = 'admin'
));
