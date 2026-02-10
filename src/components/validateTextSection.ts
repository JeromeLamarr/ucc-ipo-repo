// Validation and color contrast helper for TextSectionContent
import { TextSectionContent } from './TextSectionNew';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Simple color contrast checker (returns contrast ratio)
function luminance(hex: string) {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16) / 255) || [0,0,0];
  const a = rgb.map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
}
function checkColorContrast(fg: string, bg: string) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function validateTextSection(content: TextSectionContent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.body || content.body.trim().length === 0) {
    errors.push('Body content is required');
  }
  if (content.body && content.body.trim().length < 20) {
    warnings.push('Content is quite short. Consider adding more text.');
  }
  if (content.textColor && !/^#[0-9A-Fa-f]{6}$/.test(content.textColor)) {
    errors.push('Text color must be valid hex (e.g., #000000)');
  }
  if (content.backgroundColor && !/^#[0-9A-Fa-f]{6}$/.test(content.backgroundColor)) {
    errors.push('Background color must be valid hex (e.g., #ffffff)');
  }
  if (content.textColor && content.backgroundColor) {
    const contrast = checkColorContrast(content.textColor, content.backgroundColor);
    if (contrast < 4.5) {
      warnings.push('Low contrast between text and background');
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
