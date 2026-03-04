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
  const { data, error } = await supabase
    .from('site_footer_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('[updateFooterSettings] Error:', error);
    return null;
  }
  return data as FooterSettings;
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
  const payload = { ...link, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('site_footer_links')
    .upsert(payload as any)
    .select()
    .single();

  if (error) {
    console.error('[upsertFooterLink] Error:', error);
    return null;
  }
  return data as FooterLink;
}

export async function deleteFooterLink(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('site_footer_links')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteFooterLink] Error:', error);
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
