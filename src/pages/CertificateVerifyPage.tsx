import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle, Loader, Lock } from 'lucide-react';
import { Footer } from '../components/Footer';
import { IPRecordSummaryCard, type IPRecordSummaryData } from '../components/IPRecordSummaryCard';
import { useBranding } from '../hooks/useBranding';

// Create a public Supabase client for certificate verification
// This uses the anon key to allow public access to verified data
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Certificate {
  id: string;
  certificate_number: string;
  pdf_url: string;
  created_at: string;
  ip_record_id: string;
}

interface IPRecord {
  id: string;
  title: string;
  abstract: string | null;
  category: string;
  status: string;
  created_at: string;
  reference_number: string;
  tracking_id: string | null;
  details: Record<string, unknown> | null;
}

interface Creator {
  full_name: string;
  email: string;
}

// Helper function to mask sensitive information
const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visibleChars = Math.max(1, Math.ceil(name.length / 3));
  const maskedName = name.substring(0, visibleChars) + '*'.repeat(Math.max(1, name.length - visibleChars));
  return `${maskedName}@${domain}`;
};

const maskName = (fullName: string): string => {
  const parts = fullName.split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0) + '*'.repeat(Math.max(1, parts[0].length - 1));
  }
  const firstName = parts[0].charAt(0) + '*'.repeat(Math.max(1, parts[0].length - 1));
  const lastName = parts[parts.length - 1];
  return `${firstName} ${lastName}`;
};

const CATEGORY_LABELS: Record<string, string> = {
  patent: 'Patent',
  utility_model: 'Utility Model',
  trademark: 'Trademark',
  design: 'Industrial Design',
  copyright: 'Copyright',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  ready_for_filing: 'Ready for Filing',
  evaluator_approved: 'Evaluator Approved',
};

export function CertificateVerifyPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const { primaryColor } = useBranding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [ipRecord, setIpRecord] = useState<IPRecord | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [isAuthentic, setIsAuthentic] = useState(false);

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        if (!trackingId) {
          setError('No tracking ID provided');
          setLoading(false);
          return;
        }

        // Fetch certificate by tracking ID
        const { data: certData, error: certError } = await supabase
          .from('certificates')
          .select('*')
          .eq('certificate_number', trackingId)
          .maybeSingle();

        if (!certError && certData) {
          // Found a certificate
          setCertificate(certData);

          // Fetch IP record
          const { data: ipData, error: ipError } = await supabase
            .from('ip_records')
            .select('*')
            .eq('id', certData.ip_record_id)
            .maybeSingle();

          if (ipError || !ipData) {
            setError('IP record not found');
            setLoading(false);
            return;
          }

          setIpRecord(ipData);

          // Fetch creator details
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', ipData.applicant_id)
            .maybeSingle();

          if (userError || !userData) {
            setError('Creator information not found');
            setLoading(false);
            return;
          }

          setCreator(userData);
          setIsAuthentic(true);
          setLoading(false);
          return;
        }

        // Certificate not found, check if it's a disclosure by IP record ID (legacy support)
        const { data: discData, error: discError } = await supabase
          .from('full_disclosures')
          .select('*')
          .eq('ip_record_id', trackingId)
          .maybeSingle();

        if (!discError && discData) {
          // Redirect to disclosure verify page
          window.location.href = `/verify-disclosure/${discData.tracking_id || trackingId}`;
          return;
        }

        // Legacy certificate fallback — trackingId format: LEGACY-YYYY-XXXXXXXX
        if (trackingId && trackingId.startsWith('LEGACY-')) {
          const parts = trackingId.split('-'); // ['LEGACY','YYYY','XXXXXXXX']
          const idPrefix = parts.slice(2).join('-').toLowerCase(); // first 8 hex chars of UUID
          const { data: legacyRecord } = await supabase
            .from('legacy_ip_records')
            .select('*')
            .ilike('id', `${idPrefix}%`)
            .maybeSingle();

          if (legacyRecord) {
            setCertificate({
              id: legacyRecord.id,
              certificate_number: trackingId,
              pdf_url: '',
              created_at: legacyRecord.created_at,
              ip_record_id: legacyRecord.id,
            });
            setIpRecord({
              id: legacyRecord.id,
              title: legacyRecord.title,
              abstract: legacyRecord.abstract || null,
              category: legacyRecord.category,
              status: 'legacy',
              created_at: legacyRecord.created_at,
              reference_number: trackingId,
              tracking_id: trackingId,
              details: legacyRecord.details,
            });
            setCreator({
              full_name: legacyRecord.details?.creator_name || 'Unknown',
              email: legacyRecord.details?.creator_email || 'legacy@archived',
            });
            setIsAuthentic(true);
            setLoading(false);
            return;
          }
        }

        setError('Certificate not found. This may be an invalid or forged certificate.');
        setLoading(false);
      } catch (err) {
        setError(`Verification error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    verifyCertificate();
  }, [trackingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Verifying Certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Verification Status */}
        <div className={`rounded-lg shadow-lg p-8 mb-6 ${
          isAuthentic 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
        }`}>
          <div className="flex items-center gap-4 mb-4">
            {isAuthentic ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-600" />
                <div>
                  <h1 className="text-3xl font-bold text-green-700">Certificate Verified</h1>
                  <p className="text-green-600">This is an authentic UCC IP certificate</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-red-600" />
                <div>
                  <h1 className="text-3xl font-bold text-red-700">Certificate Invalid</h1>
                  <p className="text-red-600">{error}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Certificate Details */}
        {isAuthentic && certificate && ipRecord && creator && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <h2 className="text-2xl font-bold mb-2">Certificate Details</h2>
              <p className="text-blue-100">Verification Reference: {certificate.certificate_number}</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* IP Record Information */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-semibold">1</span>
                  Intellectual Property Details
                </h3>
                {(() => {
                  const details = ipRecord.details ?? {};

                  const inventors: Array<{ name: string }> = Array.isArray(details.inventors)
                    ? (details.inventors as Array<Record<string, unknown>>)
                        .map((inv) => ({ name: typeof inv.name === 'string' ? inv.name.trim() : '' }))
                        .filter((inv) => inv.name !== '')
                    : [];

                  const collaborators: Array<{ name: string }> = Array.isArray(details.collaborators)
                    ? (details.collaborators as Array<Record<string, unknown>>)
                        .map((c) => ({ name: typeof c.name === 'string' ? c.name.trim() : '' }))
                        .filter((c) => c.name !== '')
                    : [];

                  const keywords: string[] = Array.isArray(details.keywords)
                    ? (details.keywords as unknown[]).filter((k): k is string => typeof k === 'string' && k.trim() !== '')
                    : [];

                  const summaryData: IPRecordSummaryData = {
                    title: ipRecord.title,
                    categoryLabel: CATEGORY_LABELS[ipRecord.category] ?? ipRecord.category,
                    statusLabel: STATUS_LABELS[ipRecord.status] ?? ipRecord.status,
                    referenceNumber: ipRecord.reference_number,
                    filingYear: new Date(ipRecord.created_at).getFullYear().toString(),
                    inventors,
                    collaborators,
                    abstract: ipRecord.abstract,
                    keywords,
                  };

                  return (
                    <IPRecordSummaryCard
                      data={summaryData}
                      primaryColor={primaryColor}
                      standalone={false}
                    />
                  );
                })()}
              </section>

              {/* Creator Information */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-semibold">2</span>
                  Creator Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Name</label>
                    <p className="text-gray-900 font-medium mt-1">{maskName(creator.full_name)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Email</label>
                    <p className="text-gray-900 font-medium mt-1">{maskEmail(creator.email)}</p>
                  </div>
                </div>
              </section>

              {/* Certificate/Disclosure Information */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-semibold">3</span>
                  Certificate Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Certificate Number</label>
                    <p className="text-gray-900 font-medium mt-1 font-mono">{certificate.certificate_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Issued Date</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {new Date(certificate.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Registration Date</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {new Date(ipRecord.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </section>

              {/* Security Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">⚠️ Public Verification Notice</p>
                  <p className="mt-1">The full certificate is publicly accessible. The creator information above has been partially masked for privacy. This is a verification-only view.</p>
                </div>
              </div>


            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
