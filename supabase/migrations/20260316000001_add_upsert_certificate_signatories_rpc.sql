-- Add an upsert RPC for certificate_signatories so admins can create the
-- first row without hitting RLS (SECURITY DEFINER bypasses policies).
CREATE OR REPLACE FUNCTION public.upsert_certificate_signatories(
  p_research_head_name              TEXT,
  p_research_head_position          TEXT,
  p_president_name                  TEXT,
  p_president_position              TEXT,
  p_supervisor_title                TEXT,
  p_research_head_signature_url     TEXT DEFAULT NULL,
  p_president_signature_url         TEXT DEFAULT NULL,
  p_id                              UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_id IS NOT NULL THEN
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
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  -- If no id supplied or UPDATE matched nothing, insert a fresh row
  IF v_id IS NULL THEN
    INSERT INTO public.certificate_signatories (
      research_head_name,
      research_head_position,
      president_name,
      president_position,
      supervisor_title,
      research_head_signature_url,
      president_signature_url
    ) VALUES (
      p_research_head_name,
      p_research_head_position,
      p_president_name,
      p_president_position,
      p_supervisor_title,
      p_research_head_signature_url,
      p_president_signature_url
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_certificate_signatories(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
