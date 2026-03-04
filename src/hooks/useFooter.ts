import { useEffect, useState } from 'react';
import {
  FooterSettings,
  FooterLink,
  DEFAULT_FOOTER_SETTINGS,
  fetchFooterSettings,
  fetchFooterLinks,
  subscribeToFooterChanges,
} from '../services/footerService';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Provides footer content (settings + links) with real-time updates.
 */
export function useFooter() {
  const [settings, setSettings] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLinks = async () => {
    const data = await fetchFooterLinks();
    setLinks(data);
  };

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const load = async () => {
      const [s] = await Promise.all([fetchFooterSettings(), loadLinks()]);
      setSettings(s);
      setLoading(false);

      subscription = subscribeToFooterChanges(
        (updated) => setSettings(updated),
        () => loadLinks(),
      );
    };

    load();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const quickLinks  = links.filter((l) => l.group_name === 'quick'   && l.is_enabled);
  const supportLinks = links.filter((l) => l.group_name === 'support' && l.is_enabled);
  const socialLinks  = links.filter((l) => l.group_name === 'social'  && l.is_enabled);

  return { settings, links, quickLinks, supportLinks, socialLinks, loading };
}
