-- This SQL script sets up Supabase Storage buckets for CMS images and videos
-- Run this in your Supabase SQL Editor

-- Create cms-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cms-images', 'cms-images', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create cms-videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cms-videos', 'cms-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to cms-images
CREATE POLICY "Allow authenticated uploads to cms-images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

-- Allow anyone to view cms-images
CREATE POLICY "Allow public read access to cms-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cms-images');

-- Allow authenticated users to delete their own cms-images
CREATE POLICY "Allow authenticated delete from cms-images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'cms-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to upload to cms-videos
CREATE POLICY "Allow authenticated uploads to cms-videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'cms-videos' AND auth.role() = 'authenticated');

-- Allow anyone to view cms-videos
CREATE POLICY "Allow public read access to cms-videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cms-videos');

-- Allow authenticated users to delete their own cms-videos
CREATE POLICY "Allow authenticated delete from cms-videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'cms-videos' AND auth.role() = 'authenticated');
