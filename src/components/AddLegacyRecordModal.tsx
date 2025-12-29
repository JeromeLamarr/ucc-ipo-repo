import { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AddLegacyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Inventor {
  name: string;
  affiliation: string;
  contribution: string;
}

export function AddLegacyRecordModal({ isOpen, onClose, onSuccess }: AddLegacyRecordModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; type: string }[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    category: 'patent' as const,
    abstract: '',
    inventors: [{ name: '', affiliation: '', contribution: '' }] as Inventor[],
    legacySource: 'Physical Archive' as const,
    originalFilingDate: '',
    ipophilApplicationNo: '',
    remarks: '',
  });

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

  const handleNext = () => {
    setError('');
    if (step === 1 && !validateStep1()) {
      return;
    }
    if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!validateStep2()) {
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      // Create the IP record
      const { data: recordData, error: recordError } = await (
        (supabase.from('ip_records') as any).insert([
          {
            title: formData.title,
            category: formData.category,
            abstract: formData.abstract,
            details: {
              inventors: formData.inventors,
              originalFilingDate: formData.originalFilingDate,
              ipophilApplicationNo: formData.ipophilApplicationNo,
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
      );

      if (recordError) throw recordError;

      // Upload files if any
      if (uploadedFiles.length > 0 && recordData) {
        for (const uploadedFile of uploadedFiles) {
          const timestamp = Date.now();
          const fileName = `${timestamp}-${uploadedFile.file.name}`;
          const filePath = `ip-documents/${(recordData as any)[0].id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('ip_documents')
            .upload(filePath, uploadedFile.file);

          if (uploadError) throw uploadError;

          // Create metadata record
          const { error: docError } = await (
            (supabase.from('ip_documents') as any).insert([
              {
                ip_record_id: (recordData as any)[0].id,
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

      // Reset form
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
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating legacy record');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Add Legacy IP Record</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-amber-700 p-2 rounded-lg"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Step 1: IP Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter IP title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="IP Title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    aria-label="IP Category"
                  >
                    <option value="patent">Patent</option>
                    <option value="copyright">Copyright</option>
                    <option value="trademark">Trademark</option>
                    <option value="design">Industrial Design</option>
                    <option value="utility_model">Utility Model</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abstract / Description
                </label>
                <textarea
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  placeholder="Brief description of the IP"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="Abstract"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Inventors <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        inventors: [...formData.inventors, { name: '', affiliation: '', contribution: '' }],
                      })
                    }
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    + Add Inventor
                  </button>
                </div>

                {formData.inventors.map((inventor, idx) => (
                  <div key={idx} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={inventor.name}
                      onChange={(e) => {
                        const newInventors = [...formData.inventors];
                        newInventors[idx].name = e.target.value;
                        setFormData({ ...formData, inventors: newInventors });
                      }}
                      placeholder="Inventor name"
                      className="w-full px-3 py-2 border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      aria-label={`Inventor ${idx + 1} name`}
                    />
                    <input
                      type="text"
                      value={inventor.affiliation}
                      onChange={(e) => {
                        const newInventors = [...formData.inventors];
                        newInventors[idx].affiliation = e.target.value;
                        setFormData({ ...formData, inventors: newInventors });
                      }}
                      placeholder="Affiliation"
                      className="w-full px-3 py-2 border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      aria-label={`Inventor ${idx + 1} affiliation`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Documents (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setUploadedFiles(
                      files.map((file) => ({
                        file,
                        type: 'attachment',
                      }))
                    );
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="Document upload"
                />
                {uploadedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">{uploadedFiles.length} file(s) selected</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Step 2: Legacy Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Record Source <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.legacySource}
                  onChange={(e) => setFormData({ ...formData, legacySource: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="Record source"
                >
                  <option value="Physical Archive">Physical Archive</option>
                  <option value="Email">Email</option>
                  <option value="Old System">Old System</option>
                  <option value="Database Migration">Database Migration</option>
                  <option value="Manual Entry">Manual Entry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Filing Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.originalFilingDate}
                  onChange={(e) => setFormData({ ...formData, originalFilingDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="Original filing date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IPOPHIL Application No. (Optional)
                </label>
                <input
                  type="text"
                  value={formData.ipophilApplicationNo}
                  onChange={(e) => setFormData({ ...formData, ipophilApplicationNo: e.target.value })}
                  placeholder="e.g., PR-2024-00123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="IPOPHIL application number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Any additional notes or remarks..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  aria-label="Remarks"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-between gap-4">
          {step === 2 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={handleNext}
              className="ml-auto flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Legacy Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
