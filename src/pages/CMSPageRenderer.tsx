import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicNavigation } from '../components/PublicNavigation';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
}

interface CMSSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
}

interface SiteSettings {
  site_name: string;
  tagline: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: 'University of Caloocan City Intellectual Property Office',
  tagline: 'Protecting Innovation, Promoting Excellence',
  primary_color: '#2563EB',
  secondary_color: '#9333EA',
  logo_url: null,
};

export function CMSPageRenderer() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CMSPage | null>(null);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPageData();
    }
  }, [slug]);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      // Fetch page by slug (published only)
      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (pageError || !pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(pageData);

      // Fetch sections for this page
      const { data: sectionsData } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageData.id)
        .order('order_index', { ascending: true });

      setSections(sectionsData || []);

      // Fetch site settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (settingsData) {
        setSettings({
          site_name: settingsData.site_name || DEFAULT_SITE_SETTINGS.site_name,
          tagline: settingsData.tagline || DEFAULT_SITE_SETTINGS.tagline,
          primary_color: settingsData.primary_color || DEFAULT_SITE_SETTINGS.primary_color,
          secondary_color: settingsData.secondary_color || DEFAULT_SITE_SETTINGS.secondary_color,
          logo_url: settingsData.logo_url,
        });
      }
    } catch (err) {
      console.error('Error fetching page data:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <PublicNavigation />

      {/* Render Sections */}
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} settings={settings} />
      ))}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>{settings.site_name}</p>
          <p className="text-gray-400 text-sm mt-2">{settings.tagline}</p>
        </div>
      </footer>
    </div>
  );
}

interface SectionRendererProps {
  section: CMSSection;
  settings: SiteSettings;
}

function SectionRenderer({ section, settings }: SectionRendererProps) {
  switch (section.section_type) {
    case 'hero':
      return <HeroSection content={section.content} settings={settings} />;
    case 'features':
      return <FeaturesSection content={section.content} settings={settings} />;
    case 'steps':
      return <StepsSection content={section.content} settings={settings} />;
    case 'categories':
      return <CategoriesSection content={section.content} />;
    case 'text':
      return <TextSection content={section.content} />;
    case 'showcase':
      return <ShowcaseSection content={section.content} />;
    case 'cta':
      return <CTASection content={section.content} settings={settings} />;
    case 'gallery':
      return <GallerySection content={section.content} />;
    default:
      return null;
  }
}

function HeroSection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          {content.headline}
          <br />
          <span style={{ color: settings.primary_color }}>{content.headline_highlight}</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {content.subheadline}
        </p>
        <a
          href={content.cta_link || '/register'}
          className="mt-8 inline-block px-8 py-4 text-white rounded-lg hover:opacity-90 text-lg font-semibold shadow-lg transition-opacity"
          style={{ backgroundColor: settings.primary_color }}
        >
          {content.cta_text || 'Get Started'}
        </a>
      </div>
    </div>
  );
}

function FeaturesSection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  const features = content.features || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature: Record<string, any>, idx: number) => (
          <div key={idx} className="bg-white p-8 rounded-xl shadow-lg">
            {feature.icon && (
              <div className={`${feature.icon_bg_color || 'bg-blue-100'} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
                <div className={`${feature.icon_color || 'text-blue-600'} text-2xl`}>
                  {getIconComponent(feature.icon)}
                </div>
              </div>
            )}
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepsSection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  const steps = content.steps || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-xl shadow-lg p-12">
        {content.title && (
          <h2 className="text-3xl font-bold text-center mb-8">{content.title}</h2>
        )}
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step: Record<string, any>, idx: number) => (
            <div key={idx} className="text-center">
              <div
                className="text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
                style={{ backgroundColor: settings.primary_color }}
              >
                {step.number || idx + 1}
              </div>
              <h4 className="font-semibold mb-2">{step.label}</h4>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoriesSection({ content }: { content: Record<string, any> }) {
  const categories = content.categories || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      {content.title && (
        <h2 className="text-3xl font-bold mb-4">{content.title}</h2>
      )}
      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {categories.map((category: string, idx: number) => (
          <span key={idx} className="px-6 py-3 bg-white rounded-full shadow-md text-gray-700 font-medium">
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}

function TextSection({ content }: { content: Record<string, any> }) {
  const alignment = content.alignment || 'left';
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment] || 'text-left';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className={`max-w-3xl ${alignment === 'center' ? 'mx-auto' : ''}`}>
        {content.title && (
          <h2 className={`text-3xl font-bold mb-4 ${alignClass}`}>{content.title}</h2>
        )}
        <div
          className={`prose prose-lg ${alignClass}`}
          dangerouslySetInnerHTML={{ __html: content.body || '' }}
        />
      </div>
    </div>
  );
}

function ShowcaseSection({ content }: { content: Record<string, any> }) {
  const items = content.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && (
        <h2 className="text-3xl font-bold text-center mb-12">{content.title}</h2>
      )}
      <div className="grid md:grid-cols-3 gap-8">
        {items.map((item: Record<string, any>, idx: number) => (
          <a
            key={idx}
            href={item.link || '#'}
            className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
              />
            )}
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function CTASection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  const bgColor = content.background_color || settings.primary_color;

  return (
    <div
      className="py-16 text-center text-white"
      style={{ backgroundColor: bgColor }}
    >
      <div className="max-w-3xl mx-auto px-4">
        {content.heading && (
          <h2 className="text-4xl font-bold mb-4">{content.heading}</h2>
        )}
        {content.description && (
          <p className="text-lg mb-8 opacity-90">{content.description}</p>
        )}
        {content.button_text && content.button_link && (
          <a
            href={content.button_link}
            className="inline-block px-8 py-3 bg-white text-gray-900 rounded-lg hover:opacity-90 font-semibold transition-opacity"
          >
            {content.button_text}
          </a>
        )}
      </div>
    </div>
  );
}

function GallerySection({ content }: { content: Record<string, any> }) {
  const images = content.images || [];
  const columns = content.columns || 3;
  const colClass = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[columns] || 'md:grid-cols-3';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && (
        <h2 className="text-3xl font-bold text-center mb-12">{content.title}</h2>
      )}
      <div className={`grid gap-6 ${colClass}`}>
        {images.map((image: Record<string, any>, idx: number) => (
          <div key={idx} className="rounded-lg overflow-hidden shadow-lg">
            <img
              src={image.url}
              alt={image.alt_text || image.caption}
              className="w-full h-64 object-cover"
            />
            {image.caption && (
              <div className="bg-white p-4">
                <p className="text-sm text-gray-700">{image.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to render icon components from names
function getIconComponent(iconName: string) {
  const iconMap: Record<string, string> = {
    FileText: '📄',
    Shield: '🛡️',
    TrendingUp: '📈',
    Users: '👥',
    Settings: '⚙️',
    CheckCircle: '✓',
  };

  return iconMap[iconName] || '●';
}
