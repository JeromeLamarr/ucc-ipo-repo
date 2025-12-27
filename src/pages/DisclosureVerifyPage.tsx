import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Create a public Supabase client for disclosure verification
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Disclosure {
  id: string;
  tracking_id: string;
  pdf_url: string;
  generated_at: string;
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

export function DisclosureVerifyPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [ipRecord, setIpRecord] = useState<IPRecord | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [isAuthentic, setIsAuthentic] = useState(false);

  useEffect(() => {
    const verifyDisclosure = async () => {
      try {
        if (!trackingId) {
          setError('No tracking ID provided');
          setLoading(false);
          return;
        }

        // Fetch disclosure by tracking ID
        const { data: discData, error: discError } = await supabase
          .from('full_disclosures')
          .select('*')
          .eq('tracking_id', trackingId)
          .maybeSingle();

        if (discError || !discData) {
          setError('Disclosure document not found. This may be an invalid or forged document.');
          setLoading(false);
          return;
        }

        setDisclosure(discData);

        // Fetch IP record
        const { data: ipData, error: ipError } = await supabase
          .from('ip_records')
          .select('*')
          .eq('id', discData.ip_record_id)
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
      } catch (err) {
        setError(`Verification error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    verifyDisclosure();
  }, [trackingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-semibold">Verifying Disclosure Document...</p>
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
                  <h1 className="text-3xl font-bold text-green-700">Disclosure Verified</h1>
                  <p className="text-green-600">This is an authentic UCC IP Full Disclosure Document</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-16 h-16 text-red-600" />
                <div>
                  <h1 className="text-3xl font-bold text-red-700">Disclosure Invalid</h1>
                  <p className="text-red-600">{error}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Disclosure Details */}
        {isAuthentic && disclosure && ipRecord && creator && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <h2 className="text-2xl font-bold mb-2">Full Disclosure Document</h2>
              <p className="text-blue-100">Tracking ID: {disclosure.tracking_id}</p>
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
                    <p className="text-gray-900 font-medium mt-1">{creator.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Email</label>
                    <p className="text-gray-900 font-medium mt-1">{creator.email}</p>
                  </div>
                </div>
              </section>

              {/* Disclosure Information */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm font-semibold">3</span>
                  Document Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Tracking ID</label>
                    <p className="text-gray-900 font-medium mt-1 font-mono">{disclosure.tracking_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Generated Date</label>
                    <p className="text-gray-900 font-medium mt-1">
                      {new Date(disclosure.generated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">IP Record Date</label>
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

              {/* Action Button */}
              <div className="pt-6">
                <a
                  href={disclosure.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition text-center"
                >
                  View Full Disclosure Document
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>This verification system is provided by UCC Intellectual Property Office</p>
          <p className="mt-2">Verification URL: ucc-ipo.com/verify-disclosure/{trackingId}</p>
        </div>
      </div>
    </div>
  );
}
