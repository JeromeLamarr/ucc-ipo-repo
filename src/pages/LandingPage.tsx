import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PublicNavigation } from '../components/PublicNavigation';

interface SiteSettings {
  site_name: string;
  tagline: string;
}

interface CMSSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
}

// Fallback values (current hardcoded values)
const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'University of Caloocan City Intellectual Property Office',
  tagline: 'Protecting Innovation, Promoting Excellence',
};

const DEFAULT_HERO_CONTENT = {
  headline: 'University Intellectual Property',
  headline_highlight: 'Management System',
  subheadline: 'Streamline your intellectual property submissions, evaluations, and approvals with our comprehensive management platform.',
  cta_text: 'Get Started',
  cta_link: '/register',
};

export function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [heroSection, setHeroSection] = useState<CMSSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setSettingsError(null);
        const { data, error } = await supabase
          .from('site_settings')
          .select('site_name, tagline')
          .eq('id', 1)
          .single();

        if (error) {
          const msg = `Failed to load site settings: ${error.message}`;
          if (import.meta.env.DEV) console.warn(msg);
          setSettingsError(msg);
          setSettings(DEFAULT_SETTINGS);
        } else if (data) {
          setSettings({
            site_name: data.site_name || DEFAULT_SETTINGS.site_name,
            tagline: data.tagline || DEFAULT_SETTINGS.tagline,
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        const msg = 'Failed to load site settings, using defaults';
        if (import.meta.env.DEV) console.warn(msg, err);
        setSettingsError(msg);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Fetch CMS sections for home page
  useEffect(() => {
    const fetchCMSSections = async () => {
      try {
        setSectionsError(null);
        // First, get the home page
        const { data: pageData, error: pageError } = await supabase
          .from('cms_pages')
          .select('id')
          .eq('slug', 'home')
          .eq('is_published', true)
          .single();

        if (pageError) {
          if (import.meta.env.DEV) console.warn('Home page not found in CMS', pageError);
          return;
        }

        if (!pageData) {
          if (import.meta.env.DEV) console.warn('Home page not found in CMS');
          return;
        }

        // Then fetch sections for this page, ordered by index
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', pageData.id)
          .order('order_index', { ascending: true });

        if (sectionsError) {
          const msg = `Some homepage content is unavailable: ${sectionsError.message}`;
          if (import.meta.env.DEV) console.warn(msg);
          setSectionsError(msg);
          return;
        }

        // Find hero section
        if (sectionsData) {
          const hero = sectionsData.find((s) => s.section_type === 'hero');
          if (hero) {
            setHeroSection(hero);
          }
        }
      } catch (err) {
        const msg = 'Failed to load homepage content';
        if (import.meta.env.DEV) console.warn(msg, err);
        setSectionsError(msg);
      }
    };

    fetchCMSSections();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Error Alerts */}
        {settingsError && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-amber-600 text-lg mt-0.5">⚠️</div>
            <div>
              <p className="font-medium text-amber-900">Site Configuration Issue</p>
              <p className="text-sm text-amber-800 mt-1">{settingsError}</p>
            </div>
          </div>
        )}

        {sectionsError && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-amber-600 text-lg mt-0.5">⚠️</div>
            <div>
              <p className="font-medium text-amber-900">Content Load Warning</p>
              <p className="text-sm text-amber-800 mt-1">{sectionsError}</p>
            </div>
          </div>
        )}

        {/* Hero Section - CMS-driven or hardcoded fallback */}
        {heroSection ? (
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              {heroSection.content.headline}
              <br />
              <span className="text-blue-600">{heroSection.content.headline_highlight}</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {heroSection.content.subheadline}
            </p>
            <button
              onClick={() => navigate(heroSection.content.cta_link || '/register')}
              className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg"
            >
              {heroSection.content.cta_text || 'Get Started'}
            </button>
          </div>
        ) : (
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              {DEFAULT_HERO_CONTENT.headline}
              <br />
              <span className="text-blue-600">{DEFAULT_HERO_CONTENT.headline_highlight}</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {DEFAULT_HERO_CONTENT.subheadline}
            </p>
            <button
              onClick={() => navigate(DEFAULT_HERO_CONTENT.cta_link)}
              className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg"
            >
              {DEFAULT_HERO_CONTENT.cta_text}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Easy Submissions</h3>
            <p className="text-gray-600">
              Submit your intellectual property with a streamlined digital form. Upload documents, select supervisors, and track progress.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Secure Workflow</h3>
            <p className="text-gray-600">
              Multi-level review process with supervisor approval and expert evaluation ensures quality and compliance.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Track Progress</h3>
            <p className="text-gray-600">
              Monitor your submission status in real-time, receive notifications, and generate official certificates.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-12">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold mb-2">Register</h4>
              <p className="text-sm text-gray-600">Create your account with email verification</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold mb-2">Submit IP</h4>
              <p className="text-sm text-gray-600">Fill out forms and upload required documents</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold mb-2">Review Process</h4>
              <p className="text-sm text-gray-600">Supervisor and evaluator assessment</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold mb-2">Get Certificate</h4>
              <p className="text-sm text-gray-600">Receive official documents with QR codes</p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-4">IP Categories We Support</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {['Patents', 'Copyright', 'Trademarks', 'Industrial Design', 'Utility Models'].map((category) => (
              <span
                key={category}
                className="px-6 py-3 bg-white rounded-full shadow-md text-gray-700 font-medium"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>{settings.site_name}</p>
          <p className="text-gray-400 text-sm mt-2">{settings.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
