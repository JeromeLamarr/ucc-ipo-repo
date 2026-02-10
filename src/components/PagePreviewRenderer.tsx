import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

interface CMSSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
}

interface SiteSettings {
  site_name: string;
  tagline: string;
  primary_color?: string;
  secondary_color?: string;
}

interface PagePreviewRendererProps {
  sections: CMSSection[];
  settings?: SiteSettings;
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'University of Caloocan City Intellectual Property Office',
  tagline: 'Protecting Innovation, Promoting Excellence',
  primary_color: '#2563EB',
  secondary_color: '#9333EA',
};

export function PagePreviewRenderer({ sections, settings = DEFAULT_SETTINGS }: PagePreviewRendererProps) {
  const navigate = useNavigate();

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
      case 'cta':
        return <CTASection key={section.id} content={content} navigate={navigate} />;
      case 'gallery':
        return <GallerySection key={section.id} content={content} />;
      case 'showcase':
        return <ShowcaseSection key={section.id} content={content} />;
      default:
        return null;
    }
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No blocks added yet. Add a block to see preview.</p>
      </div>
    );
  }

  return <div className="space-y-0">{sections.map((section) => renderSection(section))}</div>;
}

// ============================================================================
// Section Renderers
// ============================================================================

function HeroSection({
  content,
  navigate,
  settings,
}: {
  content: Record<string, any>;
  navigate: any;
  settings: SiteSettings;
}) {
  const headline = content.headline || 'Welcome';
  const headlineHighlight = content.headline_highlight || '';
  const subheadline = content.subheadline || '';
  const ctaText = content.cta_text || 'Get Started';
  const ctaLink = content.cta_link || '/register';

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 py-20 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
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
        {subheadline && <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">{subheadline}</p>}
        {ctaText && (
          <button
            onClick={() => navigate(ctaLink)}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 font-semibold"
            style={{ backgroundColor: settings?.primary_color || '#2563EB' }}
          >
            {ctaText}
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturesSection({ content }: { content: Record<string, any> }) {
  const features = content.features || [];

  if (features.length === 0) return null;

  return (
    <div className="w-full bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature: any, index: number) => (
            <div key={index} className="bg-gray-50 rounded-lg p-6">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mb-3 ${feature.icon_bg_color || 'bg-blue-100'}`}>
                <div className={`text-2xl ${feature.icon_color || 'text-blue-600'}`}>📄</div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title || 'Feature'}</h3>
              <p className="text-sm text-gray-600">{feature.description || ''}</p>
            </div>
          ))}
        </div>
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
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-4';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
    if (count === 5 || count === 6) return 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4';
    // 7+ steps: wrap intelligently
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  };

  return (
    <div className="w-full bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">{title}</h2>}
        <div className={getGridClass(steps.length)}>
          {steps.map((step: any, index: number) => (
            <div key={index} className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                {step.number || index + 1}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{step.label || `Step ${index + 1}`}</h3>
              <p className="text-xs text-gray-600">{step.description || ''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoriesSection({ content }: { content: Record<string, any> }) {
  const title = content.title || '';
  const categories = content.categories || [];

  if (categories.length === 0) return null;

  return (
    <div className="w-full bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">{title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((category: string, index: number) => (
            <div key={index} className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-900 font-medium">{category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CTASection({ content, navigate }: { content: Record<string, any>; navigate: any }) {
  if (!content) return null;

  const bgColor = content.background_color || '#2563EB';
  const heading = content.heading || '';
  const description = content.description || '';
  const buttonText = content.button_text || null;
  const buttonLink = content.button_link || null;

  if (!heading && !description && (!buttonText || !buttonLink)) return null;

  const isTailwindClass = bgColor.includes('bg-') || bgColor.includes('from-') || bgColor.includes('to-') || bgColor.includes('gradient');
  const classNames = isTailwindClass ? `py-12 text-center text-white ${bgColor}` : 'py-12 text-center text-white';

  return (
    <div className="w-full" style={!isTailwindClass ? { backgroundColor: bgColor } : {}}>
      <div className={classNames}>
        <div className="max-w-2xl mx-auto px-4">
          {heading && <h2 className="text-3xl font-bold mb-3">{heading}</h2>}
          {description && <p className="text-base mb-6 opacity-90">{description}</p>}
          {buttonText && buttonLink && (
            <button
              onClick={() => navigate(buttonLink)}
              className="inline-block px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-semibold transition-colors text-sm"
            >
              {buttonText}
            </button>
          )}
        </div>
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
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-4';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 gap-4';
    // 5+ images: responsive grid
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
  };

  const renderImage = (image: any, index: number) => {
    const isSingleImage = images.length === 1;
    const heightClass = isSingleImage ? 'h-64' : 'h-48';
    const widthClass = isSingleImage ? 'max-w-sm' : '';
    const aspectRatio = isSingleImage ? '4/3' : '16/10';
    const offsetX = image.offset_x || 50;
    const offsetY = image.offset_y || 50;

    return (
      <div key={index} className={`rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 ${widthClass}`}>
        <div className={`${heightClass} w-full bg-gray-100`} style={{ aspectRatio }}>
          <img
            src={image.url}
            alt={image.alt_text}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${offsetX}% ${offsetY}%`,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
        {image.caption && <p className="p-3 text-gray-700 text-center text-sm">{image.caption}</p>}
      </div>
    );
  };

  return (
    <div className="w-full bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">{title}</h2>}
        <div className={getGridClass(images.length)}>
          {images.map((image: any, index: number) => renderImage(image, index))}
        </div>
      </div>
    </div>
  );
}

function ShowcaseSection({ content }: { content: Record<string, any> }) {
  const title = content.title || '';
  const items = content.items || [];

  if (items.length === 0) return null;

  const renderItem = (item: any, index: number) => {
    const imagePosition = item.image_position || 'center';
    const positionClass = imagePosition === 'left' ? 'justify-start' : imagePosition === 'right' ? 'justify-end' : 'justify-center';

    return (
      <div key={index} className="bg-white rounded-lg overflow-hidden shadow-md p-6">
        {item.image_url && (
          <div className={`flex items-center ${positionClass} bg-gray-100 rounded-lg mb-4 h-40`}>
            <img
              src={item.image_url}
              alt={item.title}
              style={{
                width: `${item.image_width || 300}px`,
                height: `${item.image_height || 300}px`,
                objectFit: 'cover'
              }}
              className="rounded-lg"
            />
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title || 'Item'}</h3>
        <p className="text-sm text-gray-600">{item.description || ''}</p>
      </div>
    );
  };

  return (
    <div className="w-full bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {title && <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">{title}</h2>}
        {/* Dynamic grid based on item count */}
        {items.length === 1 ? (
          <div className="flex justify-center">
            {items.map((item: any, index: number) => renderItem(item, index))}
          </div>
        ) : items.length === 2 ? (
          <div className="flex justify-center gap-6 flex-wrap">
            {items.map((item: any, index: number) => renderItem(item, index))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item: any, index: number) => renderItem(item, index))}
          </div>
        )}
      </div>
    </div>
  );
}
