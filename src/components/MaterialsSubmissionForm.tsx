/**
 * Materials Submission Form Component
 * Applicant interface for submitting presentation materials
 */

import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, X, FileText, Image } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MATERIALS_REQUIREMENTS, MATERIALS_STORAGE_PATHS } from '@/lib/processConstants';

interface MaterialsSubmissionFormProps {
  ipRecordId: string;
  applicantId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FileUpload {
  file: File | null;
  progress: number;
  error: string | null;
  fileName: string | null;
  fileUrl: string | null;
}

export function MaterialsSubmissionForm({
  ipRecordId,
  applicantId,
  onSuccess,
  onError,
}: MaterialsSubmissionFormProps) {
  const [materialsStatus, setMaterialsStatus] = useState<'not_requested' | 'requested' | 'submitted'>('not_requested');
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [poster, setPoster] = useState<FileUpload>({
    file: null,
    progress: 0,
    error: null,
    fileName: null,
    fileUrl: null,
  });

  const [paper, setPaper] = useState<FileUpload>({
    file: null,
    progress: 0,
    error: null,
    fileName: null,
    fileUrl: null,
  });

  useEffect(() => {
    fetchMaterialsStatus();
  }, [ipRecordId]);

  const fetchMaterialsStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('presentation_materials')
        .select('*')
        .eq('ip_record_id', ipRecordId)
        .single();

      if (!error && data) {
        setMaterialsStatus(data.status);
        setRequestedAt(data.materials_requested_at);
        setSubmittedAt(data.materials_submitted_at);

        // Restore uploaded files
        if (data.status === 'submitted') {
          setPoster((prev) => ({
            ...prev,
            fileName: data.poster_file_name,
            fileUrl: data.poster_file_url,
          }));
          setPaper((prev) => ({
            ...prev,
            fileName: data.paper_file_name,
            fileUrl: data.paper_file_url,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching materials status:', err);
    }
  };

  const handleFileSelect = (type: 'poster' | 'paper', file: File) => {
    const requirements = type === 'poster' ? MATERIALS_REQUIREMENTS.POSTER : MATERIALS_REQUIREMENTS.PAPER;

    // Validate file type
    if (!requirements.fileTypes.includes(file.type)) {
      const error = `Invalid file type. Accepted: ${requirements.fileTypes.join(', ')}`;
      if (type === 'poster') {
        setPoster((prev) => ({ ...prev, error }));
      } else {
        setPaper((prev) => ({ ...prev, error }));
      }
      return;
    }

    // Validate file size
    if (file.size > requirements.maxSize) {
      const error = `File too large. Maximum size: ${requirements.maxSize / (1024 * 1024)}MB`;
      if (type === 'poster') {
        setPoster((prev) => ({ ...prev, error }));
      } else {
        setPaper((prev) => ({ ...prev, error }));
      }
      return;
    }

    if (type === 'poster') {
      setPoster((prev) => ({ ...prev, file, fileName: file.name, error: null, progress: 0 }));
    } else {
      setPaper((prev) => ({ ...prev, file, fileName: file.name, error: null, progress: 0 }));
    }
  };

  const uploadFile = async (
    type: 'poster' | 'paper',
    file: File
  ): Promise<{ fileName: string; fileUrl: string; fileSize: number } | null> => {
    try {
      const storagePath =
        type === 'poster' ? MATERIALS_STORAGE_PATHS.POSTER : MATERIALS_STORAGE_PATHS.PAPER;
      const fileName = `${ipRecordId}/${Date.now()}_${file.name}`;
      const filePath = `${storagePath}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('presentation-materials')
        .upload(filePath, file, {
          upsert: false,
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100;
            if (type === 'poster') {
              setPoster((prev) => ({ ...prev, progress: percentage }));
            } else {
              setPaper((prev) => ({ ...prev, progress: percentage }));
            }
          },
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('presentation-materials')
        .getPublicUrl(filePath);

      return {
        fileName: file.name,
        fileUrl: urlData?.publicUrl || '',
        fileSize: file.size,
      };
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setLoading(true);

    try {
      // Validate both files are selected
      if (!poster.file && !poster.fileName) {
        throw new Error('Please select a scientific poster');
      }
      if (!paper.file && !paper.fileName) {
        throw new Error('Please select an IMRaD short paper');
      }

      // Upload new files if selected
      let posterData = { fileName: poster.fileName, fileUrl: poster.fileUrl, fileSize: 0 };
      let paperData = { fileName: paper.fileName, fileUrl: paper.fileUrl, fileSize: 0 };

      if (poster.file) {
        posterData = await uploadFile('poster', poster.file) || posterData;
      }

      if (paper.file) {
        paperData = await uploadFile('paper', paper.file) || paperData;
      }

      // Update database directly with Supabase
      console.log('Submitting materials to database:', {
        ip_record_id: ipRecordId,
        poster_file_name: posterData.fileName,
        poster_file_url: posterData.fileUrl,
        paper_file_name: paperData.fileName,
        paper_file_url: paperData.fileUrl,
      });

      const { error: updateError } = await supabase
        .from('presentation_materials')
        .update({
          status: 'submitted',
          materials_submitted_at: new Date().toISOString(),
          poster_file_name: posterData.fileName,
          poster_file_url: posterData.fileUrl,
          poster_file_size: posterData.fileSize,
          poster_uploaded_at: new Date().toISOString(),
          paper_file_name: paperData.fileName,
          paper_file_url: paperData.fileUrl,
          paper_file_size: paperData.fileSize,
          paper_uploaded_at: new Date().toISOString(),
        })
        .eq('ip_record_id', ipRecordId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to save materials: ${updateError.message}`);
      }

      // ==========================================
      // SLA TRACKING: Close materials_requested stage
      // ==========================================
      try {
        const { data: closedStageData, error: closedStageError } = await supabase
          .rpc('close_stage_instance', {
            p_record_id: ipRecordId,
            p_close_status: 'COMPLETED',
          });

        if (closedStageError) {
          console.warn('Could not close materials_requested stage instance:', closedStageError);
        } else {
          console.log('Closed materials_requested stage instance:', closedStageData);
        }
      } catch (slaError) {
        // SLA tracking is non-critical; log but don't fail the submission
        console.warn('SLA tracking error (non-critical):', slaError);
      }

      console.log('Materials submitted successfully');
      setSubmitSuccess(true);
      await fetchMaterialsStatus();
      onSuccess?.();

      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error: any) {
      const message = error.message || 'Failed to submit materials';
      console.error('Submit error:', error);
      setSubmitError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  // If materials haven't been requested yet, show message
  if (materialsStatus === 'not_requested') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">
              Materials Not Yet Requested
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              The admin has not yet requested presentation materials. You will be notified when materials are needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If materials have been submitted, show confirmation
  if (materialsStatus === 'submitted' && submittedAt) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-900">
              ✓ Materials Submitted Successfully
            </p>
            <p className="text-sm text-green-700 mt-1">
              Your presentation materials were submitted on{' '}
              {new Date(submittedAt).toLocaleString()}. The admin will review and provide feedback.
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-green-200">
                <Image className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">{poster.fileName}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded border border-green-200">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-700">{paper.fileName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Materials requested but not yet submitted
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        Submit Presentation Materials
      </h3>

      {requestedAt && (
        <p className="text-sm text-gray-600 mb-4">
          Materials were requested on {new Date(requestedAt).toLocaleString()}.
          Please upload both files below.
        </p>
      )}

      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {submitSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Materials submitted successfully!</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Poster Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {MATERIALS_REQUIREMENTS.POSTER.name}{' '}
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-600 mb-2">
            {MATERIALS_REQUIREMENTS.POSTER.description} (Max:{' '}
            {MATERIALS_REQUIREMENTS.POSTER.maxSize / (1024 * 1024)}MB)
          </p>

          {poster.fileName ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">{poster.fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => setPoster((prev) => ({ ...prev, file: null, fileName: null }))}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <FileUploadBox
              onFileSelect={(file) => handleFileSelect('poster', file)}
              error={poster.error}
              progress={poster.progress}
              accept="image/jpeg,image/png"
              icon={<Image className="h-8 w-8" />}
            />
          )}
        </div>

        {/* Paper Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {MATERIALS_REQUIREMENTS.PAPER.name} <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-600 mb-2">
            {MATERIALS_REQUIREMENTS.PAPER.description} (Max:{' '}
            {MATERIALS_REQUIREMENTS.PAPER.maxSize / (1024 * 1024)}MB)
          </p>

          {paper.fileName ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">{paper.fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => setPaper((prev) => ({ ...prev, file: null, fileName: null }))}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <FileUploadBox
              onFileSelect={(file) => handleFileSelect('paper', file)}
              error={paper.error}
              progress={paper.progress}
              accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              icon={<FileText className="h-8 w-8" />}
            />
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !poster.fileName || !paper.fileName}
          className={`w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
            !poster.fileName || !paper.fileName
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Submitting...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Submit Materials
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">What is IMRaD format?</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>I</strong>ntroduction - Background and problem</li>
            <li><strong>M</strong>ethods - Your approach</li>
            <li><strong>R</strong>esults - Key findings</li>
            <li><strong>D</strong>iscussion - Implications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface FileUploadBoxProps {
  onFileSelect: (file: File) => void;
  error: string | null;
  progress: number;
  accept: string;
  icon: React.ReactNode;
}

function FileUploadBox({
  onFileSelect,
  error,
  progress,
  accept,
  icon,
}: FileUploadBoxProps) {
  return (
    <div className="relative">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="text-gray-400 mb-2">{icon}</div>
          <p className="text-sm text-gray-600">Click to select file or drag and drop</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
      </label>

      {progress > 0 && progress < 100 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-1">{Math.round(progress)}%</p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
