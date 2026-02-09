import { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadFile } from '../lib/fileUpload';

interface FileUploadProps {
  type: 'image' | 'video';
  onUploadComplete: (url: string, path: string) => void;
  onError: (error: string) => void;
  pageSlug: string;
  currentUrl?: string;
  onRemove?: (url: string) => void;
}

export function FileUploadField({
  type,
  onUploadComplete,
  onError,
  pageSlug,
  currentUrl,
  onRemove,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file, type, pageSlug);
      setPreviewUrl(result.url);
      onUploadComplete(result.url, result.path);
    } catch (error: any) {
      onError(error.message);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    if (currentUrl && onRemove) {
      onRemove(currentUrl);
    }
    setPreviewUrl(null);
  };

  const acceptTypes = type === 'image' 
    ? 'image/jpeg,image/png,image/gif,image/webp' 
    : 'video/mp4,video/webm,video/quicktime';

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition">
        {previewUrl ? (
          <div className="space-y-3">
            {type === 'image' ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-40 object-cover rounded-lg"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className="w-full h-40 rounded-lg bg-black"
              />
            )}
            <div className="flex gap-2">
              <label className="flex-1 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 cursor-pointer font-medium text-center transition">
                Change {type}
                <input
                  type="file"
                  accept={acceptTypes}
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {onRemove && (
                <button
                  onClick={handleRemove}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium transition"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer py-4">
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Click to upload {type}
            </p>
            <p className="text-xs text-gray-500">
              {type === 'image' 
                ? 'PNG, JPG, GIF or WebP (max 100MB)'
                : 'MP4, WebM or MOV (max 100MB)'
              }
            </p>
            <input
              type="file"
              accept={acceptTypes}
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Uploading {type}...</span>
        </div>
      )}
    </div>
  );
}

interface MediaPickerProps {
  type: 'image' | 'video';
  onSelect: (url: string) => void;
  pageSlug: string;
}

export function MediaPicker({ type, onSelect, pageSlug }: MediaPickerProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showUpload ? (
        <div className="space-y-3">
          <FileUploadField
            type={type}
            onUploadComplete={(url) => {
              onSelect(url);
              setShowUpload(false);
            }}
            onError={setError}
            pageSlug={pageSlug}
          />
          <button
            onClick={() => setShowUpload(false)}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowUpload(true)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition"
        >
          Upload {type === 'image' ? 'Image' : 'Video'}
        </button>
      )}
    </div>
  );
}
