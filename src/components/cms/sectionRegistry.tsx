import { useState } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { sectionStyleToClasses } from './cmsStyles';
import type { SectionStyle } from './cmsStyles';

export interface CmsSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
  style?: Record<string, any> | null;
}

export interface CmsBranding {
  primaryColor: string;
  secondaryColor: string;
  siteName: string;
}

export interface SectionTypeInfo {
  value: string;
  label: string;
  description: string;
}

export const supportedSectionTypes: SectionTypeInfo[] = [
  { value: 'hero', label: 'Hero Section', description: 'Large banner with headline and CTA' },
  { value: 'features', label: 'Features Grid', description: 'Showcase your key features' },
  { value: 'showcase', label: 'Showcase', description: 'Display items in a grid showcase format' },
  { value: 'steps', label: 'Steps / Process', description: 'Show a step-by-step process' },
  { value: 'categories', label: 'Categories', description: 'Display categories or services' },
  { value: 'text-section', label: 'Text Section', description: 'Display informational text content' },
  { value: 'gallery', label: 'Image Gallery', description: 'Display multiple images' },
  { value: 'cta', label: 'Call to Action', description: 'Highlight CTA banner' },
  { value: 'tabs', label: 'Tabs', description: 'Tabbed content with bullet support' },
  { value: 'benefits', label: 'Features / Benefits', description: 'Grid of benefit cards with title and description' },
  { value: 'faq', label: 'FAQ', description: 'Accordion-style frequently asked questions' },
];

export interface SectionValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateSection(section: CmsSection): SectionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!section.section_type) {
    errors.push('Section type is required');
    return { errors, warnings };
  }

  const known = supportedSectionTypes.map(t => t.value);
  if (!known.includes(section.section_type)) {
    warnings.push(`Unknown section type "${section.section_type}" — it will not render`);
  }

  const content = section.content || {};

  switch (section.section_type) {
    case 'hero':
      if (!content.headline) warnings.push('Hero: headline is empty');
      break;
    case 'features':
      if (!Array.isArray(content.features) || content.features.length === 0)
        errors.push('Features: at least one feature is required');
      break;
    case 'showcase':
      if (!Array.isArray(content.items) || content.items.length === 0)
        errors.push('Showcase: at least one item is required');
      break;
    case 'steps':
      if (!Array.isArray(content.steps) || content.steps.length === 0)
        errors.push('Steps: at least one step is required');
      break;
    case 'categories':
      if (!Array.isArray(content.categories) || content.categories.length === 0)
        errors.push('Categories: at least one category is required');
      break;
    case 'gallery':
      if (!Array.isArray(content.images) || content.images.length === 0)
        errors.push('Gallery: at least one image is required');
      break;
    case 'tabs':
      if (!Array.isArray(content.tabs) || content.tabs.length === 0)
        errors.push('Tabs: at least one tab is required');
      break;
    case 'benefits':
      if (!Array.isArray(content.items) || content.items.length === 0)
        errors.push('Benefits: at least one item is required');
      break;
    case 'faq':
      if (!Array.isArray(content.items) || content.items.length === 0)
        errors.push('FAQ: at least one item is required');
      break;
  }

  return { errors, warnings };
}

export function getDefaultContent(sectionType: string): Record<string, any> {
  switch (sectionType) {
    case 'hero':
      return {
        headline: 'Welcome',
        headline_highlight: 'to our site',
        subheadline: 'Add your description here',
        cta_text: 'Get Started',
        cta_link: '/register',
        hero_style: {},
      };
    case 'features':
      return {
        features: [
          { title: 'Feature 1', subtitle: '', description: 'Description', icon_bg_color: 'bg-blue-100', icon_color: 'text-blue-600' },
        ],
      };
    case 'showcase':
      return {
        title: 'Showcase',
        subtitle: '',
        items: [
          { title: 'Item 1', subtitle: '', description: 'Description', image_url: '', link_url: '', tags: [], status: '' },
        ],
      };
    case 'gallery':
      return { title: 'Gallery', subtitle: '', images: [] };
    case 'steps':
      return {
        title: '',
        steps: [{ number: 1, label: 'Step 1', description: 'Description' }],
      };
    case 'categories':
      return { title: '', categories: ['Category 1'] };
    case 'cta':
      return {
        heading: 'Ready to get started?',
        description: 'Take action now',
        button_text: 'Click Here',
        button_link: '/register',
      };
    case 'text-section':
      return {
        section_title: 'Section Title',
        body_content: 'Add your content here.',
        text_alignment: 'left',
        max_width: 'normal',
        background_style: 'none',
        show_divider: false,
        vertical_spacing: 'normal',
        layout: 'single',
        grid_cols: '2',
        grid_gap: 'gap-8',
        blocks: [],
      };
    case 'tabs':
      return { title: '', tabs: [{ title: 'Tab 1', content: 'Tab content goes here.' }] };
    case 'benefits':
      return {
        title: 'Why Use UCC-IPO?',
        subtitle: 'Designed to simplify intellectual property registration, monitoring, and record management for the university community.',
        items: [
          { title: 'Centralized IP Record Management', description: 'Store and organize intellectual property submissions in one secure and accessible platform.' },
          { title: 'Easy Submission Process', description: 'Allow students, faculty, and researchers to submit intellectual property details and supporting documents efficiently.' },
          { title: 'Status Tracking and Monitoring', description: 'Let applicants monitor the progress of their submissions and stay informed throughout the review process.' },
          { title: 'Secure Document Handling', description: 'Manage sensitive files and records with controlled access and role-based permissions.' },
          { title: 'Faster Administrative Review', description: 'Help administrators and assigned personnel review, validate, and process submissions more efficiently.' },
          { title: 'Improved Transparency and Accessibility', description: 'Provide a clearer, more transparent workflow for intellectual property registration and documentation.' },
        ],
      };
    case 'faq':
      return {
        title: 'Frequently Asked Questions',
        subtitle: 'Quick answers to common questions about using the UCC-IPO platform.',
        items: [
          { question: 'Who can use the UCC-IPO platform?', answer: 'Students, faculty members, researchers, and authorized university personnel may use the platform based on their assigned roles and permissions.' },
          { question: 'What types of intellectual property can be submitted?', answer: 'The platform may accommodate various intellectual property records such as copyright, patent-related works, utility models, industrial designs, trademarks, and other university-recognized submissions.' },
          { question: 'Do I need supporting documents when submitting?', answer: 'Yes. Applicants should provide the required supporting files and relevant documentation to help validate and process the submission properly.' },
          { question: 'Can I track the status of my submission?', answer: 'Yes. The system allows users to monitor submission progress and receive updates during the review and documentation process.' },
          { question: 'Is my submitted information secure?', answer: 'Yes. The platform is designed with role-based access control and secure record handling to protect sensitive intellectual property information.' },
          { question: 'Can I update my submission after sending it?', answer: 'This depends on the submission status and system rules. In some cases, updates may only be allowed before the review process is finalized.' },
        ],
      };
    default:
      return {};
  }
}

function getIconComponent(iconName: string): React.ReactNode {
  const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
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
  const Icon = iconMap[iconName];
  if (!Icon) return <AlertCircle size={24} />;
  return <Icon size={24} />;
}

interface SimpleButton {
  type?: 'simple' | undefined;
  text: string;
  link: string;
}
interface DropdownItem { text: string; link: string }
interface DropdownButton { type: 'dropdown'; label: string; items: DropdownItem[] }
type CMSButtonType = SimpleButton | DropdownButton;

function CMSButton({
  button,
  bgColor = '#2563EB',
  textColor = 'text-white',
}: {
  button: CMSButtonType;
  bgColor?: string;
  textColor?: string;
}): React.ReactElement | null {
  if (!button) return null;

  if (button.type !== 'dropdown') {
    const b = button as SimpleButton;
    return (
      <a
        href={b.link || '#'}
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow transition-opacity hover:opacity-90 ${textColor}`}
        style={{ backgroundColor: bgColor }}
      >
        {b.text || 'Click here'}
        <ExternalLink size={14} />
      </a>
    );
  }

  const db = button as DropdownButton;
  const items = Array.isArray(db.items) ? db.items : [];
  return (
    <div className="relative group inline-block">
      <button
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow transition-opacity hover:opacity-90 ${textColor}`}
        style={{ backgroundColor: bgColor }}
      >
        {db.label || 'Menu'}
        <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {items.map((item, idx) => (
          <a
            key={idx}
            href={item.link || '#'}
            className="block px-4 py-3 text-gray-800 hover:bg-gray-50 hover:text-blue-600 transition-colors first:rounded-t-lg last:rounded-b-lg text-sm"
          >
            {item.text || `Item ${idx + 1}`}
          </a>
        ))}
      </div>
    </div>
  );
}

const HEADLINE_SIZE_MAP: Record<string, string> = {
  sm: 'text-2xl', md: 'text-3xl', lg: 'text-4xl', xl: 'text-5xl', '2xl': 'text-6xl',
};
const SUB_SIZE_MAP: Record<string, string> = {
  sm: 'text-sm', md: 'text-base', lg: 'text-lg',
};

function HeroSection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const headline = content.headline || 'Welcome';
  const highlight = content.headline_highlight || '';
  const subheadline = content.subheadline || '';
  const bgImage = content.background_image || null;
  const imageLayout = content.image_layout || 'default';
  const imageWidth = content.image_width || 400;
  const imageHeight = content.image_height || 300;
  const imagePosition = content.image_position || 'center';
  const overlay = content.image_overlay || 0;
  const primary = branding.primaryColor;
  const hs = content.hero_style || {};

  const headlineSizeClass = HEADLINE_SIZE_MAP[hs.headlineSize] || 'text-4xl sm:text-5xl';
  const highlightSizeClass = HEADLINE_SIZE_MAP[hs.highlightSize] || headlineSizeClass;
  const subSizeClass = SUB_SIZE_MAP[hs.subheadlineSize] || 'text-xl';

  const button: CMSButtonType = content.button || {
    text: content.cta_text || 'Get Started',
    link: content.cta_link || '/register',
  };

  const headlineEl = (
    <h1 className={`${headlineSizeClass} font-bold mb-6 leading-tight`} style={{ color: hs.headlineColor || '#111827' }}>
      {headline}
      {highlight && (
        <><br /><span className={highlightSizeClass} style={{ color: hs.highlightColor || primary }}>{highlight}</span></>
      )}
    </h1>
  );

  const headlineWhiteEl = (
    <h1 className={`${headlineSizeClass} font-bold mb-6 leading-tight drop-shadow-lg`} style={{ color: hs.headlineColor || '#ffffff' }}>
      {headline}
      {highlight && (
        <><br /><span className={highlightSizeClass} style={{ color: hs.highlightColor || primary }}>{highlight}</span></>
      )}
    </h1>
  );

  if (bgImage && imageLayout === 'full-width') {
    return (
      <div
        className="relative py-24 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundPosition: imagePosition === 'top' ? 'center top' : imagePosition === 'bottom' ? 'center bottom' : 'center center',
        }}
      >
        {overlay > 0 && (
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlay / 100})` }} />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {headlineWhiteEl}
          {subheadline && (
            <p className={`${subSizeClass} max-w-3xl mx-auto mb-8 opacity-90`} style={{ color: hs.subheadlineColor || '#ffffff' }}>
              {subheadline}
            </p>
          )}
          <CMSButton button={button} bgColor={primary} />
        </div>
      </div>
    );
  }

  if (bgImage && (imageLayout === 'grid-left' || imageLayout === 'grid-right')) {
    const imgEl = (
      <div className="flex justify-center">
        <img src={bgImage} alt="Hero" style={{ width: imageWidth, height: imageHeight, objectFit: 'cover' }} className="rounded-xl shadow-lg" />
      </div>
    );
    const txtEl = (
      <div>
        {headlineEl}
        {subheadline && (
          <p className={`${subSizeClass} mb-8`} style={{ color: hs.subheadlineColor || '#4B5563' }}>
            {subheadline}
          </p>
        )}
        <CMSButton button={button} bgColor={primary} />
      </div>
    );
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {imageLayout === 'grid-left' ? <>{imgEl}{txtEl}</> : <>{txtEl}{imgEl}</>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      {headlineEl}
      {subheadline && (
        <p className={`${subSizeClass} max-w-3xl mx-auto mb-8`} style={{ color: hs.subheadlineColor || '#4B5563' }}>
          {subheadline}
        </p>
      )}
      <CMSButton button={button} bgColor={primary} />
    </div>
  );
}

function FeaturesSection({ content, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const features = Array.isArray(content.features) ? content.features : [];
  if (features.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{content.title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f: any, i: number) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {f.icon && (
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${f.icon_bg_color || 'bg-blue-50'}`}>
                <span className={f.icon_color || 'text-blue-600'}>{getIconComponent(f.icon)}</span>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{f.title || `Feature ${i + 1}`}</h3>
            {f.subtitle && <p className="text-sm font-medium text-gray-500 mb-2">{f.subtitle}</p>}
            {f.description && <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseSection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const items = Array.isArray(content.items) ? content.items : [];
  if (items.length === 0) {
    if (import.meta.env.DEV) console.warn('ShowcaseSection: no items in content', content);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-gray-400 text-sm">Showcase section has no items yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && (
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{content.title}</h2>
      )}
      {content.subtitle && (
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">{content.subtitle}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item: any, i: number) => {
          if (!item || typeof item !== 'object') return null;
          const linkHref = item.link_url || item.link || null;
          const itemButton: CMSButtonType | null = item.button || (linkHref ? { text: 'Learn more', link: linkHref } : null);
          const tags: string[] = Array.isArray(item.tags) ? item.tags : (item.tags ? [item.tags] : []);
          const CardWrapper = linkHref && !item.button
            ? ({ children }: { children: React.ReactNode }) => (
                <a href={linkHref} className="block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {children}
                </a>
              )
            : ({ children }: { children: React.ReactNode }) => (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {children}
                </div>
              );
          return (
            <CardWrapper key={i}>
              {item.image_url && (
                <div className="h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title || `Item ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  {item.title && (
                    <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  )}
                  {item.status && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">{item.status}</span>
                  )}
                </div>
                {item.subtitle && (
                  <p className="text-sm font-medium text-gray-500 mb-2">{item.subtitle}</p>
                )}
                {item.description && (
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">{item.description}</p>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {tags.map((tag: string, ti: number) => (
                      <span key={ti} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                {itemButton && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <CMSButton button={itemButton} bgColor={branding.primaryColor} />
                  </div>
                )}
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}

function StepsSection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const steps = Array.isArray(content.steps) ? content.steps : [];
  if (steps.length === 0) return null;

  const gridCols =
    steps.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
    steps.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
    steps.length === 4 ? 'grid-cols-2 lg:grid-cols-4' :
    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {content.title && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{content.title}</h2>}
        <div className={`grid ${gridCols} gap-6`}>
          {steps.map((step: any, i: number) => (
            <div key={i} className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {step.number || i + 1}
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{step.label || step.title || `Step ${i + 1}`}</h4>
              {step.description && <p className="text-sm text-gray-600">{step.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoriesSection({ content, sectionStyle: _ss }: { content: Record<string, any>; sectionStyle?: SectionStyle | null }) {
  const categories = Array.isArray(content.categories) ? content.categories : [];
  if (categories.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      {content.title && <h2 className="text-3xl font-bold text-gray-900 mb-8">{content.title}</h2>}
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((cat: any, i: number) => (
          <span key={i} className="px-5 py-2 bg-white border border-gray-200 rounded-full shadow-sm text-gray-700 font-medium hover:border-blue-300 transition-colors">
            {typeof cat === 'string' ? cat : cat.name || `Category ${i + 1}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function CTASection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const bg = content.background_color || branding.primaryColor;
  const bgImage = content.background_image || null;
  const heading = content.heading || '';
  const desc = content.description || '';
  const button: CMSButtonType | null = content.button || (content.button_text ? {
    text: content.button_text,
    link: content.button_link || '#',
  } : null);

  if (!heading && !desc && !button) return null;

  const wrapperStyle: React.CSSProperties = bgImage
    ? { backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: bg };

  return (
    <div className="relative py-16 text-center text-white" style={wrapperStyle}>
      {bgImage && <div className="absolute inset-0 bg-black/40" />}
      <div className="relative max-w-3xl mx-auto px-4">
        {heading && <h2 className="text-3xl sm:text-4xl font-bold mb-4">{heading}</h2>}
        {desc && <p className="text-lg mb-8 opacity-90">{desc}</p>}
        {button && <CMSButton button={button} bgColor="white" textColor="text-gray-900" />}
      </div>
    </div>
  );
}

function GallerySection({ content, sectionStyle: _ss }: { content: Record<string, any>; sectionStyle?: SectionStyle | null }) {
  const images = Array.isArray(content.images) ? content.images : [];
  if (images.length === 0) return null;

  const cols =
    images.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' :
    images.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto' :
    images.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && (
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">{content.title}</h2>
      )}
      {content.subtitle && (
        <p className="text-gray-500 text-center mb-10 max-w-2xl mx-auto">{content.subtitle}</p>
      )}
      {content.title && !content.subtitle && <div className="mb-10" />}
      <div className={`grid ${cols} gap-4 lg:gap-6`}>
        {images.map((img: any, i: number) => {
          if (!img?.url) return null;
          const hasFooter = img.caption || img.subtitle;
          return (
            <div key={i} className="rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="h-48 sm:h-56 bg-gray-100">
                <img
                  src={img.url}
                  alt={img.alt_text || img.caption || `Image ${i + 1}`}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${img.offset_x ?? 50}% ${img.offset_y ?? 50}%` }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="16" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              {hasFooter && (
                <div className="px-3 py-2 bg-white text-center">
                  {img.caption && <p className="text-sm text-gray-700 font-medium">{img.caption}</p>}
                  {img.subtitle && <p className="text-xs text-gray-400 mt-0.5">{img.subtitle}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextSectionRenderer({ content, sectionStyle }: { content: Record<string, any>; sectionStyle?: SectionStyle | null }) {
  const title = content.section_title || '';
  const body = content.body_content || '';
  const resolvedAlign = sectionStyle?.align ?? (content.text_alignment === 'center' ? 'center' : 'left');
  const alignment = resolvedAlign === 'center' ? 'text-center' : resolvedAlign === 'right' ? 'text-right' : 'text-left';
  const maxWidthMap: Record<string, string> = { narrow: 'max-w-2xl', normal: 'max-w-4xl', wide: 'max-w-6xl', full: 'max-w-none' };
  const maxWidth = maxWidthMap[content.max_width] || 'max-w-4xl';
  const bgMap: Record<string, string> = {
    none: 'bg-white',
    light_gray: 'bg-gray-50',
    soft_blue: 'bg-blue-50',
    soft_yellow: 'bg-yellow-50',
    dark: 'bg-gray-900',
  };
  const bg = bgMap[content.background_style] || 'bg-white';
  const isDark = content.background_style === 'dark';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-700';
  const titleColor = isDark ? 'text-white' : 'text-gray-900';
  const spacingMap: Record<string, string> = { compact: 'py-8', normal: 'py-16', spacious: 'py-24' };
  const spacing = spacingMap[content.vertical_spacing] || 'py-16';

  const blocks: any[] = Array.isArray(content.blocks) && content.blocks.length > 0 ? content.blocks : [];
  const layout = content.layout || 'single';

  const gridColsMap: Record<string, string> = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  const gridGap = content.grid_gap || 'gap-8';
  const gridCols = gridColsMap[content.grid_cols || '2'] || 'grid-cols-1 sm:grid-cols-2';

  const renderBody = (text: string) => (
    <div className={`space-y-4 ${alignment}`}>
      {text.split('\n\n').filter(Boolean).map((p: string, i: number) => (
        <p key={i} className={`leading-relaxed ${textColor}`}>{p}</p>
      ))}
    </div>
  );

  const renderBlock = (block: any, i: number) => (
    <div key={i} className={block.shape === 'card' ? `bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}` : ''}>
      {block.title && (
        <h3 className={`text-xl font-semibold mb-3 ${titleColor}`}>{block.title}</h3>
      )}
      {block.image_url && (
        <img
          src={block.image_url}
          alt={block.title || `Block ${i + 1}`}
          className={`w-full rounded-lg mb-4 object-cover ${block.image_height ? `h-${block.image_height}` : 'h-40'}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {block.content && renderBody(block.content)}
    </div>
  );

  return (
    <div className={`w-full px-4 sm:px-6 lg:px-8 ${spacing} ${bg}`}>
      {content.show_divider && <div className="mb-10 border-t border-gray-200" />}
      <div className={`mx-auto ${maxWidth}`}>
        {title && (
          <h2 className={`text-3xl font-bold mb-6 ${alignment} ${titleColor}`}>{title}</h2>
        )}
        {blocks.length > 0 ? (
          layout === 'grid' ? (
            <div className={`grid ${gridCols} ${gridGap}`}>
              {blocks.map((block, i) => renderBlock(block, i))}
            </div>
          ) : layout === 'side-by-side' ? (
            <div className={`flex flex-col md:flex-row gap-8`}>
              {blocks.map((block, i) => <div key={i} className="flex-1">{renderBlock(block, i)}</div>)}
            </div>
          ) : (
            <div className="space-y-8">
              {blocks.map((block, i) => renderBlock(block, i))}
            </div>
          )
        ) : (
          renderBody(body)
        )}
      </div>
      {content.show_divider && <div className="mt-10 border-b border-gray-200" />}
    </div>
  );
}

function TabsSection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const [active, setActive] = useState(0);
  const tabs = Array.isArray(content.tabs) ? content.tabs : [];
  if (tabs.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">{content.title}</h2>}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex flex-wrap gap-1 overflow-x-auto">
          {tabs.map((tab: any, i: number) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                active === i ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              style={active === i ? { borderBottomColor: branding.primaryColor, color: branding.primaryColor } : {}}
            >
              {tab.title || `Tab ${i + 1}`}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tabs.map((tab: any, i: number) => (
          <div key={i} className={active === i ? 'block' : 'hidden'}>
            <div className="space-y-3">
              {(tab.content || '').split('\n').map((line: string, j: number) => {
                if (!line.trim()) return <div key={j} className="h-1" />;
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                if (isBullet) {
                  return (
                    <div key={j} className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      <p className="text-gray-700 text-sm leading-relaxed">{line.trim().replace(/^[•-]\s*/, '')}</p>
                    </div>
                  );
                }
                return <p key={j} className="text-gray-700 leading-relaxed">{line}</p>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitsSection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const items = Array.isArray(content.items) ? content.items : [];
  if (items.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && (
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{content.title}</h2>
      )}
      {content.subtitle && (
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">{content.subtitle}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: branding.primaryColor + '1A' }}
            >
              <CheckCircle size={20} style={{ color: branding.primaryColor }} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title || `Benefit ${i + 1}`}</h3>
            {item.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSection({ content, branding, sectionStyle: _ss }: { content: Record<string, any>; branding: CmsBranding; sectionStyle?: SectionStyle | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = Array.isArray(content.items) ? content.items : [];
  if (items.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {content.title && (
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">{content.title}</h2>
      )}
      {content.subtitle && (
        <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">{content.subtitle}</p>
      )}
      <div className="space-y-3">
        {items.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i ? 'true' : 'false'}
            >
              <span className="font-semibold text-gray-900 pr-4 text-sm leading-snug">{item.question || `Question ${i + 1}`}</span>
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: branding.primaryColor + '1A',
                  transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14, color: branding.primaryColor }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {openIndex === i && (
              <div className="px-6 pb-5">
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-gray-600 text-sm leading-relaxed">{item.answer || ''}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnknownSection({ sectionType }: { sectionType: string }) {
  if (import.meta.env.DEV) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Unknown section type: <code className="font-mono">{sectionType}</code>
        </div>
      </div>
    );
  }
  return null;
}

export function renderCmsSection(section: CmsSection, branding: CmsBranding): React.ReactElement | null {
  if (!section?.section_type || !section?.content) {
    if (import.meta.env.DEV) console.warn('renderCmsSection: invalid section', section);
    return null;
  }

  const content = typeof section.content === 'object' ? section.content : {};
  const sectionStyle = section.style as SectionStyle | null | undefined;
  const styleClasses = sectionStyleToClasses(sectionStyle);

  const hasPrimaryBg = sectionStyle?.background === 'primary';

  const inner = (() => {
    switch (section.section_type) {
      case 'hero':
        return <HeroSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'features':
        return <FeaturesSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'showcase':
        return <ShowcaseSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'steps':
        return <StepsSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'categories':
        return <CategoriesSection content={content} sectionStyle={sectionStyle} />;
      case 'text-section':
        return <TextSectionRenderer content={content} sectionStyle={sectionStyle} />;
      case 'cta':
        return <CTASection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'gallery':
        return <GallerySection content={content} sectionStyle={sectionStyle} />;
      case 'tabs':
        return <TabsSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'benefits':
        return <BenefitsSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      case 'faq':
        return <FaqSection content={content} branding={branding} sectionStyle={sectionStyle} />;
      default:
        return <UnknownSection sectionType={section.section_type} />;
    }
  })();

  if (!sectionStyle || Object.keys(sectionStyle).length === 0) return inner;

  return (
    <div
      className={styleClasses.wrapper}
      style={hasPrimaryBg ? { backgroundColor: branding.primaryColor } : undefined}
    >
      {inner}
    </div>
  );
}
