/**
 * Simplified Text Section Component
 * User-friendly, clean, and straightforward text content rendering
 */

interface TextSectionSimpleContent {
  title?: string;
  body?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  backgroundColor?: string;
  textColor?: string;
}

export function TextSectionSimple({ content }: { content: TextSectionSimpleContent }) {
  // Font size mapping
  const fontSizeMap: Record<string, string> = {
    'sm': '0.875rem',
    'base': '1rem',
    'lg': '1.125rem',
    'xl': '1.25rem',
  };

  // Default values
  const fontSize = fontSizeMap[content.fontSize || 'base'] || '1rem';
  const textAlign = content.textAlign || 'left';
  const backgroundColor = content.backgroundColor || '#ffffff';
  const textColor = content.textColor || '#000000';

  return (
    <div
      className="w-full py-12"
      style={{ backgroundColor }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        {content.title && (
          <h2
            className="text-3xl font-bold mb-6"
            style={{ color: textColor, textAlign }}
          >
            {content.title}
          </h2>
        )}

        {/* Body Content */}
        {content.body && (
          <div
            className="space-y-4"
            style={{
              fontSize,
              color: textColor,
              textAlign,
              lineHeight: '1.6',
            }}
          >
            {/* Split by double newlines for paragraphs */}
            {content.body.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="leading-relaxed">
                {paragraph.split('\n').map((line, lineIdx) => (
                  <div key={lineIdx}>
                    {line}
                  </div>
                ))}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
