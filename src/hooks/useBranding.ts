import { useEffect, useState } from 'react';
import { BrandingData, DEFAULT_BRANDING, fetchBrandingData, subscribeToBrandingChanges } from '../services/brandingService';
import { applyBrandCSSVars, applyFavicon } from '../utils/brandStyles';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook to fetch and manage branding data.
 * Handles loading state, errors, real-time updates, and injects
 * CSS custom-properties + favicon whenever branding changes.
 */
export function useBranding() {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply CSS variables + favicon whenever branding data changes
  useEffect(() => {
    applyBrandCSSVars(
      branding.primary_color ?? '#2563EB',
      branding.secondary_color,
    );
    applyFavicon(branding.favicon_url);
  }, [branding.primary_color, branding.secondary_color, branding.favicon_url]);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const loadBranding = async () => {
      try {
        console.log('[useBranding] Loading branding data...');
        setError(null);
        const data = await fetchBrandingData();
        console.log('[useBranding] Branding data loaded:', data);
        setBranding(data);

        // Subscribe to real-time changes
        console.log('[useBranding] Setting up real-time subscription...');
        subscription = subscribeToBrandingChanges((updatedBranding) => {
          console.log('[useBranding] Real-time update received:', updatedBranding);
          setBranding(updatedBranding);
        });
        console.log('[useBranding] Real-time subscription active');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load branding';
        console.error('[useBranding] Error:', message);
        setError(message);
        setBranding(DEFAULT_BRANDING);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return {
    branding,
    loading,
    error,
    siteName: branding.site_name,
    logoPath: branding.logo_url,
    primaryColor: branding.primary_color || '#2563EB',
    secondaryColor: branding.secondary_color || '#6366F1',
    gradientStyle: branding.gradient_style || 'primary-secondary',
    faviconUrl: branding.favicon_url,
  };
}
