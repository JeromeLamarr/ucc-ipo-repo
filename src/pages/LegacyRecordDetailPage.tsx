import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Archive, FileText, Download, RefreshCw, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type LegacyRecord = Database['public']['Tables']['legacy_ip_records']['Row'];

export function LegacyRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [record, setRecord] = useState<LegacyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const handleSendEmail = async (documentType: 'disclosure' | 'certificate') => {
    // Placeholder for email sending
    setError('Email sending not yet implemented');
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

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading record...</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{record.title}</h1>
                <p className="text-gray-600 mt-1">Legacy IP Record</p>
              </div>
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
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creator Name</label>
                <p className="text-gray-900">{record.details?.creator_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creator Email</label>
                <p className="text-gray-900">{record.details?.creator_email || 'N/A'}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Record ID</label>
                <p className="text-gray-900 font-mono text-sm">{record.id}</p>
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

          {/* Technical Details Section */}
          {(record.details?.technical_field || record.details?.prior_art || record.details?.problem || record.details?.solution || record.details?.advantages) && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Technical Details</h3>
              <div className="space-y-4">
                {record.details?.technical_field && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technical Field</label>
                    <p className="text-gray-600">{record.details.technical_field}</p>
                  </div>
                )}
                {record.details?.prior_art && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prior Art</label>
                    <p className="text-gray-600">{record.details.prior_art}</p>
                  </div>
                )}
                {record.details?.problem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Problem Statement</label>
                    <p className="text-gray-600">{record.details.problem}</p>
                  </div>
                )}
                {record.details?.solution && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
                    <p className="text-gray-600">{record.details.solution}</p>
                  </div>
                )}
                {record.details?.advantages && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advantages</label>
                    <p className="text-gray-600">{record.details.advantages}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keywords Section */}
          {record.details?.keywords && record.details.keywords.length > 0 && (
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {record.details.keywords.map((keyword: string, idx: number) => (
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
                      <button
                        onClick={() => handleSendEmail(doc.document_type)}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
                      >
                        <Mail className="w-4 h-4" />
                        Email
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

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => navigate('/dashboard/legacy-records')}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            ← Back to Legacy Records
          </button>
        </div>
      </div>
    </div>
  );
}
