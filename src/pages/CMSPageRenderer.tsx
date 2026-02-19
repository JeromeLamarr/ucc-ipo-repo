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
import { Footer } from '../components/Footer';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  layout?: Record<string, any>; // Grid layout configuration (JSONB)
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

/**
 * Button interface for simple link buttons
 */
interface SimpleButton {
  type?: 'simple' | undefined;
  text: string;
  link: string;
}

/**
 * Dropdown item interface for dropdown menus
 */
interface DropdownItem {
  text: string;
  link: string;
}

/**
 * Button interface for dropdown buttons
 */
interface DropdownButton {
  type: 'dropdown';
  label: string;
  items: DropdownItem[];
}

/**
 * Union type for all button types
 */
type CMSButtonType = SimpleButton | DropdownButton;

/**
 * CMSButton component - renders simple or dropdown buttons with Tailwind CSS
 * 
 * Props:
 * - button: Button configuration (SimpleButton or DropdownButton)
 * - bgColor: Background color for button (used for simple buttons)
 * - textColor: Text color for button (default: 'text-white')
 * - hoverClass: Hover effect class (default: 'hover:opacity-90')
 * 
 * Example usage:
 * // Simple button
 * <CMSButton button={{ text: 'Get Started', link: '/register' }} bgColor="#2563EB" />
 * 
 * // Dropdown button
 * <CMSButton 
 *   button={{
 *     type: 'dropdown',
 *     label: 'Actions',
 *     items: [
 *       { text: 'Register', link: '/register' },
 *       { text: 'Login', link: '/login' }
 *     ]
 *   }}
 *   bgColor="#2563EB"
 * />
 */
function CMSButton({
  button,
  bgColor = '#2563EB',
  textColor = 'text-white',
  hoverClass = 'hover:opacity-90',
}: {
  button: CMSButtonType;
  bgColor?: string;
  textColor?: string;
  hoverClass?: string;
}): React.ReactElement | null {
  // Defensive check: button must be provided
  if (!button) {
    if (import.meta.env.DEV) {
      console.warn('CMSButton: Missing button prop');
    }
    return null;
  }

  // Handle simple button (default type or explicit 'simple')
  if (button.type !== 'dropdown') {
    const simpleButton = button as SimpleButton;
    const text = simpleButton.text || 'Click here';
    const link = simpleButton.link || '#';

    return (
      <a
        href={link}
        className={`inline-block px-8 py-4 rounded-lg font-semibold shadow-lg transition-opacity ${textColor} ${hoverClass}`}
        style={{ backgroundColor: bgColor }}
      >
        {text}
      </a>
    );
  }

  // Handle dropdown button
  const dropdownButton = button as DropdownButton;
  const label = dropdownButton.label || 'Menu';
  const items = Array.isArray(dropdownButton.items) ? dropdownButton.items : [];

  if (items.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('CMSButton: Dropdown button has no items, rendering as simple button');
    }
    return (
      <button
        className={`inline-block px-8 py-4 rounded-lg font-semibold shadow-lg transition-opacity ${textColor} ${hoverClass}`}
        style={{ backgroundColor: bgColor }}
        disabled
      >
        {label}
      </button>
    );
  }

  return (
    <div className="relative group inline-block">
      {/* Dropdown trigger button */}
      <button
        className={`inline-block px-8 py-4 rounded-lg font-semibold shadow-lg transition-opacity ${textColor} ${hoverClass} flex items-center gap-2`}
        style={{ backgroundColor: bgColor }}
        aria-haspopup="true"
        aria-expanded="false"
        title={`${label} menu`}
      >
        {label}
        <svg
          className="w-4 h-4 transition-transform group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown menu (hidden by default, shown on hover) */}
      <div
        className="absolute left-0 mt-0 w-48 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="dropdown-button"
      >
        {items.map((item: DropdownItem, idx: number) => {
          // Ensure item is an object with text and link
          if (!item || typeof item !== 'object') {
            if (import.meta.env.DEV) {
              console.warn(`CMSButton: Invalid dropdown item at index ${idx}`);
            }
            return null;
          }

          const itemText = item.text || `Item ${idx + 1}`;
          const itemLink = item.link || '#';

          return (
            <a
              key={idx}
              href={itemLink}
              className="block px-4 py-3 text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
              role="menuitem"
            >
              {itemText}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Builds Tailwind CSS grid classes from layout configuration
 * Falls back to vertical layout if grid is disabled or configuration is invalid
 * 
 * @param layout Optional layout configuration from database
 * @returns Object with container class and wrapper class for grid layout
 * 
 * Example layout config:
 * {
 *   "grid": {
 *     "enabled": true,
 *     "columns": 3,
 *     "gap": "gap-6",
 *     "max_width": "max-w-7xl",
 *     "align": "center"
 *   }
 * }
 */
function buildGridClasses(layout?: Record<string, any>) {
  // Safe optional chaining: check if grid is enabled
  const gridEnabled = layout?.grid?.enabled === true;

  if (!gridEnabled) {
    // Fallback to vertical layout (existing behavior)
    return {
      containerClass: '',
      wrapperClass: '',
    };
  }

  try {
    // Extract grid configuration with safe optional chaining
    const columns = layout?.grid?.columns;
    const gap = layout?.grid?.gap;
    const maxWidth = layout?.grid?.max_width;
    const align = layout?.grid?.align;

    // Build grid container classes
    let gridClasses = 'grid';

    // Add columns if specified (use value directly, e.g., "grid-cols-3")
    if (columns && typeof columns === 'number') {
      gridClasses += ` grid-cols-${columns}`;
    }

    // Add gap if specified (use value directly, e.g., "gap-6")
    if (gap && typeof gap === 'string') {
      gridClasses += ` ${gap}`;
    }

    // Determine wrapper alignment and max-width
    let wrapperClass = '';
    if (maxWidth && typeof maxWidth === 'string') {
      wrapperClass = maxWidth;
    }
    
    // Add horizontal centering if align is "center"
    if (align === 'center' && maxWidth) {
      wrapperClass += ' mx-auto';
    }

    return {
      containerClass: gridClasses,
      wrapperClass: wrapperClass ? `${wrapperClass} px-4` : 'px-4',
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('buildGridClasses: Error parsing layout configuration, falling back to vertical layout', error);
    }
    // Fallback to vertical layout on any parsing error
    return {
      containerClass: '',
      wrapperClass: '',
    };
  }
}

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
        (() => {
          // Build grid layout classes based on page configuration
          const gridClasses = buildGridClasses(page?.layout);
          const isGridEnabled = gridClasses.containerClass !== '';

          return (
            <div className={isGridEnabled ? gridClasses.wrapperClass : ''}>
              <div className={isGridEnabled ? gridClasses.containerClass : ''}>
                {sections.map((section) => {
                  // Defensive checks for section object
                  if (!section || !section.id || !section.section_type || !section.content) {
                    if (import.meta.env.DEV) console.warn('CMSPageRenderer: Invalid section detected', section);
                    return null;
                  }
                  return (
                    <SectionRenderer key={section.id} section={section} settings={settings} />
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-gray-500">No content available for this page.</p>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

/**
 * Builds Tailwind CSS internal grid classes from internal_grid configuration
 * Used to override the default layout inside a section's content area
 * 
 * @param internalGrid Optional internal grid configuration from section.content.internal_grid
 * @returns String of Tailwind grid classes (e.g., "grid grid-cols-2 gap-4")
 * 
 * Example internal_grid config:
 * {
 *   "enabled": true,
 *   "columns": 2,
 *   "gap": "gap-4"
 * }
 * 
 * If enabled === false or undefined, returns empty string (uses default section layout)
 */
function buildInternalGridClasses(internalGrid?: Record<string, any>): string {
  // Check if internal grid is explicitly enabled
  if (!internalGrid || internalGrid.enabled !== true) {
    // Grid disabled: use section's default layout
    return '';
  }

  try {
    let classes = 'grid';

    // Apply columns if specified (e.g., grid-cols-2)
    const columns = internalGrid.columns;
    if (columns && typeof columns === 'number' && columns > 0 && columns <= 12) {
      classes += ` grid-cols-${columns}`;
    }

    // Apply gap if specified (e.g., gap-4, gap-6, gap-8)
    const gap = internalGrid.gap;
    if (gap && typeof gap === 'string') {
      classes += ` ${gap}`;
    }

    return classes.trim();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('buildInternalGridClasses: Error parsing internal_grid configuration, using default layout', error);
    }
    // Fallback to empty string (use default layout)
    return '';
  }
}

/**
 * InternalGrid Component
 * 
 * Wraps section content with optional grid layout
 * If internal_grid.enabled === true, applies grid classes to override default section layout
 * Otherwise, renders children as-is using the section's default layout
 * 
 * BACKWARD COMPATIBLE: If internal_grid is not defined or enabled is false, no grid is applied
 * ISOLATED: Changes are confined to the section's content area
 * 
 * Props:
 *   - children: Section content to render
 *   - internalGrid: Optional configuration from section.content.internal_grid
 */
interface InternalGridProps {
  children: React.ReactNode;
  internalGrid?: Record<string, any>;
}

function InternalGrid({ children, internalGrid }: InternalGridProps): React.ReactElement {
  const gridClasses = buildInternalGridClasses(internalGrid);

  // If internal grid is enabled, wrap children in grid
  if (gridClasses) {
    return <div className={gridClasses}>{children}</div>;
  }

  // Otherwise, render children as-is (default layout)
  return <>{children}</>;
}

/**
 * Builds Tailwind CSS grid positioning classes from section layout configuration
 * Applies col-span, row-span, align-self, and justify-self classes only if values exist
 * 
 * @param layout Optional layout configuration from section.content.layout
 * @returns String of Tailwind grid positioning classes
 * 
 * Example layout config:
 * {
 *   "col_span": 2,
 *   "row_span": 1,
 *   "align_self": "self-center",
 *   "justify_self": "justify-self-center"
 * }
 */
function buildSectionGridClasses(layout?: Record<string, any>): string {
  if (!layout || typeof layout !== 'object') {
    // Default: full width span for sections within grid
    return 'col-span-full';
  }

  try {
    let classes = '';

    // Apply col_span if specified (e.g., col-span-2)
    const colSpan = layout.col_span;
    if (colSpan && typeof colSpan === 'number' && colSpan > 0 && colSpan <= 12) {
      classes += `col-span-${colSpan} `;
    } else if (!layout.col_span) {
      // Default to full width only if col_span was not specified
      classes += 'col-span-full ';
    }

    // Apply row_span if specified (e.g., row-span-2)
    const rowSpan = layout.row_span;
    if (rowSpan && typeof rowSpan === 'number' && rowSpan > 0) {
      classes += `row-span-${rowSpan} `;
    }

    // Apply align_self if specified (e.g., self-center, self-start, self-end)
    const alignSelf = layout.align_self;
    if (alignSelf && typeof alignSelf === 'string') {
      const validAlignValues = ['self-start', 'self-center', 'self-end', 'self-stretch', 'self-auto'];
      if (validAlignValues.includes(alignSelf)) {
        classes += `${alignSelf} `;
      }
    }

    // Apply justify_self if specified (e.g., justify-self-start, center, end)
    const justifySelf = layout.justify_self;
    if (justifySelf && typeof justifySelf === 'string') {
      const validJustifyValues = [
        'justify-self-start',
        'justify-self-center',
        'justify-self-end',
        'justify-self-stretch',
        'justify-self-auto',
      ];
      if (validJustifyValues.includes(justifySelf)) {
        classes += `${justifySelf} `;
      }
    }

    return classes.trim();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('buildSectionGridClasses: Error parsing section layout, using default', error);
    }
    // Fallback to default col-span-full
    return 'col-span-full';
  }
}

/**
 * SectionWrapper Component
 * 
 * Wraps section content with grid positioning classes
 * Applies col-span, row-span, align-self, and justify-self from section.content.layout
 * Default behavior: col-span-full (full width within grid)
 * 
 * BACKWARD COMPATIBLE: If layout is not defined, defaults to col-span-full
 * FLEXIBLE: Works with both grid-enabled and vertical layouts
 * 
 * Props:
 *   - children: React component to wrap
 *   - layout: Optional layout configuration from section.content.layout
 */
interface SectionWrapperProps {
  children: React.ReactNode;
  layout?: Record<string, any>;
}

function SectionWrapper({ children, layout }: SectionWrapperProps): React.ReactElement {
  // Build grid positioning classes from layout configuration
  const gridClasses = buildSectionGridClasses(layout);

  // Render children wrapped in div with grid positioning classes
  // If page has grid enabled, these classes position the section within the grid
  // If page has no grid, col-span-full has no effect (graceful degradation)
  return <div className={gridClasses}>{children}</div>;
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

  // Extract layout positioning from section content (if defined)
  // This enables block-level grid positioning for each section
  const sectionLayout = content.layout as Record<string, any> | undefined;

  switch (sectionType) {
    case 'hero':
      return (
        <SectionWrapper layout={sectionLayout}>
          <HeroSection content={content} settings={settings} />
        </SectionWrapper>
      );
    case 'features':
      return (
        <SectionWrapper layout={sectionLayout}>
          <FeaturesSection content={content} settings={settings} />
        </SectionWrapper>
      );
    case 'steps':
      return (
        <SectionWrapper layout={sectionLayout}>
          <StepsSection content={content} settings={settings} />
        </SectionWrapper>
      );
    case 'categories':
      return (
        <SectionWrapper layout={sectionLayout}>
          <CategoriesSection content={content} />
        </SectionWrapper>
      );
    case 'text-section':
      return (
        <SectionWrapper layout={sectionLayout}>
          <TextSectionRenderer content={content} />
        </SectionWrapper>
      );
    case 'showcase':
      return (
        <SectionWrapper layout={sectionLayout}>
          <ShowcaseSection content={content} settings={settings} />
        </SectionWrapper>
      );
    case 'cta':
      return (
        <SectionWrapper layout={sectionLayout}>
          <CTASection content={content} settings={settings} />
        </SectionWrapper>
      );
    case 'gallery':
      return (
        <SectionWrapper layout={sectionLayout}>
          <GallerySection content={content} />
        </SectionWrapper>
      );
    case 'tabs':
      return (
        <SectionWrapper layout={sectionLayout}>
          <TabsSection content={content} settings={settings} />
        </SectionWrapper>
      );
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
  const backgroundImage = content.background_image || null;
  const imageLayout = content.image_layout || 'full-width';
  const imageWidth = content.image_width || 400;
  const imageHeight = content.image_height || 300;
  const imagePosition = content.image_position || 'center';
  const imageOverlay = content.image_overlay || 0;
  
  // Support both legacy format (cta_text/cta_link) and new button object format
  const button = content.button || {
    text: content.cta_text || 'Get Started',
    link: content.cta_link || '/register',
  };

  const primaryColor = settings?.primary_color || '#2563EB';

  // For full-width background image layout
  if (backgroundImage && imageLayout === 'full-width') {
    return (
      <div
        className="relative py-20 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
          backgroundPosition: imagePosition === 'top' ? 'center top' : imagePosition === 'bottom' ? 'center bottom' : 'center center',
        }}
      >
        {/* Overlay for text readability */}
        {imageOverlay > 0 && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0, 0, 0, ${imageOverlay / 100})` }}
          />
        )}
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
              {headline}
              {headlineHighlight && (
                <>
                  <br />
                  <span style={{ color: primaryColor }}>
                    {headlineHighlight}
                  </span>
                </>
              )}
            </h1>
            {subheadline && (
              <p className="text-xl text-white max-w-3xl mx-auto drop-shadow-lg">{subheadline}</p>
            )}
            {button && (
              <div className="mt-8">
                <CMSButton
                  button={button}
                  bgColor={primaryColor}
                  textColor="text-white"
                  hoverClass="hover:opacity-90"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For grid-based layouts (image + text side-by-side)
  if (backgroundImage && (imageLayout === 'grid-left' || imageLayout === 'grid-right' || imageLayout === 'grid-center')) {
    const containerClass = imageLayout === 'grid-left' || imageLayout === 'grid-right' 
      ? 'grid grid-cols-1 md:grid-cols-2 gap-8 items-center'
      : 'flex flex-col md:flex-row items-center justify-center gap-8';
    
    const imageWidthValue = imageLayout === 'grid-center' ? imageWidth * 1.2 : imageWidth;
    
    const imageElement = (
      <div className={imageLayout === 'grid-center' ? 'flex justify-center' : ''}>
        <img
          src={backgroundImage}
          alt="Hero"
          style={{
            width: `${imageWidthValue}px`,
            height: `${imageHeight}px`,
            objectFit: 'cover',
          }}
          className="rounded-lg shadow-lg"
        />
      </div>
    );

    const textElement = (
      <div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          {headline}
          {headlineHighlight && (
            <>
              <br />
              <span style={{ color: primaryColor }}>
                {headlineHighlight}
              </span>
            </>
          )}
        </h1>
        {subheadline && (
          <p className="text-xl text-gray-600 max-w-2xl">{subheadline}</p>
        )}
        {button && (
          <div className="mt-8">
            <CMSButton
              button={button}
              bgColor={primaryColor}
              textColor="text-white"
              hoverClass="hover:opacity-90"
            />
          </div>
        )}
      </div>
    );

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className={containerClass}>
          {imageLayout === 'grid-right' ? (
            <>
              {textElement}
              {imageElement}
            </>
          ) : imageLayout === 'grid-left' ? (
            <>
              {imageElement}
              {textElement}
            </>
          ) : (
            /* grid-center */
            <>
              {textElement}
              {imageElement}
            </>
          )}
        </div>
      </div>
    );
  }

  // For contained layout (image + text, centered)
  if (backgroundImage && imageLayout === 'contained') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col items-center text-center">
          <img
            src={backgroundImage}
            alt="Hero"
            style={{
              width: `${imageWidth}px`,
              height: `${imageHeight}px`,
              objectFit: 'cover',
            }}
            className="rounded-lg shadow-lg mb-8"
          />
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {headline}
            {headlineHighlight && (
              <>
                <br />
                <span style={{ color: primaryColor }}>
                  {headlineHighlight}
                </span>
              </>
            )}
          </h1>
          {subheadline && (
            <p className="text-xl text-gray-600 max-w-3xl">{subheadline}</p>
          )}
          {button && (
            <div className="mt-8">
              <CMSButton
                button={button}
                bgColor={primaryColor}
                textColor="text-white"
                hoverClass="hover:opacity-90"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default layout (no image or no layout specified)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          {headline}
          {headlineHighlight && (
            <>
              <br />
              <span style={{ color: primaryColor }}>
                {headlineHighlight}
              </span>
            </>
          )}
        </h1>
        {subheadline && (
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">{subheadline}</p>
        )}
        {button && (
          <div className="mt-8">
            <CMSButton
              button={button}
              bgColor={primaryColor}
              textColor="text-white"
              hoverClass="hover:opacity-90"
            />
          </div>
        )}
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

  // Check for internal grid override configuration
  const internalGrid = content.internal_grid as Record<string, any> | undefined;
  const hasInternalGrid = internalGrid?.enabled === true;

  // Default grid layout: 3 columns on desktop
  // Can be overridden by internal_grid configuration
  const defaultGridClass = 'md:grid-cols-3 gap-8';
  const gridClass = hasInternalGrid ? buildInternalGridClasses(internalGrid) : defaultGridClass;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {hasInternalGrid ? (
        // If internal_grid is enabled, use the custom grid configuration
        <InternalGrid internalGrid={internalGrid}>
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
        </InternalGrid>
      ) : (
        // Default layout: responsive grid (1 column on mobile, 2 on tablet, 3 on desktop)
        <div className={`grid ${gridClass}`}>
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
      )}
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

  // Check for internal grid override configuration
  const internalGrid = content.internal_grid as Record<string, any> | undefined;
  const hasInternalGrid = internalGrid?.enabled === true;

  // Adaptive grid layout based on step count (default behavior)
  const getDefaultGridClass = (count: number): string => {
    if (count === 1) return 'flex justify-center';
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto';
    if (count === 3) return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    if (count === 4) return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
    if (count === 5 || count === 6) return 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6';
    // 7+ steps: wrap intelligently
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  const renderStep = (step: Record<string, any>, idx: number) => {
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-xl shadow-lg p-12">
        {title && (
          <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
        )}
        {hasInternalGrid ? (
          // If internal_grid is enabled, use the custom grid configuration
          <InternalGrid internalGrid={internalGrid}>
            {steps.map((step: Record<string, any>, idx: number) => renderStep(step, idx))}
          </InternalGrid>
        ) : (
          // Default layout: adaptive grid based on step count
          <div className={getDefaultGridClass(steps.length)}>
            {steps.map((step: Record<string, any>, idx: number) => renderStep(step, idx))}
          </div>
        )}
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

  // Check for internal grid override configuration
  const internalGrid = content.internal_grid as Record<string, any> | undefined;
  const hasInternalGrid = internalGrid?.enabled === true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      {title && (
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
      )}
      {hasInternalGrid ? (
        // If internal_grid is enabled, use the custom grid configuration
        <InternalGrid internalGrid={internalGrid}>
          {categories.map((category: any, idx: number) => {
            // Ensure category is a string
            const categoryText = typeof category === 'string' ? category : String(category);
            
            return (
              <span key={idx} className="px-6 py-3 bg-white rounded-full shadow-md text-gray-700 font-medium">
                {categoryText}
              </span>
            );
          })}
        </InternalGrid>
      ) : (
        // Default layout: flex wrap with centered alignment
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
      )}
    </div>
  );
}

function ShowcaseSection({ content, settings }: { content: Record<string, any>; settings?: SiteSettings }) {
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

  // Check for internal grid override configuration
  const internalGrid = content.internal_grid as Record<string, any> | undefined;
  const hasInternalGrid = internalGrid?.enabled === true;

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
    
    // Support for action button (simple or dropdown)
    const itemButton = item.button || null;

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
            <p className="text-gray-600 mb-4">{itemDescription}</p>
          )}
          {/* Action button for showcase item (optional) */}
          {itemButton && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <CMSButton
                button={itemButton}
                bgColor={settings?.primary_color || '#2563EB'}
                textColor="text-white"
                hoverClass="hover:opacity-90"
              />
            </div>
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
      {hasInternalGrid ? (
        // If internal_grid is enabled, use the custom grid configuration
        <InternalGrid internalGrid={internalGrid}>
          {items.map((item: Record<string, any>, idx: number) => renderItem(item, idx))}
        </InternalGrid>
      ) : (
        // Default layout: dynamic grid based on item count
        <>
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
        </>
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
  
  // Support both legacy format (button_text/button_link) and new button object format
  const button = content.button || (content.button_text && content.button_link ? {
    text: content.button_text,
    link: content.button_link,
  } : null);

  // Check if there's any content to display
  if (!heading && !description && !button) {
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
        {/* CTA button using reusable CMSButton component */}
        {button && (
          <CMSButton
            button={button}
            bgColor="white"
            textColor="text-gray-900"
            hoverClass="hover:opacity-90"
          />
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

  // Check for internal grid override configuration
  const internalGrid = content.internal_grid as Record<string, any> | undefined;
  const hasInternalGrid = internalGrid?.enabled === true;

  // Determine layout based on image count (default behavior)
  const getDefaultGridClass = (count: number): string => {
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
    const imagePosition = image.position || '';
    const offsetX = image.offset_x || 50;
    const offsetY = image.offset_y || 50;

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
            style={{
              objectPosition: `${offsetX}% ${offsetY}%`,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
        <div className="p-4 bg-white">
          {imageCaption && (
            <p className="text-gray-900 font-semibold text-center text-sm">{imageCaption}</p>
          )}
          {imagePosition && (
            <p className="text-gray-600 text-center text-xs mt-1">{imagePosition}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {title && (
        <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
      )}
      {hasInternalGrid ? (
        // If internal_grid is enabled, use the custom grid configuration
        <InternalGrid internalGrid={internalGrid}>
          {images.map((image: Record<string, any>, idx: number) => renderImage(image, idx))}
        </InternalGrid>
      ) : (
        // Default layout: responsive grid based on image count
        <div className={getDefaultGridClass(images.length)}>
          {images.map((image: Record<string, any>, idx: number) => renderImage(image, idx))}
        </div>
      )}
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
  const textStylePreset = content.text_style_preset || 'default';
  const titleStyle = content.title_style || 'normal';
  const textSize = content.text_size || 'medium';
  const visualTone = content.visual_tone || 'neutral';
  const accentIcon = content.accent_icon || 'none';
  const emphasizeSection = content.emphasize_section || false;
  const verticalSpacing = content.vertical_spacing || 'normal';

  // Grid layout support
  const internalGrid = content.internal_grid as Record<string, any> | undefined;
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];
  const hasGridLayout = internalGrid?.enabled === true && blocks.length > 0;

  // Background style mapping
  const bgClasses: Record<string, string> = {
    none: 'bg-white',
    light_gray: 'bg-gray-50',
    soft_blue: 'bg-blue-50',
    soft_yellow: 'bg-yellow-50',
  };

  // Max width mapping
  const widthClasses: Record<string, string> = {
    narrow: 'max-w-2xl',
    normal: 'max-w-4xl',
    wide: 'max-w-6xl',
  };

  // Text alignment mapping
  const alignClasses: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
  };

  // Title style classes
  const titleStyleClasses: Record<string, string> = {
    normal: 'font-bold',
    bold: 'font-black',
    uppercase: 'font-bold uppercase tracking-tight',
    underline: 'font-bold pb-2 border-b-2 border-blue-200',
  };

  // Text size classes
  const textSizeClasses: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  // Text style preset classes (defines text color and styling)
  const textPresetClasses: Record<string, string> = {
    default: 'text-gray-700',
    introduction: 'text-gray-800 font-medium',
    highlight: 'text-blue-900 font-semibold',
    policy: 'text-red-900 bg-red-50 p-4 rounded-lg',
    callout: 'text-purple-900 italic border-l-4 border-purple-300 pl-4',
  };

  // Tone/mood classes (affects overall color subtly)
  const toneClasses: Record<string, string> = {
    neutral: '',
    informative: 'prose-blue',
    emphasis: 'font-medium',
    formal: 'tracking-wide',
  };

  // Vertical spacing padding
  const spacingClasses: Record<string, string> = {
    compact: 'py-8',
    normal: 'py-16',
    spacious: 'py-24',
  };

  // Emphasis box styling
  const emphasisBoxClass = emphasizeSection
    ? 'border-2 border-blue-200 bg-blue-50 rounded-lg p-6'
    : '';

  // Accent icon display
  const getAccentIcon = (iconType: string) => {
    const icons: Record<string, string> = {
      none: '',
      info: 'ℹ️',
      lightbulb: '💡',
      shield: '🛡️',
      document: '📄',
    };
    return icons[iconType] || '';
  };

  // Build grid classes for internal grid layout
  const getGridClasses = (): string => {
    if (!internalGrid) return '';
    
    let classes = 'grid';
    
    // Apply columns
    const columns = internalGrid.columns || 2;
    if (columns && typeof columns === 'number' && columns > 0 && columns <= 12) {
      classes += ` grid-cols-${columns}`;
    }
    
    // Apply gap
    const gap = internalGrid.gap || 'gap-6';
    if (gap) {
      classes += ` ${gap}`;
    }
    
    return classes;
  };

  const accentDisplay = getAccentIcon(accentIcon);
  const presetClass = textPresetClasses[textStylePreset] || textPresetClasses.default;

  return (
    <div className={`w-full px-4 sm:px-6 lg:px-8 ${spacingClasses[verticalSpacing]} ${bgClasses[bgStyle]}`}>
      {showDivider && <div className="mb-12 border-t border-gray-200"></div>}

      <div className={`mx-auto ${widthClasses[maxWidth]} ${emphasisBoxClass}`}>
        {title && (
          <div className="flex items-center gap-3 mb-6">
            {accentDisplay && <span className="text-2xl">{accentDisplay}</span>}
            <h2 className={`text-3xl ${titleStyleClasses[titleStyle]} text-gray-900 ${alignClasses[alignment]}`}>
              {title}
            </h2>
          </div>
        )}

        {/* Grid layout for multiple blocks */}
        {hasGridLayout ? (
          <div className={getGridClasses()}>
            {blocks.map((block: any, blockIdx: number) => (
              <div key={blockIdx} className="flex flex-col">
                {block.title && (
                  <h3 className={`text-2xl ${titleStyleClasses[titleStyle]} text-gray-900 mb-4`}>
                    {block.title}
                  </h3>
                )}
                <div className={`${textSizeClasses[textSize]} leading-relaxed space-y-4`}>
                  {(block.content || '').split('\n\n').map((paragraph: string, idx: number) => (
                    <p key={idx} className={`${presetClass} ${toneClasses[visualTone]} last:mb-0`}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Default single block layout */
          <div className={`${textSizeClasses[textSize]} leading-relaxed ${alignClasses[alignment]} space-y-4`}>
            {body.split('\n\n').map((paragraph: string, idx: number) => {
              // Apply different styles based on preset
              if (textStylePreset === 'policy') {
                return (
                  <p key={idx} className={`${presetClass} last:mb-0`}>
                    {paragraph}
                  </p>
                );
              } else if (textStylePreset === 'callout') {
                return (
                  <p key={idx} className={`${presetClass} last:mb-0`}>
                    {paragraph}
                  </p>
                );
              } else if (textStylePreset === 'highlight') {
                return (
                  <p key={idx} className={`${presetClass} ${toneClasses[visualTone]} last:mb-0`}>
                    {paragraph}
                  </p>
                );
              } else if (textStylePreset === 'introduction') {
                return (
                  <p key={idx} className={`${presetClass} ${textSize === 'large' ? 'text-lg' : ''} ${toneClasses[visualTone]} last:mb-0`}>
                    {paragraph}
                  </p>
                );
              } else {
                return (
                  <p key={idx} className={`${presetClass} ${toneClasses[visualTone]} last:mb-0`}>
                    {paragraph}
                  </p>
                );
              }
            })}
          </div>
        )}
      </div>

      {showDivider && <div className="mt-12 border-b border-gray-200"></div>}
    </div>
  );
}
// ============================================================================
// Tabs Section
// ============================================================================

function TabsSection({ content, settings }: { content: Record<string, any>; settings?: SiteSettings }) {
  const [activeTab, setActiveTab] = useState<number>(0);

  // Defensive checks
  if (!content) {
    console.warn('TabsSection: Missing content prop');
    return null;
  }

  const tabs = Array.isArray(content.tabs) ? content.tabs : [];
  const title = content.title || '';

  if (tabs.length === 0) {
    console.warn('TabsSection: No tabs provided');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Optional Section Title */}
      {title && (
        <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex flex-wrap gap-0 sm:gap-1">
          {tabs.map((tab: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`px-4 sm:px-6 py-3 font-medium text-sm sm:text-base border-b-2 transition-colors whitespace-nowrap ${
                activeTab === idx
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.title || `Tab ${idx + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg">
        {tabs.map((tab: any, idx: number) => (
          <div
            key={idx}
            className={`${activeTab === idx ? 'block' : 'hidden'}`}
          >
            {/* Content can be plain text or formatted with line breaks */}
            <div className="prose prose-sm max-w-none">
              {tab.content.split('\n').map((line: string, lineIdx: number) => {
                // Skip empty lines for better spacing
                if (!line.trim()) {
                  return <div key={lineIdx} className="h-2" />;
                }

                // Check if line starts with a bullet character
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                
                if (isBullet) {
                  // Remove bullet character and render as list item
                  const text = line.trim().replace(/^[•-]\s*/, '');
                  return (
                    <ul key={lineIdx} className="list-disc list-inside mb-3 text-gray-700">
                      <li>{text}</li>
                    </ul>
                  );
                } else {
                  // Render as paragraph
                  return (
                    <p key={lineIdx} className="mb-3 text-gray-700 leading-relaxed">
                      {line}
                    </p>
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}