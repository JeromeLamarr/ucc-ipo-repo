import React from 'react';

// Responsive font sizes
const TEXT_SIZES = {
  sm: { mobile: '0.75rem', tablet: '0.875rem', desktop: '0.875rem' },
  md: { mobile: '0.875rem', tablet: '1rem', desktop: '1rem' },
  lg: { mobile: '1rem', tablet: '1.125rem', desktop: '1.125rem' }
};

const TITLE_SIZES = {
  mobile: '1.5rem',
  tablet: '1.875rem',
  desktop: '2.25rem'
};

const PADDING_VALUES = {
  none: '0',
  sm: '1rem',
  md: '2rem',
  lg: '3rem',
  xl: '4rem'
};

const LAYOUT_CONFIGS = {
  single: {
    columns: 1,
    maxWidth: '56rem',
    gap: undefined,
    breakpoint: undefined
  },
  'two-column': {
    columns: 2,
    maxWidth: '80rem',
    gap: '2rem',
    breakpoint: '768px'
  },
  'three-column': {
    columns: 3,
    maxWidth: '96rem',
    gap: '2rem',
    breakpoint: '1024px'
  }
};

export interface TextSectionContent {
  body: string;
  title?: string;
  textSize?: 'sm' | 'md' | 'lg';
  textAlign?: 'left' | 'center' | 'right';
  layout?: 'single' | 'two-column' | 'three-column';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  textColor?: string;
  backgroundColor?: string;
}

export function TextSectionNew({ content }: { content: TextSectionContent }) {
  const layout = content.layout || 'single';
  const textSizeConfig = TEXT_SIZES[content.textSize || 'md'];
  const textAlign = content.textAlign || 'left';
  const textColor = content.textColor || '#000000';
  const backgroundColor = content.backgroundColor || '#ffffff';
  const padding = PADDING_VALUES[content.padding || 'md'];
  const layoutConfig = LAYOUT_CONFIGS[layout];

  // Split paragraphs by double line breaks
  const paragraphs = content.body.split(/\n\s*\n/).filter(p => p.trim());

  return (
    <section className="w-full" style={{ backgroundColor }}>
      <div
        className="mx-auto px-4 sm:px-6 lg:px-8"
        style={{
          maxWidth: layoutConfig.maxWidth,
          paddingTop: padding,
          paddingBottom: padding,
          color: textColor,
          textAlign
        }}
      >
        {content.title && (
          <h2
            className="mb-6"
            style={{
              fontSize: `clamp(${TITLE_SIZES.mobile}, 5vw, ${TITLE_SIZES.desktop})`,
              fontWeight: 700,
              color: textColor
            }}
          >
            {content.title}
          </h2>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${layoutConfig.columns}, 1fr)`,
            gap: layoutConfig.gap,
            // Responsive stacking handled by CSS media queries in real app
          }}
        >
          {paragraphs.map((para, idx) => (
            <div
              key={idx}
              style={{
                fontSize: `clamp(${textSizeConfig.mobile}, 2vw, ${textSizeConfig.desktop})`,
                lineHeight: '1.6'
              }}
            >
              <p style={{ margin: 0, marginBottom: '1rem' }}>{para.trim()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
