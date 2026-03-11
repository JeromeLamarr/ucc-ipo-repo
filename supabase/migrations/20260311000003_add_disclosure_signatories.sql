-- Disclosure Signatories settings table
-- Mirrors certificate_signatories exactly, scoped to disclosure PDFs

CREATE TABLE IF NOT EXISTS disclosure_signatories (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  research_head_name    TEXT        NOT NULL DEFAULT 'Teodoro Macaraeg',
  research_head_position TEXT       NOT NULL DEFAULT 'Research Head',
  president_name        TEXT        NOT NULL DEFAULT 'Atty. Jared',
  president_position    TEXT        NOT NULL DEFAULT 'President',
  supervisor_title      TEXT        NOT NULL DEFAULT 'Supervisor',
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed single row with defaults (ON CONFLICT DO NOTHING = safe re-run)
INSERT INTO disclosure_signatories (
  research_head_name, research_head_position,
  president_name, president_position, supervisor_title
) VALUES (
  'Teodoro Macaraeg', 'Research Head',
  'Atty. Jared', 'President', 'Supervisor'
) ON CONFLICT DO NOTHING;

ALTER TABLE disclosure_signatories ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users (needed by Edge Function service role + admin UI)
CREATE POLICY "disc_sig_read"
  ON disclosure_signatories FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE: admin only via is_admin() SECURITY DEFINER helper
CREATE POLICY "disc_sig_insert"
  ON disclosure_signatories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "disc_sig_update"
  ON disclosure_signatories FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "disc_sig_delete"
  ON disclosure_signatories FOR DELETE TO authenticated
  USING (public.is_admin());

-- SECURITY DEFINER RPC to update the single row without RLS recursion
CREATE OR REPLACE FUNCTION public.update_disclosure_signatories(
  p_id                     UUID,
  p_research_head_name     TEXT,
  p_research_head_position TEXT,
  p_president_name         TEXT,
  p_president_position     TEXT,
  p_supervisor_title       TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.disclosure_signatories SET
    research_head_name     = p_research_head_name,
    research_head_position = p_research_head_position,
    president_name         = p_president_name,
    president_position     = p_president_position,
    supervisor_title       = p_supervisor_title,
    updated_at             = NOW()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_disclosure_signatories(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
