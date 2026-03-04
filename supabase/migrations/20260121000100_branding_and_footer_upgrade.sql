-- ============================================================
-- Branding & Footer Upgrade
-- 1. Add new columns to site_settings
-- 2. Create site_footer_settings (singleton)
-- 3. Create site_footer_links
-- ============================================================

-- ── 1. Extend site_settings ──────────────────────────────────
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS secondary_color   text,
  ADD COLUMN IF NOT EXISTS gradient_style    text DEFAULT 'primary-secondary',
  ADD COLUMN IF NOT EXISTS favicon_url       text;

-- ── 2. Footer settings singleton ─────────────────────────────
CREATE TABLE IF NOT EXISTS site_footer_settings (
  id               int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  about_text       text,
  contact_email    text,
  contact_phone    text,
  contact_address  text,
  copyright_text   text,
  show_quick_links boolean NOT NULL DEFAULT true,
  show_support     boolean NOT NULL DEFAULT true,
  show_contact     boolean NOT NULL DEFAULT true,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed the singleton row if not present
INSERT INTO site_footer_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Footer links ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_footer_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name  text        NOT NULL CHECK (group_name IN ('quick', 'support', 'social')),
  label       text        NOT NULL,
  url         text        NOT NULL,
  sort_order  int         NOT NULL DEFAULT 0,
  is_enabled  boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default quick links
INSERT INTO site_footer_links (group_name, label, url, sort_order)
VALUES
  ('quick',   'Home',         '/',        1),
  ('quick',   'About',        '#about',   2),
  ('quick',   'Contact',      '#contact', 3),
  ('support', 'Help Center',  '#help',    1),
  ('support', 'Documentation','#docs',    2),
  ('support', 'FAQ',          '#faq',     3)
ON CONFLICT DO NOTHING;

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE site_footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_footer_links    ENABLE ROW LEVEL SECURITY;

-- Everyone can read footer settings
DROP POLICY IF EXISTS "footer_settings_public_select" ON site_footer_settings;
CREATE POLICY "footer_settings_public_select"
  ON site_footer_settings FOR SELECT
  USING (true);

-- Admins can write footer settings
DROP POLICY IF EXISTS "footer_settings_admin_all" ON site_footer_settings;
CREATE POLICY "footer_settings_admin_all"
  ON site_footer_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  );

-- Everyone can read footer links
DROP POLICY IF EXISTS "footer_links_public_select" ON site_footer_links;
CREATE POLICY "footer_links_public_select"
  ON site_footer_links FOR SELECT
  USING (true);

-- Admins can write footer links
DROP POLICY IF EXISTS "footer_links_admin_all" ON site_footer_links;
CREATE POLICY "footer_links_admin_all"
  ON site_footer_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  );

-- ── 5. Helper trigger: auto-update updated_at ─────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_footer_settings_updated_at ON site_footer_settings;
CREATE TRIGGER trg_footer_settings_updated_at
  BEFORE UPDATE ON site_footer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_footer_links_updated_at ON site_footer_links;
CREATE TRIGGER trg_footer_links_updated_at
  BEFORE UPDATE ON site_footer_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
