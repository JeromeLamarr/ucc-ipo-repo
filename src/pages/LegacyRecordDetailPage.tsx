import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Archive, FileText, Download, RefreshCw, AlertCircle, CheckCircle, Trash2, Pencil, ArrowLeft } from 'lucide-react';
import type { Database } from '../lib/database.types';

type LegacyRecord = Database['public']['Tables']['legacy_ip_records']['Row'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

const CATEGORIES: IpCategory[] = ['patent', 'trademark', 'copyright', 'trade_secret', 'software', 'design', 'other'];
const SOURCES = ['old_system', 'physical_archive', 'email', 'manual_entry', 'other'];

export function LegacyRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [record, setRecord] = useState<LegacyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'patent' as IpCategory,
    abstract: '',
    keywords: '',
    technical_field: '',
    prior_art: '',
    problem: '',
    solution: '',
    advantages: '',
    original_filing_date: '',
    ipophil_application_no: '',
    legacy_source: 'old_system',
    remarks: '',
    creator_name: '',
    creator_email: '',
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.role === 'admin' && id) {
      fetchRecord();
      fetchDocuments();
      fetchUploadedFiles();
    }
  }, [profile, id]);

  const fetchRecord = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('legacy_ip_records')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch record');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('legacy_record_documents')
        .select('*')
        .eq('record_id', id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      // List files in the storage bucket for this record
      const { data, error } = await supabase.storage
        .from('documents')
        .list(`legacy-records/${id}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (err) {
      console.error('Failed to fetch uploaded files:', err);
    }
  };

  const handleGenerateDisclosure = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get the current session to ensure auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to generate documents');
      }

      const response = await supabase.functions.invoke('generate-disclosure-legacy', {
        body: { record_id: id },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('[Disclosure] Response:', response);

      if (response.error) {
        console.error('[Disclosure] Function error:', response.error);
        throw new Error(response.error.message || 'Failed to generate disclosure');
      }

      const data = response.data as any;
      console.log('[Disclosure] Data received:', data);

      // Auto-download the PDF if available
      if (data?.pdf_data) {
        try {
          console.log('[Disclosure] Attempting auto-download...');
          const binaryString = atob(data.pdf_data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Disclosure-${record?.title || 'document'}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log('[Disclosure] Auto-download completed');
        } catch (downloadErr) {
          console.warn('[Disclosure] Auto-download failed:', downloadErr);
          // Continue to show success message even if download fails
        }
      } else {
        console.warn('[Disclosure] No pdf_data in response');
      }

      // The edge function already saves the record to the database
      // No need to save again from the frontend

      setSuccess('Disclosure generated successfully!');
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    } catch (err) {
      console.error('[Disclosure] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate disclosure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!profile?.id) {
        throw new Error('User ID not found');
      }

      // Get the current session to ensure auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to generate documents');
      }

      const response = await supabase.functions.invoke('generate-certificate-legacy', {
        body: { record_id: id, user_id: profile.id },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('[Certificate] Response:', response);

      if (response.error) {
        console.error('[Certificate] Function error:', response.error);
        throw new Error(response.error.message || 'Failed to generate certificate');
      }

      const data = response.data as any;
      console.log('[Certificate] Data received:', data);

      // Auto-download the PDF if available
      if (data?.pdf_data) {
        try {
          console.log('[Certificate] Attempting auto-download...');
          const binaryString = atob(data.pdf_data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Certificate-${data.certificateNumber || 'certificate'}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log('[Certificate] Auto-download completed');
        } catch (downloadErr) {
          console.warn('[Certificate] Auto-download failed:', downloadErr);
          // Continue to show success message even if download fails
        }
      } else {
        console.warn('[Certificate] No pdf_data in response');
      }

      // The edge function already saves the record to the database
      // No need to save again from the frontend

      setSuccess('Certificate generated successfully!');
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    } catch (err) {
      console.error('[Certificate] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    try {
      if (doc.pdf_data) {
        // Base64 download
        const binaryString = atob(doc.pdf_data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = doc.file_name || 'document.pdf';
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else if (doc.file_path) {
        // Storage download
        const { data, error } = await supabase.storage
          .from('legacy-generated-documents')
          .download(doc.file_path);

        if (error) throw error;

        const url = window.URL.createObjectURL(data);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = doc.file_name || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const handleDownloadUploadedFile = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(`legacy-records/${id}/${file.name}`);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = file.name;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      setSuccess(`Downloaded ${file.name}`);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleDeleteRecord = async () => {
    setDeleteLoading(true);
    try {
      const { error: archiveError } = await supabase
        .from('legacy_ip_records')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by_admin_id: profile?.id ?? null,
        })
        .eq('id', id);
      if (archiveError) throw archiveError;
      navigate('/dashboard/legacy-records');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive record.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleStartEdit = () => {
    if (!record) return;
    setEditForm({
      title: record.title,
      category: record.category as IpCategory,
      abstract: record.abstract || '',
      keywords: Array.isArray(record.details?.keywords)
        ? (record.details.keywords as string[]).join(', ')
        : '',
      technical_field: (record.details?.technical_field as string) || '',
      prior_art: (record.details?.prior_art as string) || '',
      problem: (record.details?.problem as string) || '',
      solution: (record.details?.solution as string) || '',
      advantages: (record.details?.advantages as string) || '',
      original_filing_date: record.original_filing_date || '',
      ipophil_application_no: record.ipophil_application_no || '',
      legacy_source: record.legacy_source,
      remarks: record.remarks || '',
      creator_name: (record.details?.creator_name as string) || '',
      creator_email: (record.details?.creator_email as string) || '',
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: updateError } = await supabase
        .from('legacy_ip_records')
        .update({
          title: editForm.title,
          category: editForm.category,
          abstract: editForm.abstract || null,
          legacy_source: editForm.legacy_source,
          original_filing_date: editForm.original_filing_date || null,
          ipophil_application_no: editForm.ipophil_application_no || null,
          remarks: editForm.remarks || null,
          updated_by_admin_id: user.id,
          details: {
            ...(record?.details as object ?? {}),
            creator_name: editForm.creator_name,
            creator_email: editForm.creator_email,
            description: editForm.abstract,
            keywords: editForm.keywords.split(',').map((k) => k.trim()).filter((k) => k),
            technical_field: editForm.technical_field,
            prior_art: editForm.prior_art,
            problem: editForm.problem,
            solution: editForm.solution,
            advantages: editForm.advantages,
            remarks: editForm.remarks,
          },
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchRecord();
      setIsEditing(false);
      setSuccess('Record updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" role="status" aria-label="Loading record" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">Record not found</p>
            <button
              onClick={() => navigate('/dashboard/legacy-records')}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              Back to Legacy Records
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-3">
            <Link
              to="/dashboard/legacy-records"
              className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Legacy Records
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="w-8 h-8 text-amber-600" aria-hidden="true" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{record.title}</h1>
                <p className="text-gray-600 mt-1">Legacy IP Record</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  aria-label="Edit this record"
                  className="flex items-center gap-2 px-4 py-2 border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                  Edit Record
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Delete this record"
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Delete Record
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {/* Record Details */}
        <div className="bg-white rounded-lg shadow mb-6">
          {!isEditing ? (
            /* ─── VIEW MODE ─── */
            <div>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Creator Name</label>
                    <p className="text-gray-900">{record.details?.creator_name as string || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Creator Email</label>
                    <p className="text-gray-900">{record.details?.creator_email as string || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <p className="text-gray-900 capitalize">{record.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                    <p className="text-gray-900">{record.original_filing_date || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <p className="text-gray-900">{record.legacy_source || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IPOPHIL Application No.</label>
                    <p className="text-gray-900">{record.ipophil_application_no || '—'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Record ID</label>
                    <p className="text-gray-900 font-mono text-sm">{record.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Digitized At</label>
                    <p className="text-gray-900">{new Date(record.digitized_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {record.abstract && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Abstract</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{record.abstract}</p>
                </div>
              )}

              {record.remarks && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Remarks</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{record.remarks}</p>
                </div>
              )}

              {(record.details?.technical_field || record.details?.prior_art || record.details?.problem || record.details?.solution || record.details?.advantages) && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Technical Details</h3>
                  <div className="space-y-4">
                    {record.details?.technical_field && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Technical Field</label>
                        <p className="text-gray-600">{record.details.technical_field as string}</p>
                      </div>
                    )}
                    {record.details?.prior_art && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prior Art</label>
                        <p className="text-gray-600">{record.details.prior_art as string}</p>
                      </div>
                    )}
                    {record.details?.problem && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Problem Statement</label>
                        <p className="text-gray-600">{record.details.problem as string}</p>
                      </div>
                    )}
                    {record.details?.solution && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
                        <p className="text-gray-600">{record.details.solution as string}</p>
                      </div>
                    )}
                    {record.details?.advantages && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Advantages</label>
                        <p className="text-gray-600">{record.details.advantages as string}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {record.details?.keywords && (record.details.keywords as string[]).length > 0 && (
                <div className="p-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {(record.details.keywords as string[]).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ─── EDIT MODE ─── */
            <form onSubmit={handleSaveEdit} className="p-6 space-y-8" aria-label="Edit legacy record form">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Edit Record</h2>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
              </div>

              {/* Creator */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Creator / Inventor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-creator-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Creator Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-creator-name"
                      type="text"
                      name="creator_name"
                      value={editForm.creator_name}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-creator-email" className="block text-sm font-medium text-gray-700 mb-1">Creator Email</label>
                    <input
                      id="edit-creator-email"
                      type="email"
                      name="creator_email"
                      value={editForm.creator_email}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* IP Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">IP Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="edit-title"
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleEditInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="edit-category"
                        name="category"
                        value={editForm.category}
                        onChange={handleEditInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                      <input
                        id="edit-date"
                        type="date"
                        name="original_filing_date"
                        value={editForm.original_filing_date}
                        onChange={handleEditInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-abstract" className="block text-sm font-medium text-gray-700 mb-1">Abstract / Description</label>
                    <textarea
                      id="edit-abstract"
                      name="abstract"
                      value={editForm.abstract}
                      onChange={handleEditInputChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-keywords" className="block text-sm font-medium text-gray-700 mb-1">Keywords (comma-separated)</label>
                    <input
                      id="edit-keywords"
                      type="text"
                      name="keywords"
                      value={editForm.keywords}
                      onChange={handleEditInputChange}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Technical Details</h3>
                <div className="space-y-4">
                  {[
                    { id: 'edit-technical-field', name: 'technical_field', label: 'Technical Field' },
                    { id: 'edit-prior-art', name: 'prior_art', label: 'Prior Art' },
                    { id: 'edit-problem', name: 'problem', label: 'Problem Statement' },
                    { id: 'edit-solution', name: 'solution', label: 'Solution' },
                    { id: 'edit-advantages', name: 'advantages', label: 'Advantages' },
                  ].map(({ id, name, label }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <textarea
                        id={id}
                        name={name}
                        value={editForm[name as keyof typeof editForm]}
                        onChange={handleEditInputChange}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Legacy Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Legacy Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-source" className="block text-sm font-medium text-gray-700 mb-1">Source of Record</label>
                    <select
                      id="edit-source"
                      name="legacy_source"
                      value={editForm.legacy_source}
                      onChange={handleEditInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {SOURCES.map((src) => (
                        <option key={src} value={src}>{src.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-ipophil" className="block text-sm font-medium text-gray-700 mb-1">IPOPHIL Application No.</label>
                    <input
                      id="edit-ipophil"
                      type="text"
                      name="ipophil_application_no"
                      value={editForm.ipophil_application_no}
                      onChange={handleEditInputChange}
                      placeholder="e.g. 4-2010-012345"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="edit-remarks" className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
                  <textarea
                    id="edit-remarks"
                    name="remarks"
                    value={editForm.remarks}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {saveLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-hidden="true" />
                  ) : (
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  )}
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saveLoading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Document Generation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Documents</h2>
            <div className="space-y-4">
              {/* Disclosure Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Full Disclosure</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a comprehensive disclosure document containing all IP details.
                </p>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={handleGenerateDisclosure}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors font-medium text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Disclosure
                  </button>
                  <button
                    onClick={handleGenerateDisclosure}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 border border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => {
                      const disclosureDoc = documents.find(d => d.document_type === 'disclosure');
                      if (disclosureDoc) {
                        handleDownloadDocument(disclosureDoc);
                      } else {
                        setSuccess('Please generate the disclosure first.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
                    title={documents.some(d => d.document_type === 'disclosure') ? 'Download generated disclosure' : 'Generate disclosure first'}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Certificate Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">IP Certificate</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a professional certificate of IP registration.
                </p>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={handleGenerateCertificate}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors font-medium text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Certificate
                  </button>
                  <button
                    onClick={handleGenerateCertificate}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 border border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => {
                      const certificateDoc = documents.find(d => d.document_type === 'certificate');
                      if (certificateDoc) {
                        handleDownloadDocument(certificateDoc);
                      } else {
                        setSuccess('Please generate the certificate first.');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium text-sm"
                    title={documents.some(d => d.document_type === 'certificate') ? 'Download generated certificate' : 'Generate certificate first'}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Documents */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Documents</h2>
            {documents.length === 0 ? (
              <p className="text-gray-600">No documents generated yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-sm text-gray-600">
                          {doc.document_type} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h2>
            {uploadedFiles.length === 0 ? (
              <p className="text-gray-600">No files uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          {(file.metadata?.size ? (file.metadata.size / 1024).toFixed(2) : '0')} KB • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadUploadedFile(file)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4 w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Legacy Record</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete{' '}
              <strong>&ldquo;{record.title}&rdquo;</strong>?{' '}
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
