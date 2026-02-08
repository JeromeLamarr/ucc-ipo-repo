import { useEffect, useState } from 'react';
import { BrandingData, DEFAULT_BRANDING, fetchBrandingData, subscribeToBrandingChanges } from '../services/brandingService';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Custom hook to fetch and manage branding data
 * Handles loading state, errors, and real-time updates
 */
export function useBranding() {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const loadBranding = async () => {
      try {
        setError(null);
        const data = await fetchBrandingData();
        setBranding(data);

        // Subscribe to real-time changes
        subscription = subscribeToBrandingChanges((updatedBranding) => {
          setBranding(updatedBranding);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load branding';
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
    logoPath: branding.logo_path,
    primaryColor: branding.primary_color || '#2563EB',
  };
}
