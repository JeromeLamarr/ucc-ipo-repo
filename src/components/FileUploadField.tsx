import { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file, type, pageSlug);
      setPreviewUrl(result.url);
      onUploadComplete(result.url, result.path);
    } catch (error: any) {
      const errorMsg = error.message || `Failed to upload ${type}`;
      setError(errorMsg);
      onError(errorMsg);
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
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Upload Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {error.includes('not properly configured') && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <p className="font-medium mb-1">To fix this:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your Supabase Dashboard</li>
                    <li>Open the SQL Editor</li>
                    <li>Create a new query and paste the contents of <code className="bg-yellow-100 px-1 rounded">setup_storage_rls.sql</code></li>
                    <li>Run the query to set up file upload permissions</li>
                    <li>Refresh this page and try uploading again</li>
                  </ol>
                </div>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
