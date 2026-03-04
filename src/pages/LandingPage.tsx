import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { PublicNavigation } from '../components/PublicNavigation';
import { Footer } from '../components/Footer';
import { CmsPageRenderer } from '../components/cms/CmsPageRenderer';
import type { CmsSection } from '../components/cms/sectionRegistry';

export function LandingPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor, siteName } = useBranding();
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmsAvailable, setCmsAvailable] = useState(false);

  const branding = { primaryColor, secondaryColor, siteName };

  useEffect(() => {
    const fetchHomePage = async () => {
      try {
        setLoading(true);
        const { data: pageData, error: pageError } = await supabase
          .from('cms_pages')
          .select('id')
          .eq('slug', 'home')
          .eq('is_published', true)
          .maybeSingle();

        if (pageError || !pageData) {
          setCmsAvailable(false);
          return;
        }

        const { data: sectionsData, error: sectionsError } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', pageData.id)
          .order('order_index', { ascending: true });

        if (!sectionsError && sectionsData && sectionsData.length > 0) {
          setSections(sectionsData as CmsSection[]);
          setCmsAvailable(true);
        } else {
          setCmsAvailable(false);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching home page:', err);
        setCmsAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    fetchHomePage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!cmsAvailable) {
    return <DefaultLandingPage navigate={navigate} primaryColor={primaryColor} siteName={siteName} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation />
      <div className="pt-16">
        <CmsPageRenderer page={null} sections={sections} branding={branding} />
        <Footer />
      </div>
    </div>
  );
}

function DefaultLandingPage({
  navigate,
  primaryColor,
  siteName,
}: {
  navigate: ReturnType<typeof useNavigate>;
  primaryColor: string;
  siteName: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PublicNavigation />
      <div className="pt-16">
        <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <svg className="absolute top-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 1000">
              <defs>
                <pattern id="grid-default" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-300" />
                </pattern>
              </defs>
              <rect width="1000" height="1000" fill="url(#grid-default)" />
            </svg>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 text-center">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 mb-8 leading-tight tracking-tighter">
              <span className="block">{siteName || 'University Intellectual Property'}</span>
              <span
                className="block bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${primaryColor}, #1d4ed8)` }}
              >
                Management System
              </span>
            </h1>

            <p className="text-lg sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Streamline your intellectual property submissions, evaluations, and approvals with our comprehensive management platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate('/register')}
                className="group px-10 py-4 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="flex items-center gap-2">
                  Get Started
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-10 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl text-lg font-bold hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:scale-105 focus:outline-none"
              >
                Sign In
              </button>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Trusted by leading academic institutions</p>
              <div className="flex justify-center items-center gap-6 flex-wrap opacity-60">
                <span className="text-xl font-bold text-gray-400">UCC</span>
                <span className="text-gray-300">•</span>
                <span className="text-sm font-semibold text-gray-400">Secure &amp; Reliable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '📄', title: 'Easy Submissions', desc: 'Submit with streamlined forms and document uploads.' },
                { icon: '🛡️', title: 'Secure Workflow', desc: 'Multi-level review process ensures quality and accuracy.' },
                { icon: '📈', title: 'Track Progress', desc: 'Monitor status and generate official certificates.' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl bg-blue-50">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
