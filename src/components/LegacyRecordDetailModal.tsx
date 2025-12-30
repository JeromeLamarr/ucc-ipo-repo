import { useState } from 'react';
import { X, FileText, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LegacyRecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
}

export function LegacyRecordDetailModal({ isOpen, onClose, record }: LegacyRecordDetailModalProps) {
  const { user } = useAuth();
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [generatingDisclosure, setGeneratingDisclosure] = useState(false);

  if (!isOpen || !record) return null;

  const handleGenerateCertificate = async () => {
    if (!user) return;

    setGeneratingCertificate(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Use the dedicated legacy certificate function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-certificate-legacy`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          record_id: record.id,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Certificate generation error:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();

      if (result.success) {
        if (result.pdf_data) {
          // Download the PDF
          const binaryString = atob(result.pdf_data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Certificate-${result.certificateNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        alert(`✅ Certificate generated and downloaded successfully!\n\nTracking ID: ${result.certificateNumber}`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      alert(`Failed to generate certificate: ${error.message || 'Please try again.'}`);
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleGenerateDisclosure = async () => {
    if (!user) return;

    setGeneratingDisclosure(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Use the dedicated legacy disclosure function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-disclosure-legacy`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recordId: record.id,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Disclosure generation error:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();

      if (result.success) {
        if (result.pdf_data) {
          // Download the PDF
          const binaryString = atob(result.pdf_data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Disclosure-${record.title}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        alert(`✅ Disclosure generated and downloaded successfully!`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error generating disclosure:', error);
      alert(`Failed to generate disclosure: ${error.message || 'Please try again.'}`);
    } finally {
      setGeneratingDisclosure(false);
    }
  };

  const inventors = record.details?.inventors || [];
  const remarks = record.details?.remarks || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-amber-500 text-xs font-bold rounded">🔖 LEGACY RECORD</span>
            </div>
            <h2 className="text-2xl font-bold mt-2">{record.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-amber-700 p-2 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* IP Information */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">IP Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Category</label>
                <p className="text-gray-900 font-medium capitalize">{record.category}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Source</label>
                <p className="text-gray-900 font-medium">{record.legacy_source}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Abstract</label>
                <p className="text-gray-900">{record.abstract || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Legacy Details */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legacy Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Original Filing Date</label>
                <p className="text-gray-900">{record.original_filing_date || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">IPOPHIL Application No.</label>
                <p className="text-gray-900">{record.ipophil_application_no || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Remarks</label>
                <p className="text-gray-900">{remarks || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Inventors */}
          {inventors.length > 0 && (
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventors / Authors</h3>
              <div className="space-y-3">
                {inventors.map((inventor: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium text-gray-900">{inventor.name}</p>
                    {inventor.affiliation && (
                      <p className="text-sm text-gray-600">Affiliation: {inventor.affiliation}</p>
                    )}
                    {inventor.contribution && (
                      <p className="text-sm text-gray-600">Contribution: {inventor.contribution}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Original Creator (if different from inventors list) */}
          {record.details?.creator_name && (
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Creator</h3>
              <p className="text-gray-900">{record.details.creator_name}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Created</label>
                <p className="text-gray-900">
                  {new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Digitized</label>
                <p className="text-gray-900">
                  {new Date(record.digitized_at).toLocaleDateString()} {new Date(record.digitized_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
            aria-label="Close detail view"
          >
            Close
          </button>
          <button
            onClick={handleGenerateDisclosure}
            disabled={generatingDisclosure}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
            aria-label="Generate disclosure document"
          >
            <FileText className="h-4 w-4" />
            {generatingDisclosure ? 'Generating...' : 'Generate Disclosure'}
          </button>
          <button
            onClick={handleGenerateCertificate}
            disabled={generatingCertificate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
            aria-label="Generate certificate document"
          >
            <Award className="h-4 w-4" />
            {generatingCertificate ? 'Generating...' : 'Generate Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
}
