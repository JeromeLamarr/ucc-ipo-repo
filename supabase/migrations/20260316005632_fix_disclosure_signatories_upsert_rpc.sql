/*
  # Add upsert_disclosure_signatories SECURITY DEFINER RPC

  ## Summary
  The DisclosureSignatoriesSettings component fails with "new row violates row-level security
  policy" when no disclosure_signatories row exists yet, because a direct `.insert()` call
  is used which runs as the calling user and hits the RLS WITH CHECK (is_admin()) guard.

  This migration creates a SECURITY DEFINER function that handles both insert and update,
  bypassing RLS in the same pattern as the existing upsert_certificate_signatories function.

  ## Changes
  - New function: `upsert_disclosure_signatories` — SECURITY DEFINER, admin-only, handles
    insert-or-update for disclosure_signatories table.
*/

CREATE OR REPLACE FUNCTION public.upsert_disclosure_signatories(
  p_id                     UUID,
  p_research_head_name     TEXT,
  p_research_head_position TEXT,
  p_president_name         TEXT,
  p_president_position     TEXT,
  p_supervisor_title       TEXT
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
      research_head_name     = p_research_head_name,
      research_head_position = p_research_head_position,
      president_name         = p_president_name,
      president_position     = p_president_position,
      supervisor_title       = p_supervisor_title,
      updated_at             = NOW()
    WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO public.disclosure_signatories (
      research_head_name,
      research_head_position,
      president_name,
      president_position,
      supervisor_title
    ) VALUES (
      p_research_head_name,
      p_research_head_position,
      p_president_name,
      p_president_position,
      p_supervisor_title
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;
