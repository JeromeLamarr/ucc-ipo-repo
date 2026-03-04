export interface SectionStyle {
  background?: SectionBackground;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  width?: 'boxed' | 'full';
  align?: 'left' | 'center' | 'right';
  border?: 'none' | 'top' | 'bottom' | 'both';
  radius?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export type SectionBackground =
  | 'white'
  | 'gray'
  | 'blue'
  | 'yellow'
  | 'dark'
  | 'primary'
  | 'none';

export interface TypographyStyle {
  sizePreset?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export interface BlockStyle {
  typography?: TypographyStyle;
  background?: 'none' | 'white' | 'gray' | 'blue';
  spacing?: 'sm' | 'md' | 'lg';
  border?: 'none' | 'sm' | 'md';
  radius?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md';
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
}

export const DEFAULT_SECTION_STYLE: Required<SectionStyle> = {
  background: 'white',
  padding: 'lg',
  width: 'boxed',
  align: 'left',
  border: 'none',
  radius: 'none',
  shadow: 'none',
};

export const DEFAULT_BLOCK_STYLE: Required<BlockStyle> = {
  typography: { sizePreset: 'base', weight: 'normal', color: '', align: 'left' },
  background: 'none',
  spacing: 'md',
  border: 'none',
  radius: 'none',
  shadow: 'none',
  maxWidth: 'full',
};

const BACKGROUND_CLASSES: Record<SectionBackground, string> = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  blue: 'bg-blue-50',
  yellow: 'bg-yellow-50',
  dark: 'bg-gray-900',
  primary: '',
  none: '',
};

const PADDING_CLASSES: Record<string, string> = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-24',
};

const WIDTH_CLASSES: Record<string, string> = {
  boxed: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  full: 'w-full px-4 sm:px-6 lg:px-8',
};

const ALIGN_CLASSES: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const SHADOW_CLASSES: Record<string, string> = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

const RADIUS_CLASSES: Record<string, string> = {
  none: '',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-2xl',
};

const SIZE_CLASSES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

const WEIGHT_CLASSES: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const BLOCK_BACKGROUND_CLASSES: Record<string, string> = {
  none: '',
  white: 'bg-white',
  gray: 'bg-gray-50',
  blue: 'bg-blue-50',
};

const BLOCK_SPACING_CLASSES: Record<string, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const BLOCK_BORDER_CLASSES: Record<string, string> = {
  none: '',
  sm: 'border border-gray-100',
  md: 'border border-gray-200',
};

const BLOCK_MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: '',
};

export function sectionStyleToClasses(style?: SectionStyle | null): {
  wrapper: string;
  inner: string;
  align: string;
  isDark: boolean;
} {
  if (!style) {
    return {
      wrapper: 'bg-white',
      inner: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16',
      align: '',
      isDark: false,
    };
  }

  const bg = style.background ?? 'white';
  const padding = PADDING_CLASSES[style.padding ?? 'lg'] ?? 'py-16';
  const width = WIDTH_CLASSES[style.width ?? 'boxed'] ?? WIDTH_CLASSES.boxed;
  const align = ALIGN_CLASSES[style.align ?? 'left'] ?? '';
  const shadow = SHADOW_CLASSES[style.shadow ?? 'none'] ?? '';
  const radius = RADIUS_CLASSES[style.radius ?? 'none'] ?? '';

  let bgClass = BACKGROUND_CLASSES[bg] ?? 'bg-white';

  let borders = '';
  if (style.border === 'top') borders = 'border-t border-gray-200';
  else if (style.border === 'bottom') borders = 'border-b border-gray-200';
  else if (style.border === 'both') borders = 'border-t border-b border-gray-200';

  const isDark = bg === 'dark';

  return {
    wrapper: [bgClass, borders, radius, shadow].filter(Boolean).join(' '),
    inner: [width, padding].filter(Boolean).join(' '),
    align,
    isDark,
  };
}

export function typographyToClasses(typo?: TypographyStyle | null): string {
  if (!typo) return '';
  const size = SIZE_CLASSES[typo.sizePreset ?? ''] ?? '';
  const weight = WEIGHT_CLASSES[typo.weight ?? ''] ?? '';
  const align = ALIGN_CLASSES[typo.align ?? ''] ?? '';
  return [size, weight, align].filter(Boolean).join(' ');
}

export function blockStyleToClasses(blockStyle?: BlockStyle | null): string {
  if (!blockStyle) return '';
  const bg = BLOCK_BACKGROUND_CLASSES[blockStyle.background ?? 'none'] ?? '';
  const spacing = BLOCK_SPACING_CLASSES[blockStyle.spacing ?? 'md'] ?? '';
  const border = BLOCK_BORDER_CLASSES[blockStyle.border ?? 'none'] ?? '';
  const radius = RADIUS_CLASSES[blockStyle.radius ?? 'none'] ?? '';
  const shadow = SHADOW_CLASSES[blockStyle.shadow ?? 'none'] ?? '';
  const maxWidth = BLOCK_MAX_WIDTH_CLASSES[blockStyle.maxWidth ?? 'full'] ?? '';
  const hasSurface = bg || border;
  return [bg, hasSurface ? spacing : '', border, radius, shadow, maxWidth].filter(Boolean).join(' ');
}

export const BACKGROUND_OPTIONS: { value: SectionBackground; label: string }[] = [
  { value: 'white', label: 'White' },
  { value: 'gray', label: 'Light Gray' },
  { value: 'blue', label: 'Soft Blue' },
  { value: 'yellow', label: 'Soft Yellow' },
  { value: 'dark', label: 'Dark' },
  { value: 'primary', label: 'Brand Color' },
  { value: 'none', label: 'Transparent' },
];

export const PADDING_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

export const SIZE_PRESET_OPTIONS = [
  { value: 'xs', label: 'XS' },
  { value: 'sm', label: 'SM' },
  { value: 'base', label: 'Base' },
  { value: 'lg', label: 'LG' },
  { value: 'xl', label: 'XL' },
  { value: '2xl', label: '2XL' },
  { value: '3xl', label: '3XL' },
  { value: '4xl', label: '4XL' },
];

export const WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
];
