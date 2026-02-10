/**
 * Text Block Templates
 * Pre-built templates for common text block patterns
 */

import { ChevronDown, Copy, Plus } from 'lucide-react';
import { useState } from 'react';

export interface TextBlockTemplate {
  id: string;
  name: string;
  description: string;
  category: 'intro' | 'body' | 'conclusion' | 'highlight' | 'legal' | 'testimonial' | 'custom';
  icon: string;
  content: {
    title?: string;
    body: string;
    text_style?: string;
    fontSize?: string;
    lineHeight?: string;
    textAlign?: string;
  };
  preview: string;
}

const DEFAULT_TEMPLATES: TextBlockTemplate[] = [
  {
    id: 'intro-welcome',
    name: 'Welcome Introduction',
    description: 'A warm welcome message for your page',
    category: 'intro',
    icon: '👋',
    content: {
      title: 'Welcome to Our Platform',
      body: 'We're thrilled to have you here. This section introduces your content and sets the tone for what visitors can expect. Customize this text to match your brand voice and message.',
      text_style: 'intro',
      fontSize: 'lg',
      lineHeight: '1.8',
    },
    preview: 'Warm welcome message',
  },
  {
    id: 'body-paragraph',
    name: 'Standard Body Text',
    description: 'Regular paragraph content',
    category: 'body',
    icon: '📄',
    content: {
      body: 'This is a standard paragraph of body text. Use this for your main content blocks. You can include multiple paragraphs by separating them with blank lines. Each paragraph will be properly formatted and spaced.',
      text_style: 'default',
      fontSize: 'base',
      lineHeight: '1.8',
      textAlign: 'left',
    },
    preview: 'Standard content paragraph',
  },
  {
    id: 'highlight-callout',
    name: 'Highlighted Callout',
    description: 'Important information box',
    category: 'highlight',
    icon: '⚡',
    content: {
      title: 'Important Notice',
      body: '💡 This is a highlighted section perfect for drawing attention to key information. Use it for warnings, tips, featured announcements, or important reminders.',
      text_style: 'highlight',
      fontSize: 'base',
    },
    preview: 'Highlighted callout box',
  },
  {
    id: 'testimonial-quote',
    name: 'Testimonial / Quote',
    description: 'Customer testimonial or inspiring quote',
    category: 'testimonial',
    icon: '💬',
    content: {
      title: 'What Our Users Say',
      body: '"This platform has transformed the way we work. The team is incredibly responsive and the features are exactly what we needed." - Jane Smith, CEO at TechCorp',
      text_style: 'quote',
      fontSize: 'lg',
      textAlign: 'center',
    },
    preview: 'Customer testimonial',
  },
  {
    id: 'conclusion-cta',
    name: 'Conclusion with CTA',
    description: 'Wrap-up section with next steps',
    category: 'conclusion',
    icon: '✅',
    content: {
      title: 'Ready to Get Started?',
      body: 'We've covered everything you need to know. Now it's time to take action. Whether you have questions or are ready to move forward, we're here to help every step of the way.',
      text_style: 'default',
    },
    preview: 'Call-to-action conclusion',
  },
  {
    id: 'legal-disclaimer',
    name: 'Legal Disclaimer',
    description: 'Terms, conditions, or copyright notice',
    category: 'legal',
    icon: '⚖️',
    content: {
      title: 'Legal Notice',
      body: 'All content on this page is provided for informational purposes only. Please review our terms of service and privacy policy before using this platform. For more information, contact our legal team.',
      text_style: 'muted',
      fontSize: 'sm',
    },
    preview: 'Legal disclaimer',
  },
  {
    id: 'features-list',
    name: 'Features List',
    description: 'Highlight key features',
    category: 'body',
    icon: '✨',
    content: {
      title: 'Our Key Features',
      body: '• Fast performance and reliability\n• Easy to use interface\n• Comprehensive support\n• Flexible pricing plans\n• Regular updates and improvements',
      text_style: 'default',
    },
    preview: 'Bullet point features',
  },
  {
    id: 'step-guide',
    name: 'Step-by-Step Guide',
    description: 'How-to or process instructions',
    category: 'body',
    icon: '📋',
    content: {
      title: 'How to Get Started',
      body: '1. Create your account in seconds\n2. Choose your plan based on your needs\n3. Customize your settings\n4. Invite team members\n5. Start creating and collaborating',
      text_style: 'default',
    },
    preview: 'Numbered instructions',
  },
];

interface TextBlockTemplatesProps {
  onSelect: (template: TextBlockTemplate) => void;
  currentTemplate?: TextBlockTemplate;
  showButton?: boolean;
}

export function TextBlockTemplates({
  onSelect,
  currentTemplate,
  showButton = true,
}: TextBlockTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = Array.from(new Set(DEFAULT_TEMPLATES.map(t => t.category)));

  const filteredTemplates = selectedCategory
    ? DEFAULT_TEMPLATES.filter(t => t.category === selectedCategory)
    : DEFAULT_TEMPLATES;

  const handleSelect = (template: TextBlockTemplate) => {
    onSelect(template);
    setIsOpen(false);
  };

  if (!showButton) {
    return <div className="text-xs text-gray-500">No templates available</div>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
      >
        <Plus className="h-4 w-4" />
        Use Template
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-96">
          {/* Category Filter */}
          <div className="p-3 border-b border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-2">Filter by Category:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Templates List */}
          <div className="space-y-2 p-3 max-h-96 overflow-y-auto">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
                onClick={() => handleSelect(template)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{template.icon}</span>
                      <div>
                        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                          {template.name}
                        </div>
                        <div className="text-xs text-gray-500">{template.description}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ml-8 text-xs text-gray-600 italic">{template.preview}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600">
              💡 Click a template to instantly populate your text block with pre-written content. You can edit everything after selection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline template button for TextBlockFormEnhanced
 */
export function TextBlockTemplateButton({ onSelect }: { onSelect: (content: Partial<Record<string, any>>) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (template: TextBlockTemplate) => {
    onSelect(template.content);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-1"
      >
        <Plus className="h-3 w-3" />
        Load Template
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-72 max-h-64 overflow-y-auto">
          {DEFAULT_TEMPLATES.slice(0, 6).map(template => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <span className="text-base">{template.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  <div className="text-xs text-gray-500">{template.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
