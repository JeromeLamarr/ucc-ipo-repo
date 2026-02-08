/**
 * Design System - Centralized design tokens and constants
 * This file serves as the single source of truth for the application's visual design
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const COLORS = {
  // Primary Colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Secondary Colors (Indigo/Purple)
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Accent Colors
  accent: {
    purple: '#a855f7',
    indigo: '#6366f1',
    cyan: '#06b6d4',
  },

  // Neutral Colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Status Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Semantic Colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const TYPOGRAPHY = {
  // Font Families
  font: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },

  // Font Sizes
  size: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
    '8xl': '6rem', // 96px
  },

  // Font Weights
  weight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================================================
// SPACING SCALE
// ============================================================================

export const SPACING = {
  0: '0px',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  32: '8rem', // 128px
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const BORDER_RADIUS = {
  none: '0px',
  sm: '0.125rem', // 2px
  base: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
};

// ============================================================================
// SHADOWS
// ============================================================================

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

// ============================================================================
// TRANSITION TIMES
// ============================================================================

export const TRANSITIONS = {
  fast: '150ms',
  base: '300ms',
  slow: '500ms',
  slower: '700ms',
};

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const Z_INDEX = {
  hide: -1,
  auto: 'auto',
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  modal: 1050,
  tooltip: 1070,
};

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

export const BUTTON_VARIANTS = {
  primary: {
    base: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
    hover: 'hover:from-blue-700 hover:to-indigo-700',
    focus: 'focus:ring-blue-500',
  },
  secondary: {
    base: 'bg-white text-blue-600 border-2 border-blue-600',
    hover: 'hover:bg-blue-50',
    focus: 'focus:ring-blue-500',
  },
  danger: {
    base: 'bg-red-600 text-white',
    hover: 'hover:bg-red-700',
    focus: 'focus:ring-red-500',
  },
  ghost: {
    base: 'text-gray-700 bg-transparent',
    hover: 'hover:bg-gray-100',
    focus: 'focus:ring-gray-500',
  },
};

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const CARD_VARIANTS = {
  default: {
    base: 'bg-white rounded-2xl border border-gray-100',
    shadow: 'shadow-md',
    hoverShadow: 'hover:shadow-2xl',
  },
  elevated: {
    base: 'bg-white rounded-2xl',
    shadow: 'shadow-lg',
    hoverShadow: 'hover:shadow-2xl',
  },
  outlined: {
    base: 'bg-transparent rounded-2xl border-2 border-gray-200',
    shadow: 'shadow-none',
    hoverShadow: 'hover:shadow-md',
  },
};

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const BREAKPOINTS = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================================
// GRADIENT HELPERS
// ============================================================================

export const GRADIENTS = {
  primaryBlue: 'linear-gradient(to right, rgb(37, 99, 235), rgb(99, 102, 241))',
  primaryToIndigo: 'linear-gradient(to right, rgb(37, 99, 235), rgb(79, 70, 229))',
  purpleGradient: 'linear-gradient(to right, rgb(59, 130, 246), rgb(99, 102, 241), rgb(168, 85, 247))',
  coolGradient: 'linear-gradient(135deg, rgb(241, 245, 249), rgb(240, 249, 255))',
};

// ============================================================================
// FOCUS STATE
// ============================================================================

export const FOCUS_STATE = {
  outline: 'focus:outline-none focus:ring-2 focus:ring-offset-2',
  ring: 'focus-visible:ring-2 focus-visible:ring-offset-2',
};
