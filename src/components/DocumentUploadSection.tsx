import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2, FileIcon } from 'lucide-react';
import { validateFile } from '../lib/validation';

interface UploadedFile {
  file: File;
  type: string;
}

interface DocumentUploadSectionProps {
  uploadedFiles: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemoved: (index: number) => void;
  onError: (error: string) => void;
  maxTotalSize?: number; // in MB
  maxFileSize?: number; // in MB
}

export const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  uploadedFiles,
  onFilesAdded,
  onFileRemoved,
  onError,
  maxTotalSize = 50,
  maxFileSize = 25,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_CATEGORIES = ['disclosure', 'drawing', 'attachment'];
  const uploadedCategories = new Set(uploadedFiles.map(f => f.type));
  const missingCategories = REQUIRED_CATEGORIES.filter(cat => !uploadedCategories.has(cat));
  const allRequiredUploaded = missingCategories.length === 0;

  const totalUploadedSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);

  const processFiles = (files: FileList | null) => {
    if (!files) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        return;
      }

      // Validate individual file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        errors.push(`${file.name}: Exceeds ${maxFileSize}MB size limit`);
        return;
      }

      newFiles.push({
        file,
        type: 'attachment', // Default type - can be reassigned
      });
    });

    // Check total size
    const totalSize = (totalUploadedSize + newFiles.reduce((sum, f) => sum + f.file.size / (1024 * 1024), 0));
    if (totalSize > maxTotalSize) {
      errors.push(`Total upload size exceeds ${maxTotalSize}MB limit. Current: ${totalSize.toFixed(1)}MB`);
    }

    if (errors.length > 0) {
      onError(errors.join('\n'));
    } else if (newFiles.length > 0) {
      onFilesAdded(newFiles);
      onError(''); // Clear previous errors
    }

    setUploading(false);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const getCategoryLabel = (type: string) => {
    const labels: Record<string, string> = {
      disclosure: 'Disclosure Form',
      drawing: 'Technical Drawings',
      attachment: 'Supporting Documents',
    };
    return labels[type] || type;
  };

  const getCategoryDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      disclosure: 'Initial intellectual property disclosure form',
      drawing: 'Technical drawings, diagrams, or schematics',
      attachment: 'Any supporting or additional documents',
    };
    return descriptions[type] || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Documents</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload all necessary documentation for your intellectual property record. You can upload any type of file, but ensure you include:
        </p>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
          {allRequiredUploaded ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-green-700">All Required Documents Uploaded</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <span>Required Documents</span>
            </>
          )}
        </h4>
        <ul className="space-y-2">
          {REQUIRED_CATEGORIES.map((category) => {
            const hasCategory = uploadedCategories.has(category);
            return (
              <li key={category} className="flex items-center gap-2 text-sm">
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                  hasCategory 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300'
                }`}>
                  {hasCategory && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <span className={hasCategory ? 'text-green-700 font-medium' : 'text-gray-700'}>
                  {getCategoryLabel(category)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-lg font-medium text-gray-900 mb-1">
          Drag and drop files here
        </p>
        <p className="text-sm text-gray-600 mb-4">
          or
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
          title="Upload documents"
        />
        <div className="mt-4 pt-4 border-t border-gray-300">
          <p className="text-xs text-gray-500">
            Max file size: {maxFileSize}MB • Total limit: {maxTotalSize}MB
          </p>
        </div>
      </div>

      {/* Storage Status */}
      {uploadedFiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Storage Used</p>
            <p className="text-sm text-gray-600">
              {totalUploadedSize.toFixed(1)}MB / {maxTotalSize}MB
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                totalUploadedSize > maxTotalSize * 0.9
                  ? 'bg-red-500'
                  : totalUploadedSize > maxTotalSize * 0.7
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalUploadedSize / maxTotalSize) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => {
              const categoryLabel = getCategoryLabel(file.type);
              const categoryDescription = getCategoryDescription(file.type);
              const fileSizeMB = (file.file.size / (1024 * 1024)).toFixed(2);

              return (
                <div
                  key={index}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-2 mb-1">
                          {categoryLabel}
                        </span>
                        <span>{fileSizeMB}MB</span>
                      </p>
                      {categoryDescription && (
                        <p className="text-xs text-gray-400 mt-1">{categoryDescription}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFileRemoved(index)}
                    className="ml-3 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    title="Remove file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No files uploaded yet. Start by uploading your required documents above.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">Tips for Document Upload:</h4>
        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li>Ensure all documents are clear and legible</li>
          <li>Use PDF format for text documents when possible</li>
          <li>For images, use PNG or JPG formats</li>
          <li>Include all relevant supporting evidence</li>
          <li>Organize files logically before uploading</li>
        </ul>
      </div>
    </div>
  );
};
