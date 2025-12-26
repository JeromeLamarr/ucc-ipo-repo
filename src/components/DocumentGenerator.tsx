import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [regenerating, setRegenerating] = useState(false);
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
      console.log('Generating Full Documentation...');
      
      // First, fetch the latest documents to ensure we have current state
      const { data: latestDocs } = await supabase
        .from('submission_documents')
        .select('*')
        .eq('ip_record_id', recordId);

      // Delete old document if exists
      const existingDoc = latestDocs?.find(d => d.document_type === 'full_documentation');
      if (existingDoc?.generated_file_path) {
        try {
          console.log(`Deleting old Full Documentation from storage: ${existingDoc.generated_file_path}`);
          await supabase.storage
            .from('generated-documents')
            .remove([existingDoc.generated_file_path]);
          console.log('Old Full Documentation deleted from storage');
        } catch (e) {
          console.error('Storage deletion error:', e);
        }
        
        try {
          console.log(`Deleting old Full Documentation record from database: ${existingDoc.id}`);
          const { error: deleteError } = await supabase
            .from('submission_documents')
            .delete()
            .eq('id', existingDoc.id);
          if (deleteError) throw deleteError;
          console.log('Old Full Documentation record deleted');
        } catch (e) {
          console.error('Database deletion error:', e);
        }
      }

      // Call edge function to generate PDF
      console.log('Calling generate-documentation edge function...');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate documentation');
      }

      const result = await response.json();
      console.log('Full Documentation generated successfully:', result);

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

      console.log('Full Documentation record saved to database');
      await fetchDocuments();
    } catch (err: any) {
      console.error('Full Documentation generation error:', err);
      setError(err.message);
    } finally {
      setGeneratingDoc(false);
    }
  };

  const generateFullDisclosure = async () => {
    setGeneratingDisclosure(true);
    setError('');
    try {
      console.log('Generating Full Disclosure...');
      
      // First, fetch the latest documents to ensure we have current state
      const { data: latestDocs } = await supabase
        .from('submission_documents')
        .select('*')
        .eq('ip_record_id', recordId);

      // Delete old document if exists
      const existingDoc = latestDocs?.find(d => d.document_type === 'full_disclosure');
      if (existingDoc?.generated_file_path) {
        try {
          console.log(`Deleting old Full Disclosure from storage: ${existingDoc.generated_file_path}`);
          await supabase.storage
            .from('generated-documents')
            .remove([existingDoc.generated_file_path]);
          console.log('Old Full Disclosure deleted from storage');
        } catch (e) {
          console.error('Storage deletion error:', e);
        }
        
        try {
          console.log(`Deleting old Full Disclosure record from database: ${existingDoc.id}`);
          const { error: deleteError } = await supabase
            .from('submission_documents')
            .delete()
            .eq('id', existingDoc.id);
          if (deleteError) throw deleteError;
          console.log('Old Full Disclosure record deleted');
        } catch (e) {
          console.error('Database deletion error:', e);
        }
      }

      console.log('Calling generate-disclosure edge function...');
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate disclosure');
      }

      const result = await response.json();
      console.log('Full Disclosure generated successfully:', result);

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

      console.log('Full Disclosure record saved to database');
      await fetchDocuments();
    } catch (err: any) {
      console.error('Full Disclosure generation error:', err);
      setError(err.message);
    } finally {
      setGeneratingDisclosure(false);
    }
  };

  const regenerateAllDocuments = async () => {
    setRegenerating(true);
    setError('');
    try {
      console.log('Starting regeneration of all documents...');
      
      // Fetch current documents to delete
      const { data: latestDocs } = await supabase
        .from('submission_documents')
        .select('*')
        .eq('ip_record_id', recordId);

      // Delete both old documents from storage and database
      for (const doc of (latestDocs || [])) {
        if (doc.generated_file_path) {
          try {
            console.log(`Deleting old document from storage: ${doc.generated_file_path}`);
            await supabase.storage
              .from('generated-documents')
              .remove([doc.generated_file_path]);
          } catch (e) {
            console.warn('Storage deletion warning:', e);
          }
        }

        try {
          console.log(`Deleting old document record from database: ${doc.id}`);
          const { error: deleteError } = await supabase
            .from('submission_documents')
            .delete()
            .eq('id', doc.id);
          if (deleteError) throw deleteError;
        } catch (e) {
          console.warn('Database deletion warning:', e);
        }
      }

      console.log('Old documents deleted. Starting generation of Full Documentation...');
      
      // Generate Full Documentation
      const docResponse = await fetch(
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

      if (!docResponse.ok) {
        throw new Error('Failed to generate Full Documentation');
      }

      const docResult = await docResponse.json();
      console.log('Full Documentation generated successfully');

      // Save Full Documentation record
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error: docSaveError } = await (supabase
        .from('submission_documents') as any)
        .insert([{
          ip_record_id: recordId,
          document_type: 'full_documentation',
          status: 'completed',
          generated_file_path: docResult.filePath,
          generated_at: new Date().toISOString(),
          completed_by: userId || null,
          completed_at: new Date().toISOString(),
        }]);

      if (docSaveError) throw docSaveError;

      // Wait 1 second between generations
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Starting generation of Full Disclosure...');

      // Generate Full Disclosure
      const discResponse = await fetch(
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

      if (!discResponse.ok) {
        throw new Error('Failed to generate Full Disclosure');
      }

      const discResult = await discResponse.json();
      console.log('Full Disclosure generated successfully');

      // Save Full Disclosure record
      const { error: discSaveError } = await (supabase
        .from('submission_documents') as any)
        .insert([{
          ip_record_id: recordId,
          document_type: 'full_disclosure',
          status: 'completed',
          generated_file_path: discResult.filePath,
          generated_at: new Date().toISOString(),
          completed_by: userId || null,
          completed_at: new Date().toISOString(),
        }]);

      if (discSaveError) throw discSaveError;

      console.log('All documents regenerated successfully');
      await fetchDocuments();
    } catch (err: any) {
      console.error('Regeneration error:', err);
      setError(err.message || 'Failed to regenerate documents');
    } finally {
      setRegenerating(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={generateFullDocumentation}
              disabled={generatingDoc || regenerating}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <FileText className="h-5 w-5" />
              {generatingDoc ? 'Generating...' : 'Generate Full Documentation'}
            </button>

            <button
              onClick={generateFullDisclosure}
              disabled={generatingDisclosure || regenerating}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <FileText className="h-5 w-5" />
              {generatingDisclosure ? 'Generating...' : 'Generate Full Disclosure'}
            </button>
          </div>

          {documents.length > 0 && (
            <button
              onClick={regenerateAllDocuments}
              disabled={regenerating || generatingDoc || generatingDisclosure}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating All Documents...' : 'Regenerate All Documents'}
            </button>
          )}
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
