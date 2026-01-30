import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle, Loader, Lock } from 'lucide-react';

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
  category: string;
  status: string;
  created_at: string;
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
}

export function CertificateVerifyPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
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
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Title</label>
                    <p className="text-gray-900 font-medium mt-1">{ipRecord.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Category</label>
                      <p className="text-gray-900 font-medium mt-1 capitalize">{ipRecord.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Status</label>
                      <p className="text-gray-900 font-medium mt-1 capitalize">{ipRecord.status}</p>
                    </div>
                  </div>
                </div>
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

              {/* Action Button */}
              <div className="pt-6">
                <a
                  href={certificate.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition text-center"
                  title="View the complete certificate PDF (publicly accessible)"
                >
                  Download Full Certificate
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>This verification system is provided by UCC Intellectual Property Office</p>
          <p className="mt-2">Verification URL: ucc-ipo.com/verify/{trackingId}</p>
        </div>
      </div>
    </div>
  );
}
