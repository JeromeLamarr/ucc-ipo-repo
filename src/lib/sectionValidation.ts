/**
 * CMS Section Validation Rules
 * Defines required fields and validation rules for each section type
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning'; // error = blocks save, warning = blocks publish
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Validation Rules per Section Type
// ============================================================================

const VALIDATION_RULES: Record<string, any> = {
  hero: {
    required: ['headline', 'subheadline', 'cta_text', 'cta_link'],
    validations: [
      {
        field: 'cta_link',
        test: (value: string) => value.startsWith('/') || value.startsWith('http'),
        message: 'Link must start with "/" (internal) or "http" (external)',
        severity: 'error',
      },
      {
        field: 'cta_text',
        test: (value: string) => value.length > 0,
        message: 'Button text cannot be empty',
        severity: 'error',
      },
    ],
  },

  features: {
    required: [],
    validations: [
      {
        field: 'features',
        test: (value: any[]) => {
          if (!Array.isArray(value) || value.length === 0) return false;
          return value.every((f) => f.title && f.description);
        },
        message: 'Each feature must have a title and description',
        severity: 'error',
      },
      {
        field: 'features',
        test: (value: any[]) => {
          if (!Array.isArray(value)) return true;
          return value.length > 0;
        },
        message: 'Add at least one feature',
        severity: 'warning',
      },
    ],
  },

  steps: {
    required: [],
    validations: [
      {
        field: 'steps',
        test: (value: any[]) => {
          if (!Array.isArray(value) || value.length === 0) return false;
          return value.every((s) => s.label && s.description);
        },
        message: 'Each step must have a label and description',
        severity: 'error',
      },
      {
        field: 'steps',
        test: (value: any[]) => {
          if (!Array.isArray(value)) return true;
          return value.length > 0;
        },
        message: 'Add at least one step',
        severity: 'warning',
      },
    ],
  },

  text: {
    required: ['body'],
    validations: [
      {
        field: 'body',
        test: (value: string) => value.length > 10,
        message: 'Content should be more than 10 characters',
        severity: 'warning',
      },
      {
        field: 'body',
        test: (value: string) => {
          // Check for unmatched HTML tags
          const openTags = (value.match(/<[^/][^>]*>/g) || []).length;
          const closeTags = (value.match(/<\/[^>]*>/g) || []).length;
          return openTags === closeTags;
        },
        message: 'HTML tags appear to be unmatched',
        severity: 'error',
      },
    ],
  },

  categories: {
    required: [],
    validations: [
      {
        field: 'categories',
        test: (value: string[]) => {
          if (!Array.isArray(value)) return true;
          return value.every((c) => c && c.length > 0);
        },
        message: 'Remove empty categories',
        severity: 'error',
      },
      {
        field: 'categories',
        test: (value: string[]) => {
          if (!Array.isArray(value)) return true;
          return value.length > 0;
        },
        message: 'Add at least one category',
        severity: 'warning',
      },
    ],
  },

  cta: {
    required: ['heading', 'description', 'button_text', 'button_link'],
    validations: [
      {
        field: 'button_link',
        test: (value: string) => {
          if (!value) return false;
          return value.startsWith('/') || value.startsWith('http');
        },
        message: 'Link must start with "/" (internal) or "http" (external)',
        severity: 'error',
      },
      {
        field: 'button_text',
        test: (value: string) => value.length > 0,
        message: 'Button text cannot be empty',
        severity: 'error',
      },
      {
        field: 'background_color',
        test: (value: string) => value && value.length > 0,
        message: 'Select a background color',
        severity: 'warning',
      },
    ],
  },

  gallery: {
    required: [],
    validations: [
      {
        field: 'images',
        test: (value: any[]) => {
          if (!Array.isArray(value) || value.length === 0) return false;
          return value.every((img) => img.url && img.alt_text);
        },
        message: 'Each image must have a URL and alt text',
        severity: 'error',
      },
      {
        field: 'images',
        test: (value: any[]) => {
          if (!Array.isArray(value)) return true;
          return value.every((img) => {
            if (!img.url) return true;
            try {
              new URL(img.url);
              return true;
            } catch {
              return false;
            }
          });
        },
        message: 'Invalid image URL format',
        severity: 'error',
      },
      {
        field: 'images',
        test: (value: any[]) => {
          if (!Array.isArray(value)) return true;
          return value.length > 0;
        },
        message: 'Add at least one image',
        severity: 'warning',
      },
    ],
  },

  showcase: {
    required: [],
    validations: [
      {
        field: 'items',
        test: (value: any[]) => {
          if (!Array.isArray(value)) return true;
          return value.every((item) => item.title && item.description);
        },
        message: 'Each item must have a title and description',
        severity: 'error',
      },
    ],
  },
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a section's content against its type rules
 */
export function validateSection(
  sectionType: string,
  content: Record<string, any>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const rules = VALIDATION_RULES[sectionType] || { required: [], validations: [] };

  // Check required fields
  if (rules.required && Array.isArray(rules.required)) {
    for (const field of rules.required) {
      const value = content[field];

      // Check if field is missing or empty
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `"${formatFieldName(field)}" is required`,
          severity: 'error',
        });
      }

      // Check for empty arrays
      if (Array.isArray(value) && value.length === 0) {
        errors.push({
          field,
          message: `"${formatFieldName(field)}" cannot be empty`,
          severity: 'error',
        });
      }
    }
  }

  // Run custom validation tests
  if (rules.validations && Array.isArray(rules.validations)) {
    for (const validation of rules.validations) {
      const { field, test, message, severity } = validation;
      const value = content[field];

      // Skip validation if field is not present and it's a warning
      if ((value === undefined || value === null) && severity === 'warning') {
        continue;
      }

      try {
        if (!test(value)) {
          const errorObj: ValidationError = { field, message, severity };

          if (severity === 'error') {
            errors.push(errorObj);
          } else {
            warnings.push(errorObj);
          }
        }
      } catch (err) {
        console.warn(`Validation test error for ${field}:`, err);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a page can be published based on all its sections
 */
export function canPublishPage(sections: any[]): { canPublish: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!Array.isArray(sections) || sections.length === 0) {
    issues.push('Page must have at least one block');
    return { canPublish: false, issues };
  }

  // Validate each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const validation = validateSection(section.section_type, section.content);

    if (!validation.isValid) {
      const blockName = `${section.section_type.toUpperCase()} block #${i + 1}`;
      for (const error of validation.errors) {
        issues.push(`${blockName}: ${error.message}`);
      }
    }
  }

  return {
    canPublish: issues.length === 0,
    issues,
  };
}

/**
 * Format field name for display (convert camelCase to Title Case)
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check for invalid links in content
 */
export function isValidLink(link: string): boolean {
  if (!link) return false;

  // Allow relative links
  if (link.startsWith('/')) return true;

  // Allow full URLs
  try {
    new URL(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get severity badge color
 */
export function getSeverityColor(severity: 'error' | 'warning'): string {
  return severity === 'error' ? 'text-red-700 bg-red-50 border-red-200' : 'text-yellow-700 bg-yellow-50 border-yellow-200';
}
