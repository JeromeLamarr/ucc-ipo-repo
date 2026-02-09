import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  path: string;
  type: 'image' | 'video';
}

/**
 * Upload an image or video file to Supabase storage
 */
export async function uploadFile(
  file: File,
  type: 'image' | 'video',
  pageSlug: string
): Promise<UploadResult> {
  if (!file) {
    throw new Error('No file selected');
  }

  // Validate file type
  const isImage = type === 'image' && file.type.startsWith('image/');
  const isVideo = type === 'video' && file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error(`Invalid ${type} file. Please select a valid ${type} file.`);
  }

  // Validate file size (100MB max)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File is too large. Maximum size is 100MB.`);
  }

  const bucket = type === 'image' ? 'cms-images' : 'cms-videos';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const filename = `${pageSlug}-${timestamp}-${randomStr}-${file.name}`;
  const filePath = `${pageSlug}/${filename}`;

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You must be logged in to upload files');
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      // Check for specific RLS policy error
      if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        throw new Error(
          `Storage bucket "${bucket}" is not properly configured. ` +
          `Please contact your administrator to set up file upload permissions. ` +
          `(Technical: RLS policy error)`
        );
      }
      
      if (error.message?.includes('Bucket not found')) {
        throw new Error(
          `Storage bucket "${bucket}" does not exist. ` +
          `Please run the setup_storage_rls.sql file in your Supabase SQL editor to create it.`
        );
      }

      throw new Error(error.message || `Failed to upload ${type}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicData.publicUrl,
      path: filePath,
      type,
    };
  } catch (error: any) {
    console.error(`Error uploading ${type}:`, error);
    throw error;
  }
}
