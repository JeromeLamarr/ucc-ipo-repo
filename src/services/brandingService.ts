import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type BrandingData = Database['public']['Tables']['site_settings']['Row'];

// Fallback values for initial load
export const DEFAULT_BRANDING: BrandingData = {
  id: 1,
  site_name: 'University of Caloocan City Intellectual Property Office',
  logo_path: null,
  primary_color: '#2563EB',
  updated_at: new Date().toISOString(),
};

// Storage configuration
export const STORAGE_CONFIG = {
  bucketName: 'branding',
  logoFolder: 'logos',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
} as const;

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > STORAGE_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File size must be less than ${STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!STORAGE_CONFIG.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed: ${STORAGE_CONFIG.allowedExtensions.join(', ')}`,
    };
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!STORAGE_CONFIG.allowedExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${STORAGE_CONFIG.allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Generate unique filename for uploaded logo
 */
export function generateLogoFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${STORAGE_CONFIG.logoFolder}/${timestamp}-${random}.${extension}`;
}

/**
 * Upload logo image to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadLogo(file: File): Promise<string | null> {
  try {
    console.log('[uploadLogo] Starting upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      console.error('[uploadLogo] Validation failed:', validation.error);
      throw new Error(validation.error || 'Invalid file');
    }
    console.log('[uploadLogo] File validation passed');

    // Generate filename
    const filename = generateLogoFilename(file.name);
    console.log('[uploadLogo] Generated filename:', filename);

    // Upload to storage
    console.log('[uploadLogo] Starting storage upload to bucket:', STORAGE_CONFIG.bucketName);
    const { data, error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    console.log('[uploadLogo] Upload response - Error:', error, 'Data:', data);

    if (error) {
      console.error('[uploadLogo] Upload error details:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    console.log('[uploadLogo] Upload successful, file path:', data.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .getPublicUrl(data.path);

    console.log('[uploadLogo] Public URL data:', publicUrlData);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('[uploadLogo] Upload complete, public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[uploadLogo] Error uploading logo:', err);
    throw err;
  }
}

/**
 * Delete logo from storage
 */
export async function deleteLogo(logoPath: string): Promise<boolean> {
  try {
    if (!logoPath) return false;

    // Extract file path from public URL
    const urlParts = logoPath.split(`${STORAGE_CONFIG.bucketName}/`);
    if (urlParts.length < 2) {
      console.warn('Could not extract file path from URL:', logoPath);
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(STORAGE_CONFIG.bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting logo:', err);
    return false;
  }
}
export async function fetchBrandingData(): Promise<BrandingData> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('id, site_name, logo_path, primary_color, updated_at')
      .eq('id', 1)
      .single();

    if (error) {
      console.warn('Failed to fetch branding data:', error.message);
      return DEFAULT_BRANDING;
    }

    if (!data) {
      console.warn('No branding data found');
      return DEFAULT_BRANDING;
    }

    return data as BrandingData;
  } catch (err) {
    console.error('Error fetching branding data:', err);
    return DEFAULT_BRANDING;
  }
}

/**
 * Update branding data in the site_settings table
 * Only updates the id=1 row (singleton pattern)
 */
export async function updateBrandingData(
  updates: Database['public']['Tables']['site_settings']['Update']
): Promise<BrandingData | null> {
  try {
    // Always update the timestamp
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await supabase
      .from('site_settings' as const)
      .update(updatePayload as any)
      .eq('id', 1)
      .select()
      .single();

    const { data, error } = result;

    if (error) {
      console.error('Failed to update branding data:', error.message);
      return null;
    }

    return data as BrandingData;
  } catch (err) {
    console.error('Error updating branding data:', err);
    return null;
  }
}

/**
 * Subscribe to real-time changes on the site_settings table
 * Useful for keeping branding data in sync across the app
 */
export function subscribeToBrandingChanges(callback: (branding: BrandingData) => void) {
  const subscription = (supabase as any)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'id=eq.1',
      },
      (payload: any) => {
        if (payload.new) {
          callback(payload.new as BrandingData);
        }
      }
    )
    .subscribe();

  return subscription;
}
