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

  if (steps.length === 0) return null;

  // Adaptive grid layout based on step count
  const getGridClass = (count: number): string => {
    if (count === 1) return 'flex justify-center';
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
    if (count === 5 || count === 6) return 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6';
    // 7+ steps: wrap intelligently
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
      <div className={getGridClass(steps.length)}>
        {steps.map((step: any, index: number) => (
          <div key={index} className="text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              {step.number || index + 1}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{step.label || `Step ${index + 1}`}</h3>
            <p className="text-gray-600 text-sm">{step.description || ''}</p>
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
    <div className="w-full bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          {title && <h2 className="text-3xl font-bold mb-6 text-gray-900">{title}</h2>}
          <div
            className="text-section text-gray-700"
            style={{
              lineHeight: '1.8',
            }}
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
          <style>{`
            .text-section h1 {
              font-size: 2.25rem;
              font-weight: 700;
              color: #111827;
              margin-top: 2.5rem;
              margin-bottom: 1.25rem;
              line-height: 1.3;
              letter-spacing: -0.5px;
            }
            .text-section h2 {
              font-size: 1.875rem;
              font-weight: 700;
              color: #1f2937;
              margin-top: 2rem;
              margin-bottom: 1rem;
              line-height: 1.3;
              letter-spacing: -0.3px;
            }
            .text-section h3 {
              font-size: 1.5rem;
              font-weight: 700;
              color: #1e40af;
              margin-top: 1.75rem;
              margin-bottom: 0.875rem;
              line-height: 1.4;
              letter-spacing: -0.2px;
            }
            .text-section h4 {
              font-size: 1.25rem;
              font-weight: 600;
              color: #374151;
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
              line-height: 1.4;
            }
            .text-section h5 {
              font-size: 1.125rem;
              font-weight: 600;
              color: #374151;
              margin-top: 1.25rem;
              margin-bottom: 0.625rem;
              line-height: 1.4;
            }
            .text-section h6 {
              font-size: 1rem;
              font-weight: 600;
              color: #374151;
              margin-top: 1rem;
              margin-bottom: 0.5rem;
              line-height: 1.5;
            }
            .text-section p {
              margin-bottom: 1.125rem;
              text-align: left;
            }
            .text-section p:first-child {
              margin-top: 0;
            }
            .text-section ul, .text-section ol {
              margin-left: 1.75rem;
              margin-bottom: 1.125rem;
              list-style-position: outside;
            }
            .text-section li {
              margin-bottom: 0.625rem;
              text-align: left;
            }
            .text-section a {
              color: #1e40af;
              text-decoration: underline;
              font-weight: 500;
              transition: color 0.2s ease;
            }
            .text-section a:hover {
              color: #1e3a8a;
            }
            .text-section strong {
              font-weight: 700;
              color: #1f2937;
            }
            .text-section em {
              font-style: italic;
            }
            .text-section blockquote {
              border-left: 4px solid #dbeafe;
              padding-left: 1.25rem;
              margin-left: 0;
              margin-top: 1.5rem;
              margin-bottom: 1.5rem;
              color: #4b5563;
              font-style: italic;
            }
            .text-section code {
              background-color: #f3f4f6;
              padding: 0.25rem 0.5rem;
              border-radius: 0.375rem;
              font-family: monospace;
              font-size: 0.9em;
              color: #d97706;
            }
            .text-section pre {
              background-color: #1f2937;
              color: #e5e7eb;
              padding: 1rem;
              border-radius: 0.5rem;
              overflow-x: auto;
              margin-top: 1.125rem;
              margin-bottom: 1.125rem;
              font-family: monospace;
              font-size: 0.875rem;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

function CTASection({ content, navigate }: { content: Record<string, any>; navigate: any }) {
  // Defensive checks
  if (!content) {
    return null;
  }

  const bgColor = content.background_color || '#2563EB';
  const heading = content.heading || '';
  const description = content.description || '';
  const buttonText = content.button_text || null;
  const buttonLink = content.button_link || null;

  // Check if there's any content to display
  if (!heading && !description && (!buttonText || !buttonLink)) {
    return null;
  }

  // Check if bgColor is a Tailwind class or a color value
  const isTailwindClass = bgColor.includes('bg-') || bgColor.includes('from-') || bgColor.includes('to-') || bgColor.includes('gradient');
  const classNames = isTailwindClass ? `py-16 text-center text-white ${bgColor}` : 'py-16 text-center text-white';

  return (
    <div
      className={classNames}
      style={!isTailwindClass ? { backgroundColor: bgColor } : {}}
    >
      <div className="max-w-3xl mx-auto px-4">
        {heading && (
          <h2 className="text-4xl font-bold mb-4">{heading}</h2>
        )}
        {description && (
          <p className="text-lg mb-8 opacity-90">{description}</p>
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

  if (images.length === 0) return null;

  // Determine layout based on image count
  const getGridClass = (count: number): string => {
    if (count === 1) return 'flex justify-center';
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    // 5+ images: responsive grid
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  const renderImage = (image: any, index: number) => {
    const isSingleImage = images.length === 1;
    const heightClass = isSingleImage ? 'h-96' : 'h-64';
    const widthClass = isSingleImage ? 'max-w-lg' : '';
    const aspectRatio = isSingleImage ? '4/3' : '16/10';

    return (
      <div key={index} className={`rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 ${widthClass}`}>
        <div className={`${heightClass} w-full`} style={{ aspectRatio }}>
          <img
            src={image.url}
            alt={image.alt_text}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
        {image.caption && (
          <p className="p-4 text-gray-700 text-center text-sm">{image.caption}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
      <div className={getGridClass(images.length)}>
        {images.map((image: any, index: number) => renderImage(image, index))}
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
