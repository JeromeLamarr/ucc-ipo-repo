-- Add e-signature image URL columns to certificate_signatories table
-- and extend the RPC to accept/update them.

ALTER TABLE public.certificate_signatories
  ADD COLUMN IF NOT EXISTS research_head_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS president_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_signature_url TEXT;

-- Drop the old 6-parameter version so we can recreate with 8 parameters.
DROP FUNCTION IF EXISTS public.update_certificate_signatories(UUID, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_certificate_signatories(
  p_id                              UUID,
  p_research_head_name              TEXT,
  p_research_head_position          TEXT,
  p_president_name                  TEXT,
  p_president_position              TEXT,
  p_supervisor_title                TEXT,
  p_research_head_signature_url     TEXT DEFAULT NULL,
  p_president_signature_url         TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.certificate_signatories
  SET
    research_head_name              = p_research_head_name,
    research_head_position          = p_research_head_position,
    president_name                  = p_president_name,
    president_position              = p_president_position,
    supervisor_title                = p_supervisor_title,
    research_head_signature_url     = p_research_head_signature_url,
    president_signature_url         = p_president_signature_url,
    updated_at                      = NOW()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_certificate_signatories(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
