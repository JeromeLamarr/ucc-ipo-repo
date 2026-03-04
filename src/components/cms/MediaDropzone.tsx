import { useRef, useState, useCallback } from 'react';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MediaDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  bucket?: string;
  folder?: string;
}

export function MediaDropzone({
  value,
  onChange,
  label,
  placeholder = 'Drop image here or click to browse',
  bucket = 'cms-images',
  folder = 'uploads',
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    setProgress(10);
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are accepted');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File must be smaller than 10 MB');
      }

      const ext = file.name.split('.').pop() ?? 'jpg';
      const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setProgress(40);
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(name, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadErr) throw uploadErr;

      setProgress(80);
      const { data } = supabase.storage.from(bucket).getPublicUrl(name);
      setProgress(100);
      onChange(data.publicUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [bucket, folder, onChange]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    upload(files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-40 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-gray-800 text-sm font-medium rounded-lg shadow hover:bg-gray-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 bg-white text-red-600 rounded-lg shadow hover:bg-red-50"
              aria-label="Remove image"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg h-32 cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          } ${uploading ? 'cursor-not-allowed opacity-70' : ''}`}
        >
          {uploading ? (
            <>
              <Loader2 size={24} className="text-blue-500 animate-spin" />
              <span className="text-sm text-gray-600">Uploading… {progress}%</span>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              {dragging ? (
                <Image size={24} className="text-blue-500" />
              ) : (
                <Upload size={24} className="text-gray-400" />
              )}
              <span className="text-sm text-gray-500 text-center px-4">{placeholder}</span>
              <span className="text-xs text-gray-400">PNG, JPG, WEBP up to 10 MB</span>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <X size={12} /> {uploadError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or paste URL</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
