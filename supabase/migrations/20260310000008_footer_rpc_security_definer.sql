-- Bypass all RLS on footer tables by using SECURITY DEFINER RPC functions.
-- This is the same proven pattern used for update_certificate_signatories.
-- Direct table writes keep failing due to RLS policy evaluation issues;
-- SECURITY DEFINER functions run as the function owner and bypass RLS entirely.

-- ── update_footer_settings ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_footer_settings(
  p_about_text       TEXT,
  p_contact_email    TEXT,
  p_contact_phone    TEXT,
  p_contact_address  TEXT,
  p_copyright_text   TEXT,
  p_show_quick_links BOOLEAN,
  p_show_support     BOOLEAN,
  p_show_contact     BOOLEAN
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE public.site_footer_settings
  SET
    about_text       = p_about_text,
    contact_email    = p_contact_email,
    contact_phone    = p_contact_phone,
    contact_address  = p_contact_address,
    copyright_text   = p_copyright_text,
    show_quick_links = p_show_quick_links,
    show_support     = p_show_support,
    show_contact     = p_show_contact,
    updated_at       = NOW()
  WHERE id = 1
  RETURNING to_json(site_footer_settings.*) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_footer_settings(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ── upsert_footer_link ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_footer_link(
  p_id          UUID,
  p_group_name  TEXT,
  p_label       TEXT,
  p_url         TEXT,
  p_sort_order  INT,
  p_is_enabled  BOOLEAN
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF p_id IS NULL THEN
    -- INSERT new
    INSERT INTO public.site_footer_links (group_name, label, url, sort_order, is_enabled)
    VALUES (p_group_name, p_label, p_url, p_sort_order, p_is_enabled)
    RETURNING to_json(site_footer_links.*) INTO v_result;
  ELSE
    -- UPSERT existing
    INSERT INTO public.site_footer_links (id, group_name, label, url, sort_order, is_enabled, updated_at)
    VALUES (p_id, p_group_name, p_label, p_url, p_sort_order, p_is_enabled, NOW())
    ON CONFLICT (id) DO UPDATE SET
      group_name  = EXCLUDED.group_name,
      label       = EXCLUDED.label,
      url         = EXCLUDED.url,
      sort_order  = EXCLUDED.sort_order,
      is_enabled  = EXCLUDED.is_enabled,
      updated_at  = NOW()
    RETURNING to_json(site_footer_links.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_footer_link(UUID, TEXT, TEXT, TEXT, INT, BOOLEAN) TO authenticated;

-- ── delete_footer_link ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_footer_link(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.site_footer_links WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_footer_link(UUID) TO authenticated;
