import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle2, FileIcon, Loader } from 'lucide-react';
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
  uploadProgress?: number; // 0-100 for upload progress
  isUploading?: boolean; // is currently uploading to server
}

export const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  uploadedFiles,
  onFilesAdded,
  onFileRemoved,
  onError,
  maxTotalSize = 50,
  maxFileSize = 25,
  uploadProgress = 0,
  isUploading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalUploadedSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);

  const processFiles = (files: FileList | null) => {
    if (!files) return;

    // No validation here - just quick file selection
    // Files will be validated when user submits
    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      newFiles.push({
        file,
        type: 'attachment', // Default type
      });
    });

    if (newFiles.length > 0) {
      onFilesAdded(newFiles);
      onError(''); // Clear any previous errors
    }
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
      drawing: 'Technical Drawings/Diagrams',
      technical_specification: 'Technical Specifications',
      attachment: 'Supporting Documents',
    };
    return labels[type] || type;
  };

  const getCategoryDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      drawing: 'Technical drawings, schematics, or diagrams showing the IP design',
      technical_specification: 'Technical specifications, claims, or detailed descriptions',
      attachment: 'Any additional supporting documentation or evidence',
    };
    return descriptions[type] || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Documents</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload any documents relevant to your intellectual property submission.
        </p>
      </div>

      {/* Document Upload Guidelines - Formal University Standard */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-4 text-lg">Document Upload Guidelines</h4>
        
        {/* File Specifications */}
        <div className="mb-5">
          <p className="text-sm font-medium text-blue-900 mb-2">Upload any documents relevant to your intellectual property submission:</p>
          <div className="text-sm text-blue-800 space-y-1 ml-4">
            <p><strong>Accepted file types:</strong> PDF, DOCX, PPTX, PNG, JPG</p>
            <p><strong>Max file size:</strong> 10 MB per file</p>
            <p><strong>Total upload limit:</strong> 50 MB</p>
          </div>
        </div>

        {/* Recommended Materials */}
        <div className="mb-5">
          <p className="text-sm font-medium text-blue-900 mb-2">You may include:</p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside ml-2">
            <li>Technical drawings or schematics</li>
            <li>Specifications or technical documentation</li>
            <li>Research papers or supporting evidence</li>
            <li>Prototype or design images</li>
            <li>Any supplemental materials relevant to your invention</li>
          </ul>
        </div>

        {/* Confidentiality Notice */}
        <div className="bg-white border border-blue-100 rounded p-3 mt-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-blue-900">🔒 Confidentiality Notice:</span> All uploaded files are stored securely. Only authorized university reviewers (supervisors and evaluators) can access your documents. Other applicants cannot view your submissions.
          </p>
        </div>
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
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          disabled={isUploading}
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Browse Files'
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
          title="Upload documents"
        />
        <div className="mt-4 pt-4 border-t border-gray-300">
          <p className="text-xs text-gray-500">
            Max file size: {maxFileSize}MB • Total limit: {maxTotalSize}MB
          </p>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              Uploading files to server...
            </p>
            <p className="text-sm font-bold text-blue-600">{Math.round(uploadProgress)}%</p>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Please don't close this window or refresh the page during upload.
          </p>
        </div>
      )}

      {/* Storage Status */}
      {uploadedFiles.length > 0 && !isUploading && (
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
            Uploaded Files ({uploadedFiles.length}) {isUploading && <Loader className="h-4 w-4 animate-spin inline ml-2" />}
          </h4>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => {
              const categoryLabel = getCategoryLabel(file.type);
              const categoryDescription = getCategoryDescription(file.type);
              const fileSizeMB = (file.file.size / (1024 * 1024)).toFixed(2);

              return (
                <div
                  key={index}
                  className={`flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ${
                    isUploading ? 'opacity-60' : ''
                  }`}
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
                    disabled={isUploading}
                    className="ml-3 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
            No files uploaded yet. You can add documents using the upload area above.
          </p>
        </div>
      )}
    </div>
  );
};
