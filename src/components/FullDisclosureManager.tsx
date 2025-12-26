import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Loader2, RefreshCw, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FullDisclosureManagerProps {
  recordId: string;
  recordTitle: string;
  recordCategory: string;
  recordStatus: string;
  referenceNumber: string;
  applicantName: string;
  applicantEmail: string;
}

interface FullDisclosure {
  id: string;
  pdf_url: string;
  file_path: string;
  file_size: number;
  generated_at: string;
  generated_by: string;
}

export function FullDisclosureManager({
  recordId,
  recordTitle,
  recordCategory,
  recordStatus,
  referenceNumber,
  applicantName,
  applicantEmail,
}: FullDisclosureManagerProps) {
  const { profile } = useAuth();
  const [disclosure, setDisclosure] = useState<FullDisclosure | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestDisclosure();
  }, [recordId]);

  const fetchLatestDisclosure = async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('full_disclosures')
        .select('*')
        .eq('ip_record_id', recordId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) {
        console.error('Error fetching disclosure:', err);
        setError('Failed to load disclosure');
        return;
      }

      setDisclosure(data);
    } catch (error) {
      console.error('Error fetching disclosure:', error);
      setError('Failed to load disclosure');
    }
  };

  const handleGenerateDisclosure = async () => {
    if (!profile) return;

    setGenerating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-full-disclosure`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      console.log('[FullDisclosureManager] Generating disclosure for record:', recordId);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          record_id: recordId,
          user_id: profile.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Disclosure generation error:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log('[FullDisclosureManager] Disclosure generated successfully:', result);

      // Notify applicant
      const { data: recordData } = await supabase
        .from('ip_records')
        .select('applicant_id')
        .eq('id', recordId)
        .single();

      if (recordData?.applicant_id) {
        await supabase.from('notifications').insert({
          user_id: recordData.applicant_id,
          type: 'disclosure_ready',
          title: 'Full Disclosure Generated',
          message: `Your full disclosure statement for "${recordTitle}" has been generated and is ready for download!`,
          payload: { ip_record_id: recordId },
        });
      }

      alert('✅ Full disclosure generated successfully!');
      await fetchLatestDisclosure();
    } catch (error: any) {
      console.error('Error generating disclosure:', error);
      const errorMsg = error.message || 'Please try again.';
      setError(`Failed to generate disclosure: ${errorMsg}`);
      alert(`Failed to generate disclosure: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateDisclosure = async () => {
    if (!window.confirm('Are you sure you want to regenerate this disclosure? This will create a new PDF and replace the current one.')) {
      return;
    }
    
    await handleGenerateDisclosure();
  };

  const handleDownloadDisclosure = async () => {
    try {
      if (!disclosure?.pdf_url) {
        alert('Disclosure file is not available yet. Please try again later.');
        return;
      }

      const link = document.createElement('a');
      link.href = disclosure.pdf_url;
      link.download = `Full_Disclosure_${referenceNumber}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading disclosure:', error);
      alert('Failed to download disclosure. Please try again.');
    }
  };

  const handleSendDisclosureEmail = async () => {
    if (!disclosure) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const disclosureUrl = disclosure.pdf_url;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: applicantEmail,
          title: 'Full Disclosure Statement Ready',
          message: `Your full disclosure statement for "${recordTitle}" has been generated and is ready for review. Please download it from your submission dashboard.`,
          submissionTitle: recordTitle,
          submissionCategory: recordCategory,
          disclosureUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Email sending error:', errorText);
        throw new Error(errorText);
      }

      alert('✅ Full disclosure email sent successfully to the applicant!');
    } catch (error: any) {
      console.error('Error sending disclosure email:', error);
      alert('⚠️ Could not send email. The applicant can download the disclosure from their dashboard.');
    } finally {
      setSending(false);
    }
  };

  // Show message if status doesn't allow disclosure generation
  if (recordStatus !== 'ready_for_filing' && recordStatus !== 'completed') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <FileText className="h-6 w-6" />
          <div>
            <p className="font-medium">Full Disclosure Not Available</p>
            <p className="text-sm mt-1">Disclosure will be available after the submission is completed</p>
          </div>
        </div>
      </div>
    );
  }

  // Applicant view with disclosure
  if (profile?.role === 'applicant' && disclosure) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Full Disclosure Available</h3>
              <p className="text-sm text-gray-600 mt-1">
                Generated: {new Date(disclosure.generated_at).toLocaleString()}
              </p>
              {disclosure.file_size && (
                <p className="text-sm text-gray-600">
                  File Size: {(disclosure.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDownloadDisclosure}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    );
  }

  // Admin view with generation options
  if (profile?.role === 'admin' || profile?.role === 'supervisor') {
    if (disclosure) {
      return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Full Disclosure Generated</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generated: {new Date(disclosure.generated_at).toLocaleString()}
                </p>
                {disclosure.file_size && (
                  <p className="text-sm text-gray-600">
                    File Size: {(disclosure.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDownloadDisclosure}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleRegenerateDisclosure}
              disabled={generating}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {generating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              onClick={handleSendDisclosureEmail}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {sending ? 'Sending...' : 'Email to Applicant'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      );
    }

    // No disclosure yet - show generation button
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Full Disclosure</h3>
              <p className="text-sm text-gray-600 mt-1">Generate a full disclosure statement for this submission</p>
            </div>
          </div>
          <button
            onClick={handleGenerateDisclosure}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {generating ? 'Generating...' : 'Generate Disclosure'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Viewer role
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 text-gray-500">
        <FileText className="h-6 w-6" />
        <div>
          <p className="font-medium">Full Disclosure</p>
          <p className="text-sm mt-1">
            {disclosure
              ? 'Full disclosure statement available'
              : 'No disclosure statement generated yet'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
