import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type FooterSettings = Database['public']['Tables']['site_footer_settings']['Row'];
export type FooterLink = Database['public']['Tables']['site_footer_links']['Row'];
export type FooterLinkGroup = FooterLink['group_name'];

// ── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  id: 1,
  about_text: null,
  contact_email: null,
  contact_phone: null,
  contact_address: null,
  copyright_text: null,
  show_quick_links: true,
  show_support: true,
  show_contact: true,
  updated_at: new Date().toISOString(),
};

// ── Settings CRUD ──────────────────────────────────────────────────────────

export async function fetchFooterSettings(): Promise<FooterSettings> {
  const { data, error } = await supabase
    .from('site_footer_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    console.warn('[fetchFooterSettings] Failed:', error?.message);
    return DEFAULT_FOOTER_SETTINGS;
  }
  return data as FooterSettings;
}

export async function updateFooterSettings(
  updates: Database['public']['Tables']['site_footer_settings']['Update'],
): Promise<FooterSettings | null> {
  const u = updates as any;

  const { data, error } = await (supabase as any).rpc('update_footer_settings', {
    p_about_text:       u.about_text       ?? null,
    p_contact_email:    u.contact_email    ?? null,
    p_contact_phone:    u.contact_phone    ?? null,
    p_contact_address:  u.contact_address  ?? null,
    p_copyright_text:   u.copyright_text   ?? null,
    p_show_quick_links: u.show_quick_links ?? true,
    p_show_support:     u.show_support     ?? true,
    p_show_contact:     u.show_contact     ?? true,
  });

  if (error) {
    console.error('[updateFooterSettings] RPC error:', error.code, error.message);
    throw new Error(error.message || 'Failed to save footer settings');
  }

  return (data as FooterSettings) ?? null;
}

// ── Links CRUD ─────────────────────────────────────────────────────────────

export async function fetchFooterLinks(): Promise<FooterLink[]> {
  const { data, error } = await supabase
    .from('site_footer_links')
    .select('*')
    .order('group_name')
    .order('sort_order');

  if (error) {
    console.warn('[fetchFooterLinks] Failed:', error.message);
    return [];
  }
  return (data ?? []) as FooterLink[];
}

export async function upsertFooterLink(
  link: Database['public']['Tables']['site_footer_links']['Insert'],
): Promise<FooterLink | null> {
  const { data, error } = await (supabase as any).rpc('upsert_footer_link', {
    p_id:         (link as any).id   ?? null,
    p_group_name: link.group_name,
    p_label:      link.label,
    p_url:        link.url,
    p_sort_order: link.sort_order ?? 0,
    p_is_enabled: link.is_enabled ?? true,
  });

  if (error) {
    console.error('[upsertFooterLink] RPC error:', error);
    return null;
  }
  return data as FooterLink;
}

export async function deleteFooterLink(id: string): Promise<boolean> {
  const { error } = await (supabase as any).rpc('delete_footer_link', { p_id: id });

  if (error) {
    console.error('[deleteFooterLink] RPC error:', error);
    return false;
  }
  return true;
}

// ── Real-time subscription ─────────────────────────────────────────────────

export function subscribeToFooterChanges(
  onSettingsChange: (s: FooterSettings) => void,
  onLinksChange: () => void,
) {
  return supabase
    .channel('public:site_footer')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_footer_settings', filter: 'id=eq.1' },
      (payload: any) => {
        if (payload.new) onSettingsChange(payload.new as FooterSettings);
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_footer_links' },
      () => onLinksChange(),
    )
    .subscribe();
}

// ── Migration status ───────────────────────────────────────────────────────

/**
 * Returns whether the branding + footer migration has been applied.
 * Checks for the site_footer_settings table and secondary_color column.
 */
export async function checkMigrationApplied(): Promise<{
  brandingColumnsReady: boolean;
  footerTablesReady: boolean;
}> {
  const [brandingResult, footerResult] = await Promise.all([
    supabase.from('site_settings').select('secondary_color').eq('id', 1).limit(1),
    supabase.from('site_footer_settings' as any).select('id').limit(1),
  ]);

  return {
    brandingColumnsReady: !brandingResult.error,
    footerTablesReady: !footerResult.error,
  };
}
