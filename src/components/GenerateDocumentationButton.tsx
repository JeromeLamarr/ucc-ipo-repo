import React, { useState } from 'react';
import { FileText, Loader } from 'lucide-react';
import { fetchFullRecordDocumentation } from '../utils/fetchFullRecordDocumentation';
import { FullRecordDocumentationModal } from './FullRecordDocumentationModal';

interface GenerateDocumentationButtonProps {
  recordId: string;
  adminEmail?: string;
}

export function GenerateDocumentationButton({
  recordId,
  adminEmail,
}: GenerateDocumentationButtonProps) {
  const [open, setOpen] = useState(false);
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFullRecordDocumentation(recordId);
      setDocData(data);
      setOpen(true);
    } catch (err: any) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch record documentation. Please try again.'
      );
      console.error('Error fetching documentation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Generate full record documentation"
      >
        {loading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Generate Documentation
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {open && docData && (
        <FullRecordDocumentationModal
          isOpen={open}
          onClose={() => setOpen(false)}
          record={docData}
          adminEmail={adminEmail}
        />
      )}
    </>
  );
}
