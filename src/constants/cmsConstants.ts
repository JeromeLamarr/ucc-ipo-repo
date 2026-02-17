/**
 * CMS Constants
 * 
 * Centralized definition of all CMS-related constant values to prevent
 * hardcoded slug mismatches and ensure consistency across the application.
 * 
 * IMPORTANT: If you need a new CMS page or slug, add it here first,
 * then reference it in your code. Never hardcode slug values.
 */

// ============================================================================
// CANONICAL PAGE SLUGS
// ============================================================================

/**
 * Canonical slug for the home/landing page
 * Used by: LandingPage.tsx, database seed data, navigation
 * 
 * NEVER change this without:
 * 1. Creating a migration to update existing data
 * 2. Updating all files that reference this slug
 * 3. Communicating the change to the team
 */
export const CMS_PAGES = {
  HOME: 'home',
  // Add more pages here as needed:
  // ABOUT: 'about',
  // CONTACT: 'contact',
  // TERMS: 'terms',
  // PRIVACY: 'privacy',
} as const;

// ============================================================================
// SECTION TYPES
// ============================================================================

/**
 * Valid CMS section types that can be stored in the database
 * These must match the enum constraint in the database schema
 */
export const CMS_SECTION_TYPES = {
  HERO: 'hero',
  FEATURES: 'features',
  STEPS: 'steps',
  CATEGORIES: 'categories',
  TEXT: 'text',
  SHOWCASE: 'showcase',
  CTA: 'cta',
  GALLERY: 'gallery',
  TABS: 'tabs',
} as const;

// ============================================================================
// ROUTES
// ============================================================================

/**
 * CMS-related routes
 * Use these instead of hardcoding routes to ensure consistency
 */
export const CMS_ROUTES = {
  // Admin routes
  ADMIN_PAGES_LIST: '/dashboard/public-pages',
  ADMIN_PAGES_DETAIL: (pageId: string) => `/dashboard/public-pages/${pageId}`,
  
  // Public routes
  PUBLIC_PAGE: (slug: string) => `/pages/${slug}`,
  
  // Convenience routes for specific pages
  HOME: () => CMS_ROUTES.PUBLIC_PAGE(CMS_PAGES.HOME),
  // Add more as needed:
  // ABOUT: () => CMS_ROUTES.PUBLIC_PAGE(CMS_PAGES.ABOUT),
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Type for valid page slugs
 * This provides IDE autocomplete and type safety
 */
export type PageSlug = typeof CMS_PAGES[keyof typeof CMS_PAGES];

/**
 * Type for valid section types
 * This provides IDE autocomplete and type safety
 */
export type SectionType = typeof CMS_SECTION_TYPES[keyof typeof CMS_SECTION_TYPES];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a string is a valid page slug
 * Use this for runtime validation when receiving user input
 */
export function isValidPageSlug(slug: string): slug is PageSlug {
  return Object.values(CMS_PAGES).includes(slug as PageSlug);
}

/**
 * Check if a string is a valid section type
 * Use this for runtime validation when receiving user input
 */
export function isValidSectionType(type: string): type is SectionType {
  return Object.values(CMS_SECTION_TYPES).includes(type as SectionType);
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default page slug for fallback/home navigation
 */
export const DEFAULT_PAGE_SLUG = CMS_PAGES.HOME;

/**
 * Default section type when creating new sections
 */
export const DEFAULT_SECTION_TYPE = CMS_SECTION_TYPES.TEXT;

// ============================================================================
// MIGRATION GUIDE
// ============================================================================

/**
 * When adding a new CMS page:
 * 
 * 1. Add the slug to CMS_PAGES above:
 *    NEW_PAGE: 'new-page-slug',
 * 
 * 2. Add route to CMS_ROUTES:
 *    NEW_PAGE: () => CMS_ROUTES.PUBLIC_PAGE(CMS_PAGES.NEW_PAGE),
 * 
 * 3. Create a database migration to insert the page:
 *    INSERT INTO cms_pages (slug, title, description, is_published)
 *    VALUES ('new-page-slug', 'Page Title', 'Description', false)
 *    ON CONFLICT (slug) DO NOTHING;
 * 
 * 4. Update any TypeScript types if needed:
 *    type PageSlug = ... (will auto-update)
 * 
 * 5. Reference in code:
 *    // Instead of: .eq('slug', 'new-page-slug')
 *    // Use:       .eq('slug', CMS_PAGES.NEW_PAGE)
 * 
 * This prevents slug mismatches and makes refactoring easier.
 */
