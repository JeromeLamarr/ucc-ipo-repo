import React, { useState } from 'react';
import { Download, FileText, Image, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MaterialsViewProps {
  submissionId: string;
  posterFileName?: string;
  posterFileUrl?: string;
  posterFileSize?: number;
  paperFileName?: string;
  paperFileUrl?: string;
  paperFileSize?: number;
  userRole?: 'applicant' | 'admin';
}

export function MaterialsView({
  posterFileName,
  posterFileUrl,
  posterFileSize,
  paperFileName,
  paperFileUrl,
  paperFileSize,
  userRole,
}: MaterialsViewProps) {
  const [downloading, setDownloading] = useState<'poster' | 'paper' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = async (
    type: 'poster' | 'paper',
    fileName?: string,
    fileUrl?: string
  ) => {
    if (!fileName || !fileUrl) {
      setError('File information not available');
      return;
    }

    try {
      setDownloading(type);
      setError(null);

      // Extract bucket and path from the file URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = fileUrl.split('/');
      const pathIndex = urlParts.indexOf('presentation-materials');
      
      if (pathIndex === -1) {
        throw new Error('Invalid file URL');
      }

      // Get the file path (everything after bucket name)
      const filePath = urlParts.slice(pathIndex + 1).join('/');

      // Download from Supabase Storage
      const { data, error: downloadError } = await supabase.storage
        .from('presentation-materials')
        .download(filePath);

      if (downloadError) {
        throw downloadError;
      }

      // Create blob URL and trigger download
      const blob = new Blob([data], { type: data.type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  // Check if any materials were submitted
  const hasMaterials = (posterFileUrl || paperFileUrl);

  if (!hasMaterials) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <AlertCircle className="h-5 w-5" />
          <span>No materials have been submitted yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {/* Scientific Poster */}
        {posterFileUrl && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Image className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-medium text-gray-900">Scientific Poster</h4>
                  <p className="text-sm text-gray-600 break-all">{posterFileName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(posterFileSize)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload('poster', posterFileName, posterFileUrl)}
                disabled={downloading !== null}
                className="ml-4 inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium flex-shrink-0"
              >
                <Download className={`h-4 w-4 ${downloading === 'poster' ? 'animate-spin' : ''}`} />
                {downloading === 'poster' ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {/* IMRaD Short Paper */}
        {paperFileUrl && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <FileText className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-medium text-gray-900">IMRaD Short Paper</h4>
                  <p className="text-sm text-gray-600 break-all">{paperFileName}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(paperFileSize)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload('paper', paperFileName, paperFileUrl)}
                disabled={downloading !== null}
                className="ml-4 inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium flex-shrink-0"
              >
                <Download className={`h-4 w-4 ${downloading === 'paper' ? 'animate-spin' : ''}`} />
                {downloading === 'paper' ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
