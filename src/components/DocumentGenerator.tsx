import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
};

type SubmissionDocument = Database['public']['Tables']['submission_documents']['Row'];

interface DocumentGeneratorProps {
  recordId: string;
  record?: IpRecord;
  userRole?: 'applicant' | 'admin' | 'supervisor' | 'evaluator';
}

export function DocumentGenerator({ recordId }: DocumentGeneratorProps) {
  const [documents, setDocuments] = useState<SubmissionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [generatingDisclosure, setGeneratingDisclosure] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [recordId]);

  const fetchDocuments = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('submission_documents')
        .select('*')
        .eq('ip_record_id', recordId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateFullDocumentation = async () => {
    setGeneratingDoc(true);
    setError('');
    try {
      // First, fetch the latest documents to ensure we have current state
      const { data: latestDocs } = await supabase
        .from('submission_documents')
        .select('*')
        .eq('ip_record_id', recordId);

      // Delete old document if exists
      const existingDoc = latestDocs?.find(d => d.document_type === 'full_documentation');
      if (existingDoc?.generated_file_path) {
        try {
          await supabase.storage
            .from('generated-documents')
            .remove([existingDoc.generated_file_path]);
        } catch (e) {
          console.error('Storage deletion error:', e);
        }
        
        try {
          await supabase
            .from('submission_documents')
            .delete()
            .eq('id', existingDoc.id);
        } catch (e) {
          console.error('Database deletion error:', e);
        }
      }

      // Call edge function to generate PDF
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-documentation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            recordId,
            documentType: 'full_documentation',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate documentation');
      }

      const result = await response.json();

      // Save new document record
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error: saveError } = await (supabase
        .from('submission_documents') as any)
        .insert([{
          ip_record_id: recordId,
          document_type: 'full_documentation',
          status: 'completed',
          generated_file_path: result.filePath,
          generated_at: new Date().toISOString(),
          completed_by: userId || null,
          completed_at: new Date().toISOString(),
        }]);

      if (saveError) throw saveError;

      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingDoc(false);
    }
  };

  const generateFullDisclosure = async () => {
    setGeneratingDisclosure(true);
    setError('');
    try {
      // First, fetch the latest documents to ensure we have current state
      const { data: latestDocs } = await supabase
        .from('submission_documents')
        .select('*')
        .eq('ip_record_id', recordId);

      // Delete old document if exists
      const existingDoc = latestDocs?.find(d => d.document_type === 'full_disclosure');
      if (existingDoc?.generated_file_path) {
        try {
          await supabase.storage
            .from('generated-documents')
            .remove([existingDoc.generated_file_path]);
        } catch (e) {
          console.error('Storage deletion error:', e);
        }
        
        try {
          await supabase
            .from('submission_documents')
            .delete()
            .eq('id', existingDoc.id);
        } catch (e) {
          console.error('Database deletion error:', e);
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-disclosure`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            recordId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate disclosure');
      }

      const result = await response.json();

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error: saveError } = await (supabase
        .from('submission_documents') as any)
        .insert([{
          ip_record_id: recordId,
          document_type: 'full_disclosure',
          status: 'completed',
          generated_file_path: result.filePath,
          generated_at: new Date().toISOString(),
          completed_by: userId || null,
          completed_at: new Date().toISOString(),
        }]);

      if (saveError) throw saveError;

      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingDisclosure(false);
    }
  };

  const downloadDocument = async (filePath: string) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('generated-documents')
        .download(filePath);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'full_documentation':
        return '📄';
      case 'full_disclosure':
        return '📋';
      default:
        return '📎';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'draft':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Documentation</h3>
        <p className="text-gray-600 mb-4">Generate and download submission documentation</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={generateFullDocumentation}
            disabled={generatingDoc}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <FileText className="h-5 w-5" />
            {generatingDoc ? 'Generating...' : 'Generate Full Documentation'}
          </button>

          <button
            onClick={generateFullDisclosure}
            disabled={generatingDisclosure}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <FileText className="h-5 w-5" />
            {generatingDisclosure ? 'Generating...' : 'Generate Full Disclosure'}
          </button>
        </div>
      </div>

      {documents.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Generated Documents</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getDocumentIcon(doc.document_type)}</span>
                  <div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {doc.completed_at
                        ? new Date(doc.completed_at).toLocaleString()
                        : 'Not completed'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status)}
                  {doc.generated_file_path && (
                    <button
                      onClick={() => downloadDocument(doc.generated_file_path!)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
