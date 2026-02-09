/**
 * Enhanced Text Section Renderer
 * Supports typography, layout, column, and styling options
 */

interface TextSectionContentEnhanced {
  title?: string;
  body?: string;
  text_style?: string;

  // Typography
  fontSize?: string;      // 'sm' | 'base' | 'lg' | 'xl'
  lineHeight?: string;    // '1.4' | '1.6' | '1.8' | '2.0'
  letterSpacing?: string; // 'normal' | 'wide' | 'extra-wide'
  fontWeight?: string;    // 'normal' | 'medium' | 'semibold'

  // Layout
  textAlign?: string;       // 'left' | 'center' | 'right' | 'justify'
  containerWidth?: string;  // 'full' | 'wide' | 'medium' | 'narrow' | 'slim'
  columnLayout?: string;    // 'single' | 'two' | 'three'
  columnGap?: string;       // Tailwind spacing: 'gap-4' | 'gap-6' | 'gap-8'

  // Styling
  textColor?: string;       // hex or rgb color
  headingColor?: string;    // hex or rgb color
  backgroundColor?: string; // hex or rgb color
}

export function TextSectionEnhanced({ content }: { content: TextSectionContentEnhanced }) {
  // Sanitize HTML
  const sanitizeHtml = (html: string): string => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  };

  const sanitizedBody = content.body ? sanitizeHtml(content.body) : '';

  // Get container width class
  const getContainerClass = () => {
    const widthMap: Record<string, string> = {
      'full': 'w-full',
      'wide': 'max-w-6xl',
      'medium': 'max-w-4xl',
      'narrow': 'max-w-2xl',
      'slim': 'max-w-xl',
    };
    return widthMap[content.containerWidth || 'medium'] || 'max-w-2xl';
  };

  // Get column grid class
  const getColumnClass = () => {
    switch (content.columnLayout) {
      case 'two':
        return `grid grid-cols-2 ${content.columnGap || 'gap-6'}`;
      case 'three':
        return `grid grid-cols-3 ${content.columnGap || 'gap-6'}`;
      default:
        return '';
    }
  };

  // Generate dynamic typography CSS
  const getTypographyStyles = (): React.CSSProperties => {
    const fontSizeMap: Record<string, string> = {
      'sm': '14px',
      'base': '16px',
      'lg': '18px',
      'xl': '20px',
    };

    const letterSpacingMap: Record<string, string> = {
      'normal': '0',
      'wide': '0.1em',
      'extra-wide': '0.15em',
    };

    const fontWeightMap: Record<string, number> = {
      'normal': 400,
      'medium': 500,
      'semibold': 600,
    };

    return {
      fontSize: fontSizeMap[content.fontSize || 'base'] || '16px',
      lineHeight: content.lineHeight || '1.8',
      letterSpacing: letterSpacingMap[content.letterSpacing || 'normal'] || '0',
      fontWeight: fontWeightMap[content.fontWeight || 'normal'] || 400,
      textAlign: content.textAlign as any || 'left',
      color: content.textColor || '#000000',
    };
  };

  // Generate dynamic CSS with proper escaping for special characters
  const getStyleBlock = () => {
    const textColor = content.textColor || '#000000';
    const headingColor = content.headingColor || '#1f2937';

    return `
      .text-section-enhanced p {
        color: ${textColor};
        margin-bottom: 1.25rem;
      }

      .text-section-enhanced h1,
      .text-section-enhanced h2,
      .text-section-enhanced h3,
      .text-section-enhanced h4,
      .text-section-enhanced h5,
      .text-section-enhanced h6 {
        color: ${headingColor};
      }

      .text-section-enhanced h1 {
        font-size: 2.25rem;
        font-weight: 700;
        margin-top: 2.5rem;
        margin-bottom: 1.25rem;
      }

      .text-section-enhanced h2 {
        font-size: 1.875rem;
        font-weight: 700;
        margin-top: 2rem;
        margin-bottom: 1rem;
      }

      .text-section-enhanced h3 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-top: 1.75rem;
        margin-bottom: 0.875rem;
      }

      .text-section-enhanced h4 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
      }

      .text-section-enhanced h5 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-top: 1.25rem;
        margin-bottom: 0.625rem;
      }

      .text-section-enhanced h6 {
        font-size: 1rem;
        font-weight: 600;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }

      .text-section-enhanced ul,
      .text-section-enhanced ol {
        margin-left: 1.75rem;
        margin-bottom: 1.125rem;
      }

      .text-section-enhanced li {
        margin-bottom: 0.625rem;
      }

      .text-section-enhanced a {
        color: #1e40af;
        text-decoration: underline;
        font-weight: 500;
      }

      .text-section-enhanced a:hover {
        color: #1e3a8a;
      }

      .text-section-enhanced strong {
        font-weight: 700;
      }

      .text-section-enhanced em {
        font-style: italic;
      }

      .text-section-enhanced blockquote {
        border-left: 4px solid #dbeafe;
        padding-left: 1.25rem;
        margin-left: 0;
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
        color: #4b5563;
        font-style: italic;
      }

      .text-section-enhanced code {
        background-color: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        font-family: monospace;
        font-size: 0.9em;
        color: #d97706;
      }

      .text-section-enhanced pre {
        background-color: #1f2937;
        color: #e5e7eb;
        padding: 1rem;
        border-radius: 0.5rem;
        overflow-x: auto;
        margin-top: 1.125rem;
        margin-bottom: 1.125rem;
        font-family: monospace;
        font-size: 0.875rem;
      }

      /* Responsive columns */
      @media (max-width: 768px) {
        .text-section-enhanced.grid-responsive {
          grid-template-columns: 1fr;
        }
      }
    `;
  };

  const containerClass = getContainerClass();
  const columnClass = getColumnClass();
  const typographyStyles = getTypographyStyles();

  return (
    <div
      className="w-full py-16"
      style={{
        backgroundColor: content.backgroundColor || '#ffffff',
      }}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className={`text-section-enhanced ${containerClass}`}>
          {/* Title */}
          {content.title && (
            <h2
              className="text-3xl font-bold mb-8"
              style={{
                color: content.headingColor || '#1f2937',
                textAlign: (content.textAlign as any) || 'left',
              }}
            >
              {content.title}
            </h2>
          )}

          {/* Body Content with Columns */}
          <div
            className={`${columnClass} grid-responsive`}
            style={typographyStyles}
          >
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
            />
          </div>

          {/* Dynamic Styles */}
          <style>{getStyleBlock()}</style>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to convert markup to HTML-like format
 * Supports basic markdown-style formatting
 */
export function convertMarkupToHtml(text: string): string {
  let html = text;

  // Convert bold (*text* or **text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<strong>$1</strong>');

  // Convert italic (_text_ or __text__)
  html = html.replace(/\_\_(.+?)\_\_/g, '<em>$1</em>');
  html = html.replace(/\_(.+?)\_/g, '<em>$1</em>');

  // Convert line breaks to paragraphs
  html = html
    .split('\n\n')
    .map((paragraph) => {
      if (paragraph.trim()) {
        // Handle lists
        if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('*')) {
          const items = paragraph.split('\n').map((line) => {
            const match = line.match(/^[\-\*]\s+(.+)$/);
            return match ? `<li>${match[1]}</li>` : '';
          });
          return `<ul>${items.join('')}</ul>`;
        }

        // Handle numbered lists
        if (paragraph.trim().match(/^\d+\./)) {
          const items = paragraph.split('\n').map((line) => {
            const match = line.match(/^\d+\.\s+(.+)$/);
            return match ? `<li>${match[1]}</li>` : '';
          });
          return `<ol>${items.join('')}</ol>`;
        }

        return `<p>${paragraph}</p>`;
      }
      return '';
    })
    .join('');

  return html;
}
