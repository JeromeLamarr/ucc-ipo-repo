import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PublicNavigation } from '../components/PublicNavigation';
import DOMPurify from 'dompurify';

interface SiteSettings {
  site_name: string;
  tagline: string;
  primary_color?: string;
}

interface CMSSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'University of Caloocan City Intellectual Property Office',
  tagline: 'Protecting Innovation, Promoting Excellence',
};

export function LandingPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmsAvailable, setCmsAvailable] = useState(false);

  useEffect(() => {
    const fetchHomePage = async () => {
      try {
        setLoading(true);

        // Fetch site settings
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (settingsData) {
          setSettings(settingsData);
        }

        // Fetch the home CMS page
        const { data: pageData, error: pageError } = await supabase
          .from('cms_pages')
          .select('id')
          .eq('slug', 'home')
          .eq('is_published', true)
          .single();

        if (pageError || !pageData) {
          setCmsAvailable(false);
          return;
        }

        // Fetch all sections for the home page
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', pageData.id)
          .order('order_index', { ascending: true });

        if (!sectionsError && sectionsData && sectionsData.length > 0) {
          setSections(sectionsData as CMSSection[]);
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

  const renderSection = (section: CMSSection) => {
    const { section_type, content } = section;

    switch (section_type) {
      case 'hero':
        return <HeroSection key={section.id} content={content} navigate={navigate} settings={settings} />;
      case 'features':
        return <FeaturesSection key={section.id} content={content} />;
      case 'steps':
        return <StepsSection key={section.id} content={content} />;
      case 'categories':
        return <CategoriesSection key={section.id} content={content} />;
      case 'text':
        return <TextSection key={section.id} content={content} />;
      case 'cta':
        return <CTASection key={section.id} content={content} navigate={navigate} />;
      case 'gallery':
        return <GallerySection key={section.id} content={content} />;
      default:
        return null;
    }
  };

  if (!cmsAvailable) {
    return <DefaultLandingPage navigate={navigate} settings={settings} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />
      {sections.map((section) => renderSection(section))}
      <Footer settings={settings} />
    </div>
  );
}

// ============================================================================
// Section Renderers
// ============================================================================

function HeroSection({ content, navigate, settings }: { content: Record<string, any>; navigate: any; settings: SiteSettings }) {
  const headline = content.headline || 'Welcome';
  const headlineHighlight = content.headline_highlight || '';
  const subheadline = content.subheadline || '';
  const ctaText = content.cta_text || 'Get Started';
  const ctaLink = content.cta_link || '/register';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          {headline}
          {headlineHighlight && (
            <>
              <br />
              <span style={{ color: settings?.primary_color || '#2563EB' }}>
                {headlineHighlight}
              </span>
            </>
          )}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">{subheadline}</p>
        <button
          onClick={() => navigate(ctaLink)}
          className="px-8 py-4 text-white rounded-lg hover:opacity-90 text-lg font-semibold shadow-lg"
          style={{ backgroundColor: settings?.primary_color || '#2563EB' }}
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}

function FeaturesSection({ content }: { content: Record<string, any> }) {
  const features = content.features || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature: any, index: number) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-8">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${feature.icon_bg_color}`}>
              <div className={`text-3xl ${feature.icon_color}`}>📄</div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepsSection({ content }: { content: Record<string, any> }) {
  const title = content.title || '';
  const steps = content.steps || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step: any, index: number) => (
          <div key={index} className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              {step.number}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{step.label}</h3>
            <p className="text-gray-600 text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesSection({ content }: { content: Record<string, any> }) {
  const title = content.title || '';
  const categories = content.categories || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white rounded-lg">
      {title && <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">{title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category: string, index: number) => (
          <div key={index} className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-900 font-medium">{category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextSection({ content }: { content: Record<string, any> }) {
  const title = content.title || '';
  const body = content.body || '';

  const sanitizedBody = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl">
        {title && <h2 className="text-3xl font-bold mb-6 text-gray-900">{title}</h2>}
        <div
          className="text-section text-gray-700 space-y-4"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />
        <style>{`
          .text-section h3 { font-size: 1.5rem; color: #1e40af; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .text-section p { margin-bottom: 1rem; }
        `}</style>
      </div>
    </div>
  );
}

function CTASection({ content, navigate }: { content: Record<string, any>; navigate: any }) {
  const bgColor = content.background_color || 'bg-gradient-to-r from-blue-600 to-blue-800';
  const heading = content.heading || '';
  const description = content.description || '';
  const buttonText = content.button_text || null;
  const buttonLink = content.button_link || null;

  if (!heading && !description && (!buttonText || !buttonLink)) {
    return null;
  }

  // Check if bgColor is a Tailwind class (contains 'bg-', 'from-', 'to-', 'gradient')
  // or a color value (hex, rgb, etc.)
  const isTailwindClass = bgColor.includes('bg-') || bgColor.includes('from-') || bgColor.includes('to-') || bgColor.includes('gradient');

  return (
    <div
      className={`py-20 text-center text-white ${isTailwindClass ? bgColor : ''}`}
      style={!isTailwindClass ? { backgroundColor: bgColor } : {}}
    >
      <div className="max-w-3xl mx-auto px-4">
        {heading && (
          <h2 className="text-4xl font-bold mb-4">{heading}</h2>
        )}
        {description && (
          <p className="text-xl mb-8 opacity-95">{description}</p>
        )}
        {buttonText && buttonLink && (
          <button
            onClick={() => navigate(buttonLink)}
            className="inline-block px-8 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}

function GallerySection({ content }: { content: Record<string, any> }) {
  const title = content.title || '';
  const images = content.images || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {images.map((image: any, index: number) => (
          <div key={index} className="rounded-lg overflow-hidden shadow-lg">
            <img src={image.url} alt={image.alt_text} className="w-full h-64 object-cover" />
            {image.caption && <p className="p-4 text-gray-700 text-center">{image.caption}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-gray-400">© 2026 {settings.site_name}. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ============================================================================
// Default Landing Page (Fallback)
// ============================================================================

function DefaultLandingPage({ navigate, settings }: { navigate: any; settings: SiteSettings }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            University Intellectual Property
            <br />
            <span className="text-blue-600">Management System</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Streamline your intellectual property submissions, evaluations, and approvals with our comprehensive management platform.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold shadow-lg"
          >
            Get Started
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Submissions</h3>
            <p className="text-gray-600">Submit with streamlined forms and document uploads.</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Workflow</h3>
            <p className="text-gray-600">Multi-level review process ensures quality.</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Track Progress</h3>
            <p className="text-gray-600">Monitor status and generate certificates.</p>
          </div>
        </div>
      </div>

      <Footer settings={settings} />
    </div>
  );
}
