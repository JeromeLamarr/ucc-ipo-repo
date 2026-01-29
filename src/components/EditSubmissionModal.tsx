import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Upload, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'];
type Document = Database['public']['Tables']['ip_documents']['Row'];

interface EditSubmissionModalProps {
  isOpen: boolean;
  record: IpRecord | null;
  documents: Document[];
  onClose: () => void;
  onSaveDraft: (data: any) => Promise<void>;
  onResubmit: (data: any) => Promise<void>;
  profile: any;
}

interface EditFormData {
  title: string;
  category: string;
  abstract: string;
  description: string;
  technicalField: string;
  backgroundArt: string;
  problemStatement: string;
  solution: string;
  advantages: string;
  implementation: string;
  inventors: Array<{ name: string; affiliation: string; contribution: string }>;
  dateConceived: string;
  dateReduced: string;
  priorArt: string;
  keywords: Array<{ id: string; value: string }>;
  funding: string;
  collaborators: Array<{ id: string; name: string; role: string; affiliation: string }>;
  commercialPotential: string;
  targetMarket: string;
  competitiveAdvantage: string;
  estimatedValue: string;
  relatedPublications: string;
  supervisorId: string;
}

interface NewDocument {
  file: File;
  type: string;
  id: string;
}

interface DocumentToDelete {
  id: string;
  file_path: string;
}

export function EditSubmissionModal({
  isOpen,
  record,
  documents,
  onClose,
  onSaveDraft,
  onResubmit,
  profile,
}: EditSubmissionModalProps) {
  const [formData, setFormData] = useState<EditFormData>({
    title: '',
    category: 'patent',
    abstract: '',
    description: '',
    technicalField: '',
    backgroundArt: '',
    problemStatement: '',
    solution: '',
    advantages: '',
    implementation: '',
    inventors: [{ name: '', affiliation: '', contribution: '' }],
    dateConceived: '',
    dateReduced: '',
    priorArt: '',
    keywords: [{ id: '1', value: '' }],
    funding: '',
    collaborators: [{ id: '1', name: '', role: '', affiliation: '' }],
    commercialPotential: '',
    targetMarket: '',
    competitiveAdvantage: '',
    estimatedValue: '',
    relatedPublications: '',
    supervisorId: '',
  });

  const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
  const [newDocuments, setNewDocuments] = useState<NewDocument[]>([]);
  const [documentsToDelete, setDocumentsToDelete] = useState<DocumentToDelete[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (isOpen && record) {
      initializeForm();
      fetchDepartmentsAndSupervisors();
    }
  }, [isOpen, record]);

  const initializeForm = () => {
    if (!record) return;

    const details = (record.details || {}) as any;

    setFormData({
      title: record.title,
      category: record.category,
      abstract: record.abstract || '',
      description: details.description || '',
      technicalField: details.technicalField || '',
      backgroundArt: details.backgroundArt || '',
      problemStatement: details.problemStatement || '',
      solution: details.solution || '',
      advantages: details.advantages || '',
      implementation: details.implementation || '',
      inventors: Array.isArray(details.inventors) && details.inventors.length > 0
        ? details.inventors
        : [{ name: '', affiliation: '', contribution: '' }],
      dateConceived: details.dateConceived || '',
      dateReduced: details.dateReduced || '',
      priorArt: details.priorArt || '',
      keywords: Array.isArray(details.keywords)
        ? details.keywords.map((k: string, i: number) => ({ id: `${i}`, value: k }))
        : [{ id: '1', value: '' }],
      funding: details.funding || '',
      collaborators: Array.isArray(details.collaborators) && details.collaborators.length > 0
        ? details.collaborators.map((c: any, i: number) => ({ ...c, id: c.id || `${i}` }))
        : [{ id: '1', name: '', role: '', affiliation: '' }],
      commercialPotential: details.commercialPotential || '',
      targetMarket: details.targetMarket || '',
      competitiveAdvantage: details.competitiveAdvantage || '',
      estimatedValue: details.estimatedValue || '',
      relatedPublications: details.relatedPublications || '',
      supervisorId: record.supervisor_id || '',
    });

    setExistingDocuments(documents);
    setNewDocuments([]);
    setDocumentsToDelete([]);
    setLoading(false);
  };

  const fetchDepartmentsAndSupervisors = async () => {
    try {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (deptData) {
        setDepartments(deptData);
      }

      const { data: supData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'supervisor')
        .order('full_name');

      if (supData) {
        setSupervisors(supData);
      }
    } catch (err) {
      console.error('Error fetching departments/supervisors:', err);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addInventor = () => {
    setFormData(prev => ({
      ...prev,
      inventors: [...prev.inventors, { name: '', affiliation: '', contribution: '' }],
    }));
  };

  const removeInventor = (index: number) => {
    if (formData.inventors.length > 1) {
      setFormData(prev => ({
        ...prev,
        inventors: prev.inventors.filter((_, i) => i !== index),
      }));
    }
  };

  const updateInventor = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      inventors: prev.inventors.map((inv, i) =>
        i === index ? { ...inv, [field]: value } : inv
      ),
    }));
  };

  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      keywords: [...prev.keywords, { id: Date.now().toString(), value: '' }],
    }));
  };

  const removeKeyword = (id: string) => {
    if (formData.keywords.length > 1) {
      setFormData(prev => ({
        ...prev,
        keywords: prev.keywords.filter(k => k.id !== id),
      }));
    }
  };

  const updateKeyword = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.map(k => (k.id === id ? { ...k, value } : k)),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const newDocs = files.map(file => ({
      file,
      type: 'attachment',
      id: Date.now().toString() + Math.random(),
    }));

    setNewDocuments(prev => [...prev, ...newDocs]);
    e.target.value = ''; // Reset input
  };

  const removeNewDocument = (id: string) => {
    setNewDocuments(prev => prev.filter(d => d.id !== id));
  };

  const markDocumentForDeletion = (doc: Document) => {
    setExistingDocuments(prev => prev.filter(d => d.id !== doc.id));
    setDocumentsToDelete(prev => [...prev, { id: doc.id, file_path: doc.file_path }]);
  };

  const restoreDocument = (docId: string) => {
    const restored = documentsToDelete.find(d => d.id === docId);
    if (restored) {
      const originalDoc = documents.find(d => d.id === docId);
      if (originalDoc) {
        setExistingDocuments(prev => [...prev, originalDoc]);
        setDocumentsToDelete(prev => prev.filter(d => d.id !== docId));
      }
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.title.trim()) {
      errors.push('Title is required');
    }

    if (!formData.abstract.trim()) {
      errors.push('Abstract is required');
    }

    const validInventors = formData.inventors.filter(inv => inv.name.trim());
    if (validInventors.length === 0) {
      errors.push('At least one inventor is required');
    }

    if (newDocuments.length === 0 && existingDocuments.length === 0) {
      errors.push('At least one document must be attached');
    }

    // Validate new files
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const ALLOWED_TYPES = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Images
      'image/jpeg',
      'image/png',
      // Audio Files
      'audio/mpeg',
      'audio/mp4',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/flac',
      'audio/webm',
      'audio/x-m4a',
      // Video Files
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/mpeg',
      'video/ogg',
      // Special Formats
      'application/x-pkz',
      'application/octet-stream', // For .pkz and other binary files
    ];

    for (const doc of newDocuments) {
      if (doc.file.size > MAX_FILE_SIZE) {
        errors.push(`File "${doc.file.name}" exceeds 10MB limit`);
      }
      if (!ALLOWED_TYPES.includes(doc.file.type)) {
        errors.push(`File type "${doc.file.type}" is not allowed for "${doc.file.name}"`);
      }
    }

    return errors;
  };

  const handleSaveDraft = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Prepare data with proper file handling
      const dataToSend = {
        ...formData,
        newDocuments,
        documentsToDelete,
      };

      await onSaveDraft(dataToSend);
      // Note: actual upload happens in parent component
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleResubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dataToSend = {
        ...formData,
        newDocuments,
        documentsToDelete,
      };

      console.log('[EditModal.handleResubmit] Sending data:', dataToSend);
      console.log('[EditModal.handleResubmit] documentsToDelete:', documentsToDelete);
      console.log('[EditModal.handleResubmit] documentsToDelete.length:', documentsToDelete.length);

      await onResubmit(dataToSend);
      // Modal will close in parent component
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit');
    } finally {
      setSubmitting(false);
    }
  };

  const getDepartmentName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || deptId;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full my-8 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Edit Submission</h2>
            <p className="text-blue-100 text-sm mt-1">Update your submission before resubmitting</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving || submitting}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Validation Error</h3>
                <p className="text-red-800 text-sm whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter submission title"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="patent">Patent</option>
              <option value="copyright">Copyright</option>
              <option value="trademark">Trademark</option>
              <option value="design">Industrial Design</option>
              <option value="utility_model">Utility Model</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Abstract *
            </label>
            <textarea
              value={formData.abstract}
              onChange={(e) => handleInputChange('abstract', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter abstract"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter detailed description"
            />
          </div>

          {/* Technical Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Technical Field
            </label>
            <textarea
              value={formData.technicalField}
              onChange={(e) => handleInputChange('technicalField', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Technical field of the invention"
            />
          </div>

          {/* Background Art */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Background Art
            </label>
            <textarea
              value={formData.backgroundArt}
              onChange={(e) => handleInputChange('backgroundArt', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Background and prior art"
            />
          </div>

          {/* Problem Statement */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Problem Statement
            </label>
            <textarea
              value={formData.problemStatement}
              onChange={(e) => handleInputChange('problemStatement', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Problem being solved"
            />
          </div>

          {/* Solution */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Solution
            </label>
            <textarea
              value={formData.solution}
              onChange={(e) => handleInputChange('solution', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Proposed solution"
            />
          </div>

          {/* Prior Art */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Prior Art
            </label>
            <textarea
              value={formData.priorArt}
              onChange={(e) => handleInputChange('priorArt', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Prior art references"
            />
          </div>

          {/* Funding */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Funding
            </label>
            <input
              type="text"
              value={formData.funding}
              onChange={(e) => handleInputChange('funding', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Source of funding"
            />
          </div>

          {/* Inventors */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Inventors & Contributors *
            </h3>
            <div className="space-y-4">
              {formData.inventors.map((inventor, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={inventor.name}
                        onChange={(e) => updateInventor(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Inventor name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department/Affiliation
                      </label>
                      <select
                        value={inventor.affiliation}
                        onChange={(e) => updateInventor(index, 'affiliation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contribution
                      </label>
                      <input
                        type="text"
                        value={inventor.contribution}
                        onChange={(e) => updateInventor(index, 'contribution', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Main inventor, Co-inventor"
                      />
                    </div>
                  </div>
                  {formData.inventors.length > 1 && (
                    <button
                      onClick={() => removeInventor(index)}
                      className="mt-3 flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addInventor}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 border border-blue-300 rounded-lg font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Inventor
              </button>
            </div>
          </div>

          {/* Keywords */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Keywords</h3>
            <div className="space-y-3">
              {formData.keywords.map(keyword => (
                <div key={keyword.id} className="flex gap-2">
                  <input
                    type="text"
                    value={keyword.value}
                    onChange={(e) => updateKeyword(keyword.id, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter a keyword"
                  />
                  {formData.keywords.length > 1 && (
                    <button
                      onClick={() => removeKeyword(keyword.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addKeyword}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 border border-blue-300 rounded-lg font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Keyword
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Documents (Minimum 1 required) *
            </h3>

            {/* Existing Documents */}
            {existingDocuments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Documents</h4>
                <div className="space-y-2">
                  {existingDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-xs text-gray-600">
                          {formatFileSize(doc.size_bytes || 0)}
                        </p>
                      </div>
                      <button
                        onClick={() => markDocumentForDeletion(doc)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Marked for Deletion */}
            {documentsToDelete.length > 0 && (
              <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-orange-900 mb-3">Documents to be Deleted</h4>
                <div className="space-y-2">
                  {documentsToDelete.map(doc => {
                    const original = documents.find(d => d.id === doc.id);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-white p-3 rounded border border-orange-200"
                      >
                        <p className="text-sm text-orange-900">{original?.file_name}</p>
                        <button
                          onClick={() => restoreDocument(doc.id)}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Restore
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Documents */}
            {newDocuments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">New Documents to Upload</h4>
                <div className="space-y-2">
                  {newDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{doc.file.name}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(doc.file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeNewDocument(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from upload"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Click to upload files
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFiles}
                />
              </label>
              <p className="text-xs text-gray-600 mt-2">or drag and drop</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving || submitting}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {saving && <Loader className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={handleResubmit}
            disabled={saving || submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {submitting && <Loader className="h-4 w-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Resubmit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
