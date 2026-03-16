/*
  # Add e-signature URL columns to disclosure_signatories

  ## Summary
  Adds three signature image URL columns to the disclosure_signatories table,
  matching the same pattern used by certificate_signatories. Also updates the
  upsert_disclosure_signatories RPC to accept and persist the new columns.

  ## Changes
  - `disclosure_signatories`: adds research_head_signature_url, president_signature_url,
    supervisor_signature_url (nullable text)
  - Replaces upsert_disclosure_signatories function with updated version accepting
    the three new signature URL parameters
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'disclosure_signatories' AND column_name = 'research_head_signature_url'
  ) THEN
    ALTER TABLE public.disclosure_signatories ADD COLUMN research_head_signature_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'disclosure_signatories' AND column_name = 'president_signature_url'
  ) THEN
    ALTER TABLE public.disclosure_signatories ADD COLUMN president_signature_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'disclosure_signatories' AND column_name = 'supervisor_signature_url'
  ) THEN
    ALTER TABLE public.disclosure_signatories ADD COLUMN supervisor_signature_url text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_disclosure_signatories(
  p_id                          UUID,
  p_research_head_name          TEXT,
  p_research_head_position      TEXT,
  p_president_name              TEXT,
  p_president_position          TEXT,
  p_supervisor_title            TEXT,
  p_research_head_signature_url TEXT DEFAULT NULL,
  p_president_signature_url     TEXT DEFAULT NULL,
  p_supervisor_signature_url    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can update disclosure signatory settings';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.disclosure_signatories
    SET
      research_head_name          = p_research_head_name,
      research_head_position      = p_research_head_position,
      president_name              = p_president_name,
      president_position          = p_president_position,
      supervisor_title            = p_supervisor_title,
      research_head_signature_url = p_research_head_signature_url,
      president_signature_url     = p_president_signature_url,
      supervisor_signature_url    = p_supervisor_signature_url,
      updated_at                  = NOW()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.disclosure_signatories (
      research_head_name,
      research_head_position,
      president_name,
      president_position,
      supervisor_title,
      research_head_signature_url,
      president_signature_url,
      supervisor_signature_url
    ) VALUES (
      p_research_head_name,
      p_research_head_position,
      p_president_name,
      p_president_position,
      p_supervisor_title,
      p_research_head_signature_url,
      p_president_signature_url,
      p_supervisor_signature_url
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;
