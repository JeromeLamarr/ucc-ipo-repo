import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Shield, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { PublicNavigation } from '../components/PublicNavigation';
import { Footer } from '../components/Footer';
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
  const { siteName, primaryColor } = useBranding();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [cmsAvailable, setCmsAvailable] = useState(false);

  // Update settings when branding changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      site_name: siteName,
      primary_color: primaryColor,
    }));
  }, [siteName, primaryColor]);

  useEffect(() => {
    const fetchHomePage = async () => {
      try {
        setLoading(true);

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
      case 'text-section':
        return <TextSectionRenderer key={section.id} content={content} />;
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
      <div className="pt-16">
        {sections.map((section) => renderSection(section))}
        <Footer />
      </div>
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
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="absolute top-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 1000">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-200" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="1000" height="1000" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative Gradient Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-50 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse"></div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center">
          {/* Main Headline with Strong Emphasis */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-tight tracking-tighter">
            <div className="flex flex-col gap-3 items-center justify-center">
              <span className="block">{headline}</span>
              {headlineHighlight && (
                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
                  {headlineHighlight}
                </span>
              )}
            </div>
          </h1>
          
          {/* Subtitle with Enhanced Styling */}
          <p className="text-lg md:text-2xl text-gray-700 max-w-3xl mx-auto mb-14 leading-relaxed font-light">
            {subheadline}
          </p>

          {/* Enhanced CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <button
              onClick={() => navigate(ctaLink)}
              className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {ctaText}
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-5 bg-white text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 text-lg font-bold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </button>
          </div>

          {/* Trust Indicator */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-medium mb-6">Trusted by leading academic institutions</p>
            <div className="flex justify-center items-center gap-8 flex-wrap opacity-70">
              <span className="text-2xl font-bold text-gray-400">UCC</span>
              <span className="text-2xl font-bold text-gray-400">•</span>
              <span className="text-sm font-semibold text-gray-500">Secure & Reliable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection({ content }: { content: Record<string, any> }) {
  const features = content.features || [];

  return (
    <div className="w-full bg-gradient-to-b from-white via-blue-50 to-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature: any, index: number) => (
            <div 
              key={index} 
              className="group h-full flex flex-col bg-white rounded-2xl shadow-md hover:shadow-2xl p-8 transition-all duration-300 hover:-translate-y-2 border border-gray-100 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500"
            >
              {/* Icon Container with Colored Circle */}
              <div className="mb-8 relative">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                  feature.icon_bg_color || 'bg-gradient-to-br from-blue-500 to-indigo-600'
                } shadow-lg group-hover:shadow-xl`}>
                  <div className="text-4xl">{feature.icon || '📄'}</div>
                </div>
              </div>

              {/* Content - Flex grow for equal heights */}
              <div className="flex-grow">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-base">{feature.description}</p>
              </div>

              {/* Bottom accent line */}
              <div className="mt-6 pt-6 border-t border-gray-100 group-hover:border-blue-300 transition-colors">
                <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all duration-300 gap-1">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
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
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
    if (count === 5 || count === 6) return 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6';
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  return (
    <div className="w-full bg-gradient-to-b from-white to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">{title}</h2>}
        <div className={getGridClass(steps.length)}>
          {steps.map((step: any, index: number) => (
            <div 
              key={index} 
              className="group text-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100 hover:border-blue-200"
            >
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-6 text-xl font-bold shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all">
                  {step.number || index + 1}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{step.label || `Step ${index + 1}`}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.description || ''}</p>
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

  return (
    <div className="w-full bg-gradient-to-b from-blue-50 via-white to-indigo-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-gray-900">{title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category: string, index: number) => (
            <div 
              key={index} 
              className="group text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border border-gray-100 hover:border-blue-300 cursor-pointer"
            >
              <p className="text-gray-900 font-semibold group-hover:text-blue-600 transition-colors">{category}</p>
            </div>
          ))}
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
  const classNames = isTailwindClass ? `py-20 text-center text-white ${bgColor}` : 'py-20 text-center text-white bg-gradient-to-r from-blue-600 to-indigo-600';

  return (
    <div
      className={classNames}
      style={!isTailwindClass ? { backgroundColor: bgColor } : {}}
    >
      <div className="max-w-3xl mx-auto px-4">
        {heading && (
          <h2 className="text-5xl font-bold mb-6 leading-tight tracking-tight">{heading}</h2>
        )}
        {description && (
          <p className="text-lg mb-10 opacity-95 leading-relaxed">{description}</p>
        )}
        {buttonText && buttonLink && (
          <button
            onClick={() => navigate(buttonLink)}
            className="inline-block px-10 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
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
    const offsetX = image.offset_x || 50;
    const offsetY = image.offset_y || 50;

    return (
      <div 
        key={index} 
        className={`group rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-200 hover:border-blue-300 ${widthClass}`}
      >
        <div className={`${heightClass} w-full bg-gray-100 relative overflow-hidden`} style={{ aspectRatio }}>
          <img
            src={image.url}
            alt={image.alt_text || `Gallery image ${index + 1}`}
            className="w-full h-full object-cover group-hover:filter group-hover:brightness-110 transition-all duration-300"
            style={{
              objectPosition: `${offsetX}% ${offsetY}%`,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
        {image.caption && (
          <p className="p-4 text-gray-700 text-center text-sm font-medium">{image.caption}</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-gradient-to-b from-white to-blue-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {title && <h2 className="text-4xl md:text-5xl font-bold text-center mb-14 text-gray-900">{title}</h2>}
        <div className={getGridClass(images.length)}>
          {images.map((image: any, index: number) => renderImage(image, index))}
        </div>
      </div>
    </div>
  );
}

function TextSectionRenderer({ content }: { content: Record<string, any> }) {
  if (!content) {
    console.warn('TextSectionRenderer: Missing content prop');
    return null;
  }

  const title = content.section_title || '';
  const body = content.body_content || '';
  const alignment = content.text_alignment || 'left';
  const maxWidth = content.max_width || 'normal';
  const bgStyle = content.background_style || 'none';
  const showDivider = content.show_divider || false;

  const bgClasses: Record<string, string> = {
    none: 'bg-white',
    light_gray: 'bg-gray-50',
    soft_blue: 'bg-blue-50',
  };

  const widthClasses: Record<string, string> = {
    narrow: 'max-w-2xl',
    normal: 'max-w-4xl',
    wide: 'max-w-6xl',
  };

  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
  };

  return (
    <div className={`w-full py-16 px-4 sm:px-6 lg:px-8 ${bgClasses[bgStyle]}`}>
      {showDivider && <div className="mb-12 border-t border-gray-200"></div>}
      
      <div className={`mx-auto ${widthClasses[maxWidth]}`}>
        {title && (
          <h2 className={`text-3xl font-bold mb-8 text-gray-900 ${alignClasses[alignment]}`}>
            {title}
          </h2>
        )}
        
        <div className={`prose prose-lg max-w-none ${alignClasses[alignment]}`}>
          {body.split('\n\n').map((paragraph: string, idx: number) => (
            <p key={idx} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {showDivider && <div className="mt-12 border-b border-gray-200"></div>}
    </div>
  );
}

// ============================================================================
// Default Landing Page (Fallback)
// ============================================================================

function DefaultLandingPage({ navigate, settings }: { navigate: any; settings: SiteSettings }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <PublicNavigation />
      <div className="pt-16">
        {/* Hero Section */}
        <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-30">
            <svg className="absolute top-0 left-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 1000">
              <defs>
                <pattern id="grid-default" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-200" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="1000" height="1000" fill="url(#grid-default)" />
            </svg>
          </div>

          {/* Decorative Gradient Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-blue-50 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-pulse"></div>
          
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
            <div className="text-center">
              {/* Main Headline with Strong Emphasis */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 mb-8 leading-tight tracking-tighter">
                <div className="flex flex-col gap-3 items-center justify-center">
                  <span className="block">University Intellectual<br/>Property</span>
                  <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
                    Management System
                  </span>
                </div>
              </h1>
              
              {/* Subtitle with Enhanced Styling */}
              <p className="text-lg md:text-2xl text-gray-700 max-w-3xl mx-auto mb-14 leading-relaxed font-light">
                Streamline your intellectual property submissions, evaluations, and approvals with our comprehensive management platform.
              </p>

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                <button
                  onClick={() => navigate('/register')}
                  className="group relative px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                
                <button
                  onClick={() => navigate('/login')}
                  className="px-10 py-5 bg-white text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 text-lg font-bold transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In
                </button>
              </div>

              {/* Trust Indicator */}
              <div className="mt-16 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-600 font-medium mb-6">Trusted by leading academic institutions</p>
                <div className="flex justify-center items-center gap-8 flex-wrap opacity-70">
                  <span className="text-2xl font-bold text-gray-400">UCC</span>
                  <span className="text-2xl font-bold text-gray-400">•</span>
                  <span className="text-sm font-semibold text-gray-500">Secure & Reliable</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Features Section */}
      <div className="w-full bg-gradient-to-b from-white via-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group h-full flex flex-col bg-white rounded-2xl shadow-md hover:shadow-2xl p-8 transition-all duration-300 hover:-translate-y-2 border border-gray-100 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500">
              <div className="mb-8 relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <div className="text-4xl">📄</div>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">Easy Submissions</h3>
                <p className="text-gray-600 leading-relaxed text-base">Submit with streamlined forms and document uploads.</p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 group-hover:border-blue-300 transition-colors">
                <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all duration-300 gap-1">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="group h-full flex flex-col bg-white rounded-2xl shadow-md hover:shadow-2xl p-8 transition-all duration-300 hover:-translate-y-2 border border-gray-100 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500">
              <div className="mb-8 relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <div className="text-4xl">🛡️</div>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">Secure Workflow</h3>
                <p className="text-gray-600 leading-relaxed text-base">Multi-level review process ensures quality.</p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 group-hover:border-blue-300 transition-colors">
                <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all duration-300 gap-1">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="group h-full flex flex-col bg-white rounded-2xl shadow-md hover:shadow-2xl p-8 transition-all duration-300 hover:-translate-y-2 border border-gray-100 hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500">
              <div className="mb-8 relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <div className="text-4xl">📈</div>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">Track Progress</h3>
                <p className="text-gray-600 leading-relaxed text-base">Monitor status and generate certificates.</p>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 group-hover:border-blue-300 transition-colors">
                <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all duration-300 gap-1">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      </div>
    </div>
  );
}
