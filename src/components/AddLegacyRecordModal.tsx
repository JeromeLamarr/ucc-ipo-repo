import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  FileIcon,
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

const categories = [
  { value: 'patent', label: 'Patent' },
  { value: 'copyright', label: 'Copyright' },
  { value: 'trademark', label: 'Trademark' },
  { value: 'design', label: 'Industrial Design' },
  { value: 'utility_model', label: 'Utility Model' },
  { value: 'other', label: 'Other' },
];

const legacySources = [
  { value: 'Physical Archive', label: 'Physical Archive' },
  { value: 'Email', label: 'Email' },
  { value: 'Old System', label: 'Old System' },
  { value: 'Database Migration', label: 'Database Migration' },
  { value: 'Manual Entry', label: 'Manual Entry' },
  { value: 'Other', label: 'Other' },
];

interface UploadedFile {
  file: File;
  type: string;
}

interface AddLegacyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddLegacyRecordModal({ isOpen, onClose, onSuccess }: AddLegacyRecordModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'patent' as IpCategory,
    abstract: '',
    inventors: [{ name: '', affiliation: '', contribution: '' }],
    // Admin-only fields
    legacySource: 'Physical Archive',
    originalFilingDate: '',
    ipophilApplicationNo: '',
    remarks: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInventorChange = (index: number, field: string, value: string) => {
    const newInventors = [...formData.inventors];
    newInventors[index] = { ...newInventors[index], [field]: value };
    setFormData((prev) => ({
      ...prev,
      inventors: newInventors,
    }));
  };

  const addInventor = () => {
    setFormData((prev) => ({
      ...prev,
      inventors: [...prev.inventors, { name: '', affiliation: '', contribution: '' }],
    }));
  };

  const removeInventor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      inventors: prev.inventors.filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        newFiles.push({
          file,
          type: 'attachment',
        });
      }
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      setError('Failed to process files');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!formData.title.trim()) {
      setError('Please enter an IP title');
      return false;
    }
    if (formData.inventors.some((inv) => !inv.name.trim())) {
      setError('Please enter all inventor names');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.legacySource) {
      setError('Please select a record source');
      return false;
    }
    if (!formData.originalFilingDate) {
      setError('Please enter the original filing date');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
      return;
    }

    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      // Get current user ID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Create the IP record
      const { data: recordData, error: recordError } = await (
        (supabase.from('ip_records') as any).insert([
          {
            title: formData.title,
            category: formData.category,
            abstract: formData.abstract,
            details: {
              inventors: formData.inventors,
              remarks: formData.remarks,
            },
            status: 'completed',
            applicant_id: user.id,
            is_legacy_record: true,
            legacy_source: formData.legacySource,
            digitized_at: new Date().toISOString(),
            created_by_admin_id: user.id,
          },
        ])
          .select('id')
          .single() as any
      );

      if (recordError) throw recordError;
      if (!recordData) throw new Error('Failed to create record');

      // Upload files if any
      if (uploadedFiles.length > 0) {
        for (const uploadedFile of uploadedFiles) {
          const timestamp = Date.now();
          const fileName = `${timestamp}-${uploadedFile.file.name}`;
          const filePath = `ip-documents/${(recordData as any).id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('ip_documents')
            .upload(filePath, uploadedFile.file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            throw new Error(`Failed to upload file: ${uploadedFile.file.name}`);
          }

          // Record the document in the database
          const { error: docError } = await (
            (supabase.from('ip_documents') as any).insert([
              {
                ip_record_id: (recordData as any).id,
                uploader_id: user.id,
                file_name: uploadedFile.file.name,
                file_path: filePath,
                mime_type: uploadedFile.file.type,
                size_bytes: uploadedFile.file.size,
                doc_type: uploadedFile.type,
              },
            ]) as any
          );

          if (docError) throw docError;
        }
      }

      onSuccess();
      onClose();
      setStep(1);
      setFormData({
        title: '',
        category: 'patent',
        abstract: '',
        inventors: [{ name: '', affiliation: '', contribution: '' }],
        legacySource: 'Physical Archive',
        originalFilingDate: '',
        ipophilApplicationNo: '',
        remarks: '',
      });
      setUploadedFiles([]);
    } catch (err) {
      console.error('Error creating legacy record:', err);
      setError(err instanceof Error ? err.message : 'Failed to create legacy record');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Add Legacy IP Record</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: IP Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter the title of the intellectual property"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    aria-label="IP Category"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abstract / Description
                </label>
                <textarea
                  name="abstract"
                  value={formData.abstract}
                  onChange={handleInputChange}
                  placeholder="Brief description of the intellectual property"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Inventors Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">Inventors / Authors</h4>
                  <button
                    type="button"
                    onClick={addInventor}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Inventor
                  </button>
                </div>

                {formData.inventors.map((inventor, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Name *"
                        value={inventor.name}
                        onChange={(e) => handleInventorChange(index, 'name', e.target.value)}
                        className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Affiliation"
                        value={inventor.affiliation}
                        onChange={(e) => handleInventorChange(index, 'affiliation', e.target.value)}
                        className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Contribution"
                        value={inventor.contribution}
                        onChange={(e) => handleInventorChange(index, 'contribution', e.target.value)}
                        className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    {formData.inventors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInventor(index)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, Images</p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Uploaded Files:</h5>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          aria-label={`Remove file ${file.file.name}`}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => step === 1 && validateStep1() && setStep(2)}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Legacy Information */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Legacy Record Details</h3>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  These fields are for admin use only. They help track the origin and history of digitized legacy records.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Record Source *
                  </label>
                  <select
                    name="legacySource"
                    value={formData.legacySource}
                    onChange={handleInputChange}
                    aria-label="Record source"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {legacySources.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Filing Date *
                  </label>
                  <input
                    type="date"
                    name="originalFilingDate"
                    value={formData.originalFilingDate}
                    onChange={handleInputChange}
                    aria-label="Original Filing Date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IPOPHIL Application No. (Optional)
                </label>
                <input
                  type="text"
                  name="ipophilApplicationNo"
                  value={formData.ipophilApplicationNo}
                  onChange={handleInputChange}
                  placeholder="e.g., PA 2024-123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Any additional information about this legacy record"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create Record
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
