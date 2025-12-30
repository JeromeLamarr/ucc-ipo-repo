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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Function error:', response.error);
        throw new Error(response.error.message || 'Failed to generate disclosure');
      }

      setSuccess('Disclosure generated successfully!');
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    } catch (err) {
      console.error('Disclosure generation error:', err);
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate certificate');
      }

      setSuccess('Certificate generated successfully!');
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
    } catch (err) {
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
                <p className="text-gray-900">{new Date(record.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <p className="text-gray-900">{record.details?.legacy_source || 'N/A'}</p>
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

          {record.details?.remarks && (
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Remarks</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{record.details.remarks}</p>
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
                <div className="flex gap-2">
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
                </div>
              </div>

              {/* Certificate Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">IP Certificate</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a professional certificate of IP registration.
                </p>
                <div className="flex gap-2">
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
