/**
 * Brand style utilities
 * Helpers for building gradient/tint styles from brand colours and for
 * injecting CSS custom-properties at the document root.
 */

// ── Default brand colours ──────────────────────────────────────────────────
export const BRAND_DEFAULTS = {
  primary: '#2563EB',
  secondary: '#6366F1',
} as const;

// ── Colour helpers ─────────────────────────────────────────────────────────

/**
 * Lighten/darken a hex colour by a percentage.
 * Positive values lighten; negative values darken.
 */
export function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((R * 0x10000) + (G * 0x100) + B).toString(16).padStart(6, '0')}`;
}

/**
 * Convert a hex colour to an rgba() string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(37,99,235,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Gradient builder ───────────────────────────────────────────────────────

export type GradientStyle =
  | 'primary-secondary' // primary → secondary (default)
  | 'primary-dark'      // primary → darker primary
  | 'primary-light'     // lighter primary → primary
  | 'solid';            // solid primary (no gradient)

/**
 * Build a CSS `background` gradient string.
 */
export function getBrandGradient(
  primary: string = BRAND_DEFAULTS.primary,
  secondary: string = BRAND_DEFAULTS.secondary,
  style: GradientStyle | string = 'primary-secondary',
  direction: string = '135deg',
): string {
  switch (style) {
    case 'primary-dark':
      return `linear-gradient(${direction}, ${primary}, ${adjustColor(primary, -25)})`;
    case 'primary-light':
      return `linear-gradient(${direction}, ${adjustColor(primary, 25)}, ${primary})`;
    case 'solid':
      return primary;
    case 'primary-secondary':
    default:
      return `linear-gradient(${direction}, ${primary}, ${secondary})`;
  }
}

/**
 * Build a low-opacity tint of the brand primary for backgrounds.
 */
export function getBrandTint(primary: string = BRAND_DEFAULTS.primary, alpha = 0.08): string {
  return hexToRgba(primary, alpha);
}

// ── CSS custom-property injection ──────────────────────────────────────────

/**
 * Write brand CSS variables onto `document.documentElement` so they are
 * available as `var(--brand-primary)` etc. throughout the stylesheet.
 */
export function applyBrandCSSVars(primary: string, secondary?: string | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const p = primary || BRAND_DEFAULTS.primary;
  const s = secondary || BRAND_DEFAULTS.secondary;
  root.style.setProperty('--brand-primary', p);
  root.style.setProperty('--brand-secondary', s);
  root.style.setProperty('--brand-primary-dark', adjustColor(p, -25));
  root.style.setProperty('--brand-primary-light', adjustColor(p, 25));
  root.style.setProperty('--brand-tint', hexToRgba(p, 0.08));
  root.style.setProperty('--brand-gradient', getBrandGradient(p, s));
}

/**
 * Apply/remove a favicon by href.
 */
export function applyFavicon(faviconUrl: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (faviconUrl) {
    link.href = faviconUrl;
  }
}
