/* eslint-disable @stylistic/indent */
/* Using inline styles for dynamic colors from props is necessary for this component */
import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  FileText,
  Shield,
  TrendingUp,
  Users,
  Settings,
  CheckCircle,
  AlertCircle,
  Zap,
  Heart,
  Star,
  Layers,
  Workflow,
} from 'lucide-react';
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [page, setPage] = useState<CMSPage | null>(null);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPageData();
    }
  }, [slug]);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      setLoadError(null);

      // Ensure slug exists
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch page by slug (published only)
      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (pageError) {
        if (import.meta.env.DEV) console.error(`Page fetch error for slug "${slug}":`, pageError);
        if (pageError.code === 'PGRST116') {
          setNotFound(true);
        } else {
          setLoadError(`Unable to load page: ${pageError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(pageData as CMSPage);

      // Fetch sections for this page
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', (pageData as Record<string, any>).id)
        .order('order_index', { ascending: true });

      if (sectionsError) {
        if (import.meta.env.DEV) console.warn(`Sections fetch error for page ${(pageData as Record<string, any>).id}:`, sectionsError);
        setLoadError(`Some page content may not be available: ${sectionsError.message}`);
      } else {
        setSections((sectionsData as CMSSection[]) || []);
      }

      // Fetch site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (settingsError) {
        if (import.meta.env.DEV) console.warn('Site settings fetch error:', settingsError);
      } else if (settingsData) {
        const settings = settingsData as Record<string, any>;
        setSettings({
          site_name: settings.site_name || DEFAULT_SITE_SETTINGS.site_name,
          tagline: settings.tagline || DEFAULT_SITE_SETTINGS.tagline,
          primary_color: settings.primary_color || DEFAULT_SITE_SETTINGS.primary_color,
          secondary_color: settings.secondary_color || DEFAULT_SITE_SETTINGS.secondary_color,
          logo_url: settings.logo_url,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (import.meta.env.DEV) console.error('Unexpected error fetching page data:', err);
      setLoadError(`Failed to load page: ${errorMsg}`);
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

      {/* Load Error Alert */}
      {loadError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-amber-600 text-lg mt-0.5">⚠️</div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">Page Load Warning</p>
              <p className="text-sm text-amber-800 mt-1">{loadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Render Sections */}
      {Array.isArray(sections) && sections.length > 0 ? (
        sections.map((section) => {
          // Defensive checks for section object
          if (!section || !section.id || !section.section_type || !section.content) {
            if (import.meta.env.DEV) console.warn('CMSPageRenderer: Invalid section detected', section);
            return null;
          }
          return (
            <SectionRenderer key={section.id} section={section} settings={settings} />
          );
        })
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-gray-500">No content available for this page.</p>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>{settings?.site_name || 'Site'}</p>
          <p className="text-gray-400 text-sm mt-2">{settings?.tagline || ''}</p>
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
  // Defensive checks for section and its content
  if (!section) {
    console.warn('SectionRenderer: Missing section prop');
    return null;
  }

  const sectionType = section.section_type || 'unknown';
  const content = section.content || {};

  // Ensure content is an object
  if (typeof content !== 'object' || content === null) {
    console.warn(`SectionRenderer: Invalid content for section type "${sectionType}"`);
    return null;
  }

  switch (sectionType) {
    case 'hero':
      return <HeroSection content={content} settings={settings} />;
    case 'features':
      return <FeaturesSection content={content} settings={settings} />;
    case 'steps':
      return <StepsSection content={content} settings={settings} />;
    case 'categories':
      return <CategoriesSection content={content} />;
    case 'text':
      return <TextSection content={content} />;
    case 'showcase':
      return <ShowcaseSection content={content} />;
    case 'cta':
      return <CTASection content={content} settings={settings} />;
    case 'gallery':
      return <GallerySection content={content} />;
    default:
      console.warn(`SectionRenderer: Unknown section type "${sectionType}"`);
      return null;
  }
}

function HeroSection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  // Defensive checks: ensure required fields exist
  if (!content) {
    console.warn('HeroSection: Missing content prop');
    return null;
  }

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
              {/* This inline style uses dynamic color from settings prop */}
              {/* eslint-disable-next-line */}
              <span style={{ color: settings?.primary_color || '#2563EB' }}>
                {headlineHighlight}
              </span>
            </>
          )}
        </h1>
        {subheadline && (
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{subheadline}</p>
        )}
        {/* This CTA button uses dynamic background color from settings prop */}
        {/* eslint-disable-next-line */}
        <a
          href={ctaLink}
          className="mt-8 inline-block px-8 py-4 text-white rounded-lg hover:opacity-90 text-lg font-semibold shadow-lg transition-opacity"
          style={{ backgroundColor: settings?.primary_color || '#2563EB' }}
        >
          {ctaText}
        </a>
      </div>
    </div>
  );
}

function FeaturesSection({ content }: { content: Record<string, any>; settings: SiteSettings }) {
  // Defensive checks
  if (!content) {
    console.warn('FeaturesSection: Missing content prop');
    return null;
  }

  const features = Array.isArray(content.features) ? content.features : [];

  if (features.length === 0) {
    console.warn('FeaturesSection: No features provided');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature: Record<string, any>, idx: number) => {
          // Ensure feature is an object
          if (!feature || typeof feature !== 'object') {
            console.warn(`FeaturesSection: Invalid feature at index ${idx}`);
            return null;
          }

          const featureTitle = feature.title || `Feature ${idx + 1}`;
          const featureDescription = feature.description || '';
          const featureIcon = feature.icon || null;
          const iconBgColor = feature.icon_bg_color || 'bg-blue-100';
          const iconColor = feature.icon_color || 'text-blue-600';

          return (
            <div key={idx} className="bg-white p-8 rounded-xl shadow-lg">
              {featureIcon && (
                <div className={`${iconBgColor} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
                  <div className={`${iconColor} text-2xl`}>
                    {getIconComponent(featureIcon)}
                  </div>
                </div>
              )}
              <h3 className="text-xl font-bold mb-3">{featureTitle}</h3>
              {featureDescription && (
                <p className="text-gray-600">{featureDescription}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepsSection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  // Defensive checks
  if (!content) {
    console.warn('StepsSection: Missing content prop');
    return null;
  }

  const steps = Array.isArray(content.steps) ? content.steps : [];
  const title = content.title || '';

  if (steps.length === 0) {
    console.warn('StepsSection: No steps provided');
    return null;
  }

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
      <div className="bg-white rounded-xl shadow-lg p-12">
        {title && (
          <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
        )}
        <div className={getGridClass(steps.length)}>
          {steps.map((step: Record<string, any>, idx: number) => {
            // Ensure step is an object
            if (!step || typeof step !== 'object') {
              console.warn(`StepsSection: Invalid step at index ${idx}`);
              return null;
            }

            const stepNumber = step.number || (idx + 1);
            const stepLabel = step.label || `Step ${idx + 1}`;
            const stepDescription = step.description || '';

            return (
              <div key={idx} className="text-center">
                {/* Step number uses dynamic background color from settings prop */}
                {/* eslint-disable-next-line */}
                <div
                  className="text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
                  style={{ backgroundColor: settings?.primary_color || '#2563EB' }}
                >
                  {stepNumber}
                </div>
                <h4 className="font-semibold mb-2">{stepLabel}</h4>
                {stepDescription && (
                  <p className="text-sm text-gray-600">{stepDescription}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoriesSection({ content }: { content: Record<string, any> }) {
  // Defensive checks
  if (!content) {
    console.warn('CategoriesSection: Missing content prop');
    return null;
  }

  const categories = Array.isArray(content.categories) ? content.categories : [];
  const title = content.title || '';

  if (categories.length === 0) {
    console.warn('CategoriesSection: No categories provided');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      {title && (
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
      )}
      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {categories.map((category: any, idx: number) => {
          // Ensure category is a string
          const categoryText = typeof category === 'string' ? category : String(category);
          
          return (
            <span key={idx} className="px-6 py-3 bg-white rounded-full shadow-md text-gray-700 font-medium">
              {categoryText}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TextSection({ content }: { content: Record<string, any> }) {
  // Defensive checks
  if (!content) {
    console.warn('TextSection: Missing content prop');
    return null;
  }

  const title = content.title || '';
  const body = content.body || '';

  // Check if there's any content to display
  if (!title && !body) {
    console.warn('TextSection: No title or body content');
    return null;
  }

  // Sanitize HTML to prevent XSS attacks while preserving basic formatting
  // This whitelist only allows safe, formatting-related tags and the href attribute for links
  const sanitizedBody = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
  });

  return (
    <div className="w-full bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center text-section">
          {title && (
            <h2 className="text-3xl font-bold mb-6 text-gray-900">{title}</h2>
          )}
          {body && (
            <div
              className="text-gray-700"
              style={{
                fontSize: '16px',
                lineHeight: '1.8',
              }}
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
            />
          )}
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

function ShowcaseSection({ content }: { content: Record<string, any> }) {
  // Defensive checks
  if (!content) {
    console.warn('ShowcaseSection: Missing content prop');
    return null;
  }

  const items = Array.isArray(content.items) ? content.items : [];
  const title = content.title || '';

  if (items.length === 0) {
    console.warn('ShowcaseSection: No items provided');
    return null;
  }

  const renderItem = (item: Record<string, any>, idx: number) => {
    // Ensure item is an object
    if (!item || typeof item !== 'object') {
      console.warn(`ShowcaseSection: Invalid item at index ${idx}`);
      return null;
    }

    const itemTitle = item.title || `Item ${idx + 1}`;
    const itemDescription = item.description || '';
    const itemLink = item.link || '#';
    const itemImageUrl = item.image_url || null;
    const imageWidth = item.image_width || 300;
    const imageHeight = item.image_height || 300;
    const imagePosition = item.image_position || 'center';

    // Map position to Tailwind alignment class
    const positionClass = imagePosition === 'left' ? 'justify-start' : imagePosition === 'right' ? 'justify-end' : 'justify-center';

    return (
      <a
        key={idx}
        href={itemLink}
        className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
      >
        {itemImageUrl && (
          <div className={`flex items-center bg-gray-100 h-48 ${positionClass}`}>
            <img
              src={itemImageUrl}
              alt={itemTitle}
              style={{
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                objectFit: 'cover'
              }}
              className="group-hover:opacity-90 transition-opacity"
            />
          </div>
        )}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
            {itemTitle}
          </h3>
          {itemDescription && (
            <p className="text-gray-600">{itemDescription}</p>
          )}
        </div>
      </a>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && (
        <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
      )}
      {/* Dynamic grid based on item count */}
      {items.length === 1 ? (
        <div className="flex justify-center">
          {items.map((item: Record<string, any>, idx: number) => renderItem(item, idx))}
        </div>
      ) : items.length === 2 ? (
        <div className="flex justify-center gap-8 flex-wrap">
          {items.map((item: Record<string, any>, idx: number) => renderItem(item, idx))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item: Record<string, any>, idx: number) => renderItem(item, idx))}
        </div>
      )}
    </div>
  );
}

function CTASection({ content, settings }: { content: Record<string, any>; settings: SiteSettings }) {
  // Defensive checks
  if (!content) {
    console.warn('CTASection: Missing content prop');
    return null;
  }

  const bgColor = content.background_color || settings?.primary_color || '#2563EB';
  const heading = content.heading || '';
  const description = content.description || '';
  const buttonText = content.button_text || null;
  const buttonLink = content.button_link || null;

  // Check if there's any content to display
  if (!heading && !description && (!buttonText || !buttonLink)) {
    console.warn('CTASection: No heading, description, or button provided');
    return null;
  }

  return (
    <div
      className="py-16 text-center text-white"
      // eslint-disable jsx-a11y/no-static-element-interactions
      style={{ backgroundColor: bgColor }}
    >
      <div className="max-w-3xl mx-auto px-4">
        {heading && (
          <h2 className="text-4xl font-bold mb-4">{heading}</h2>
        )}
        {description && (
          <p className="text-lg mb-8 opacity-90">{description}</p>
        )}
        {buttonText && buttonLink && (
          <a
            href={buttonLink}
            className="inline-block px-8 py-3 bg-white text-gray-900 rounded-lg hover:opacity-90 font-semibold transition-opacity"
          >
            {buttonText}
          </a>
        )}
      </div>
    </div>
  );
}

function GallerySection({ content }: { content: Record<string, any> }) {
  // Defensive checks
  if (!content) {
    console.warn('GallerySection: Missing content prop');
    return null;
  }

  const images = Array.isArray(content.images) ? content.images : [];
  const title = content.title || '';

  if (images.length === 0) {
    console.warn('GallerySection: No images provided');
    return null;
  }

  // Determine layout based on image count
  const getGridClass = (count: number): string => {
    if (count === 1) return 'flex justify-center';
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 gap-6';
    // 5+ images: responsive grid
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  const renderImage = (image: Record<string, any>, idx: number) => {
    if (!image || typeof image !== 'object') {
      console.warn(`GallerySection: Invalid image at index ${idx}`);
      return null;
    }

    const imageUrl = image.url || null;
    const imageAlt = image.alt_text || image.caption || `Gallery image ${idx + 1}`;
    const imageCaption = image.caption || '';

    if (!imageUrl) {
      return null;
    }

    // Determine image size based on layout
    const isSingleImage = images.length === 1;
    const aspectRatio = isSingleImage ? '4/3' : '16/10';
    const heightClass = isSingleImage ? 'h-96' : 'h-64';
    const widthClass = isSingleImage ? 'max-w-lg' : '';

    return (
      <div key={idx} className={`rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 ${widthClass}`}>
        <div className={`${heightClass} w-full`} style={{ aspectRatio }}>
          <img
            src={imageUrl}
            alt={imageAlt}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
        {imageCaption && (
          <p className="p-4 text-gray-700 text-center text-sm">{imageCaption}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && (
        <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
      )}
      <div className={getGridClass(images.length)}>
        {images.map((image: Record<string, any>, idx: number) => renderImage(image, idx))}
      </div>
    </div>
  );
}
            console.warn(`GallerySection: Image at index ${idx} missing URL`);
            return null;
          }

          return (
            <div key={idx} className="rounded-lg overflow-hidden shadow-lg">
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-full h-64 object-cover"
              />
              {imageCaption && (
                <div className="bg-white p-4">
                  <p className="text-sm text-gray-700">{imageCaption}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to render icon components from Lucide React
// Returns a React component or a safe fallback icon if the icon name is invalid
function getIconComponent(iconName: string): React.ReactNode {
  // Define the icon map with Lucide React components
  const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    FileText,
    Shield,
    TrendingUp,
    Users,
    Settings,
    CheckCircle,
    AlertCircle,
    Zap,
    Heart,
    Star,
    Layers,
    Workflow,
  };

  // Validate icon name and return component or fallback
  if (!iconName || typeof iconName !== 'string') {
    console.warn(`getIconComponent: Invalid icon name "${iconName}", using fallback`);
    return <CheckCircle size={24} />;
  }

  const IconComponent = iconMap[iconName];

  if (!IconComponent) {
    console.warn(
      `getIconComponent: Unknown icon "${iconName}". Available icons: ${Object.keys(iconMap).join(', ')}`,
    );
    // Fallback: render a generic alert icon
    return <AlertCircle size={24} />;
  }

  // Return the actual Lucide React icon component
  return <IconComponent size={24} />;
}
