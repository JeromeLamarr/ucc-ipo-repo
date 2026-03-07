-- Create a SECURITY DEFINER RPC function so the frontend can update
-- certificate_signatories without hitting RLS recursion issues.
-- Only callable by authenticated users who are admins (checked inside the function).

CREATE OR REPLACE FUNCTION public.update_certificate_signatories(
  p_id                    UUID,
  p_research_head_name    TEXT,
  p_research_head_position TEXT,
  p_president_name        TEXT,
  p_president_position    TEXT,
  p_supervisor_title      TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Verify caller is an admin
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.certificate_signatories
  SET
    research_head_name     = p_research_head_name,
    research_head_position = p_research_head_position,
    president_name         = p_president_name,
    president_position     = p_president_position,
    supervisor_title       = p_supervisor_title,
    updated_at             = NOW()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_certificate_signatories(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
