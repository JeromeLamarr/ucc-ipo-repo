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
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
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
    throw new Error(`Failed to upload ${type}: ${error.message}`);
  }
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(
  path: string,
  type: 'image' | 'video'
): Promise<void> {
  const bucket = type === 'image' ? 'cms-images' : 'cms-videos';

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error(`Error deleting ${type}:`, error);
    throw new Error(`Failed to delete ${type}: ${error.message}`);
  }
}

/**
 * Get a list of all files in a page directory
 */
export async function listFiles(
  pageSlug: string,
  type: 'image' | 'video'
): Promise<string[]> {
  const bucket = type === 'image' ? 'cms-images' : 'cms-videos';

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(pageSlug);

    if (error) {
      throw error;
    }

    return data?.map(f => f.name) || [];
  } catch (error: any) {
    console.error(`Error listing ${type}s:`, error);
    return [];
  }
}
