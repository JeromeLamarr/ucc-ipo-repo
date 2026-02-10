import { useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { TextBlockTemplateButton } from './TextBlockTemplates';
import { AdvancedStylingPanel } from './AdvancedStylingPanel';
import { ResponsiveDesignPanel } from './ResponsiveDesignPanel';
import { ContentVersioningPanel } from './ContentVersioningPanel';
import { AdvancedSEOValidation } from './AdvancedSEOValidation';
import { AnimationEffectsPanel } from './AnimationEffectsPanel';

interface TextBlockFormEnhancedProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
}

type TabType = 'content' | 'typography' | 'layout' | 'styling' | 'advanced-styling' | 'responsive' | 'animations' | 'seo' | 'versioning' | 'preview';

// Typography options
const FONT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small (14px)', preview: '14px' },
  { value: 'base', label: 'Base (16px)', preview: '16px' },
  { value: 'lg', label: 'Large (18px)', preview: '18px' },
  { value: 'xl', label: 'Extra Large (20px)', preview: '20px' },
];

const LINE_HEIGHT_OPTIONS = [
  { value: '1.4', label: 'Tight (1.4)' },
  { value: '1.6', label: 'Normal (1.6)' },
  { value: '1.8', label: 'Comfortable (1.8)' },
  { value: '2.0', label: 'Spacious (2.0)' },
];

const LETTER_SPACING_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
  { value: 'extra-wide', label: 'Extra Wide' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Regular' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
];

// Layout options
const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '⬅️ Left', icon: 'text-left' },
  { value: 'center', label: '⬇️ Center', icon: 'text-center' },
  { value: 'right', label: '➡️ Right', icon: 'text-right' },
  { value: 'justify', label: '↔️ Justify', icon: 'text-justify' },
];

const CONTAINER_WIDTH_OPTIONS = [
  { value: 'full', label: 'Full Width (100%)' },
  { value: 'wide', label: 'Wide (90% / max-6xl)' },
  { value: 'medium', label: 'Medium (80% / max-4xl)' },
  { value: 'narrow', label: 'Narrow (60% / max-2xl)' },
  { value: 'slim', label: 'Slim (50% / max-xl)' },
];

const COLUMN_LAYOUT_OPTIONS = [
  { value: 'single', label: '1 Column', cols: 1 },
  { value: 'two', label: '2 Columns', cols: 2 },
  { value: 'three', label: '3 Columns', cols: 3 },
];

const COLUMN_GAP_OPTIONS = [
  { value: 'gap-4', label: 'Tight (16px)' },
  { value: 'gap-6', label: 'Normal (24px)' },
  { value: 'gap-8', label: 'Wide (32px)' },
];

const TEXT_COLOR_PRESETS = [
  { value: '#000000', label: 'Black', bg: 'bg-black' },
  { value: '#1f2937', label: 'Gray Dark', bg: 'bg-gray-800' },
  { value: '#6b7280', label: 'Gray Medium', bg: 'bg-gray-500' },
  { value: '#1e40af', label: 'Blue', bg: 'bg-blue-700' },
  { value: '#7c3aed', label: 'Purple', bg: 'bg-purple-600' },
  { value: '#059669', label: 'Green', bg: 'bg-green-600' },
];

/**
 * Enhanced Text Block Form with comprehensive typography, layout, and styling options
 */
export function TextBlockFormEnhanced({ formData, updateField }: TextBlockFormEnhancedProps) {
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [showPreview, setShowPreview] = useState(false);

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'content', label: 'Content', icon: '📝' },
    { id: 'typography', label: 'Typography', icon: '🔤' },
    { id: 'layout', label: 'Layout', icon: '📐' },
    { id: 'styling', label: 'Styling', icon: '🎨' },
    { id: 'advanced-styling', label: 'Advanced', icon: '✨' },
    { id: 'responsive', label: 'Responsive', icon: '📱' },
    { id: 'animations', label: 'Animation', icon: '🎬' },
    { id: 'seo', label: 'SEO', icon: '📊' },
    { id: 'versioning', label: 'History', icon: '⏱️' },
    { id: 'preview', label: 'Preview', icon: '👁️' },
  ];

  // Calculate preview styles
  const getPreviewStyles = () => {
    const sizeMap: Record<string, string> = {
      'sm': '14px',
      'base': '16px',
      'lg': '18px',
      'xl': '20px',
    };

    const spacingMap: Record<string, string> = {
      'normal': '0',
      'wide': '0.1em',
      'extra-wide': '0.15em',
    };

    return {
      fontSize: sizeMap[formData.fontSize] || '16px',
      lineHeight: formData.lineHeight || '1.8',
      letterSpacing: spacingMap[formData.letterSpacing] || '0',
      fontWeight: formData.fontWeight === 'semibold' ? '600' : formData.fontWeight === 'medium' ? '500' : '400',
      textAlign: formData.textAlign || 'left',
      color: formData.textColor || '#000000',
    };
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input
              dir="ltr"
              type="text"
              value={formData.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Section title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Text Style (preset styling)
              </label>
              <TextBlockTemplateButton
                onSelect={(templateContent) => {
                  // Merge template content with current form data
                  updateField('title', templateContent.title || formData.title);
                  updateField('body', templateContent.body || formData.body);
                  if (templateContent.text_style) updateField('text_style', templateContent.text_style);
                  if (templateContent.fontSize) updateField('fontSize', templateContent.fontSize);
                  if (templateContent.lineHeight) updateField('lineHeight', templateContent.lineHeight);
                  if (templateContent.textAlign) updateField('textAlign', templateContent.textAlign);
                }}
              />
            </div>
            <select
              value={formData.text_style || 'default'}
              onChange={(e) => updateField('text_style', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="default">Default - Regular body text</option>
              <option value="intro">Intro - Large introductory text</option>
              <option value="highlight">Highlight - Callout with blue background</option>
              <option value="quote">Quote - Emphasized quote or testimonial</option>
              <option value="subtitle">Subtitle - Secondary heading text</option>
              <option value="muted">Muted - Subtle secondary text</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Choose a preset style, then customize with tabs below.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              dir="ltr"
              value={formData.body || ''}
              onChange={(e) => updateField('body', e.target.value)}
              placeholder="Enter your text content. You can use line breaks, lists, and emphasis (use *asterisks* for bold, _underscores_ for italic)."
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-2">
              Use line breaks for paragraphs. Supports Markdown-style formatting.
            </p>
            
            {/* Content Statistics */}
            <ContentStatistics content={formData.body || ''} />
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Font Size for Body Text
            </label>
            <div className="grid grid-cols-2 gap-3">
              {FONT_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('fontSize', option.value)}
                  className={`p-3 text-center rounded-lg border-2 transition-all ${
                    formData.fontSize === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-xs text-gray-700">{option.label}</div>
                  <div style={{ fontSize: option.preview }} className="mt-2 text-gray-600">
                    Aa
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Line Height (spacing between lines)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {LINE_HEIGHT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('lineHeight', option.value)}
                  className={`p-4 text-center rounded-lg border-2 transition-all ${
                    formData.lineHeight === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ lineHeight: option.value }}
                >
                  <div className="text-xs text-gray-700 mb-2">{option.label}</div>
                  <div className="text-sm text-gray-600">
                    Line one<br/>
                    Line two<br/>
                    Line three
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Letter Spacing
            </label>
            <div className="grid grid-cols-3 gap-3">
              {LETTER_SPACING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('letterSpacing', option.value)}
                  className={`p-3 text-center rounded-lg border-2 transition-all ${
                    formData.letterSpacing === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-700 mb-2">{option.label}</div>
                  <div
                    className="text-sm text-gray-600 font-semibold"
                    style={
                      option.value === 'normal'
                        ? { letterSpacing: '0' }
                        : option.value === 'wide'
                          ? { letterSpacing: '0.1em' }
                          : { letterSpacing: '0.15em' }
                    }
                  >
                    LETTER
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Font Weight for Body
            </label>
            <div className="grid grid-cols-3 gap-3">
              {FONT_WEIGHT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('fontWeight', option.value)}
                  className={`p-3 text-center rounded-lg border-2 transition-all ${
                    formData.fontWeight === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div
                    className="text-sm text-gray-600"
                    style={{
                      fontWeight: option.value === 'semibold' ? '600' : option.value === 'medium' ? '500' : '400',
                    }}
                  >
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Layout Tab */}
      {activeTab === 'layout' && (
        <div className="space-y-6">
          {/* Text Alignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Text Alignment
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TEXT_ALIGN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('textAlign', option.value)}
                  className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                    formData.textAlign === option.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Container Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Container Width (how wide the text area is)
            </label>
            <div className="space-y-2">
              {CONTAINER_WIDTH_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="containerWidth"
                    value={option.value}
                    checked={formData.containerWidth === option.value}
                    onChange={(e) => updateField('containerWidth', e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Column Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Column Layout
            </label>
            <div className="grid grid-cols-3 gap-3">
              {COLUMN_LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('columnLayout', option.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.columnLayout === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-700 mb-2">{option.label}</div>
                  <div className="flex gap-1">
                    {Array.from({ length: option.cols }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-6 border border-gray-400 rounded ${
                          formData.columnLayout === option.value ? 'bg-blue-200' : 'bg-gray-100'
                        }`}
                      ></div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Column Gap (only show if not single column) */}
          {formData.columnLayout !== 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Space Between Columns
              </label>
              <div className="grid grid-cols-3 gap-3">
                {COLUMN_GAP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateField('columnGap', option.value)}
                    className={`p-3 text-center rounded-lg border-2 transition-all ${
                      formData.columnGap === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-700">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Styling Tab */}
      {activeTab === 'styling' && (
        <div className="space-y-6">
          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Text Color
            </label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {TEXT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateField('textColor', preset.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.textColor === preset.value
                      ? 'border-gray-900 ring-2 ring-blue-400'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`h-6 w-full rounded mb-2 border ${preset.bg}`}></div>
                  <div className="text-xs font-medium text-gray-700">{preset.label}</div>
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-2 block">Or enter custom color</label>
              <input
                type="color"
                value={formData.textColor || '#000000'}
                onChange={(e) => updateField('textColor', e.target.value)}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Heading Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Heading Color
            </label>
            <div>
              <input
                type="color"
                value={formData.headingColor || '#1f2937'}
                onChange={(e) => updateField('headingColor', e.target.value)}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Color for h1, h2, h3, etc. headings
              </p>
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Background Color
            </label>
            <div>
              <input
                type="color"
                value={formData.backgroundColor || '#ffffff'}
                onChange={(e) => updateField('backgroundColor', e.target.value)}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                Background color for the entire text section
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Styling Tab (Phase 2) */}
      {activeTab === 'advanced-styling' && (
        <AdvancedStylingPanel 
          formData={formData} 
          updateField={updateField} 
        />
      )}

      {/* Responsive Design Tab (Phase 2) */}
      {activeTab === 'responsive' && (
        <ResponsiveDesignPanel 
          formData={formData} 
          updateField={updateField} 
        />
      )}

      {/* Animations Tab (Phase 3) */}
      {activeTab === 'animations' && (
        <AnimationEffectsPanel 
          formData={formData} 
          updateField={updateField} 
        />
      )}

      {/* SEO Validation Tab (Phase 3) */}
      {activeTab === 'seo' && (
        <AdvancedSEOValidation content={formData} />
      )}

      {/* Content Versioning Tab (Phase 3) */}
      {activeTab === 'versioning' && (
        <ContentVersioningPanel
          currentContent={formData}
          onRestore={async (restoredContent: any) => {
            Object.entries(restoredContent).forEach(([key, value]) => {
              updateField(key as any, value);
            });
          }}
        />
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>

          {showPreview && (
            <div className="space-y-4">
              {/* Desktop Preview */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                  <p className="text-xs font-medium text-gray-600">Desktop View</p>
                </div>
                <div
                  className="p-8 min-h-96"
                  style={{
                    backgroundColor: formData.backgroundColor || '#ffffff',
                  }}
                >
                  {formData.title && (
                    <h2
                      className="text-2xl font-bold mb-6"
                      style={{
                        color: formData.headingColor || '#1f2937',
                      }}
                    >
                      {formData.title}
                    </h2>
                  )}

                  <div
                    className={`${
                      formData.columnLayout === 'two'
                        ? 'grid grid-cols-2 gap-6'
                        : formData.columnLayout === 'three'
                          ? 'grid grid-cols-3 gap-6'
                          : ''
                    }`}
                  >
                    <div
                      style={getPreviewStyles()}
                      className="whitespace-pre-wrap break-words"
                    >
                      {formData.body || 'Your text will appear here...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Preview */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                  <p className="text-xs font-medium text-gray-600">Mobile View (single column)</p>
                </div>
                <div
                  className="p-4 min-h-96 max-w-sm"
                  style={{
                    backgroundColor: formData.backgroundColor || '#ffffff',
                  }}
                >
                  {formData.title && (
                    <h2
                      className="text-xl font-bold mb-4"
                      style={{
                        color: formData.headingColor || '#1f2937',
                      }}
                    >
                      {formData.title}
                    </h2>
                  )}
                  <div
                    style={getPreviewStyles()}
                    className="whitespace-pre-wrap break-words text-sm"
                  >
                    {formData.body || 'Your text will appear here...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showPreview && (
            <div className="text-center py-12 text-gray-500 border border-gray-300 rounded-lg bg-gray-50">
              <p>Click "Show Preview" to see how your text will appear</p>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> Use the tabs above to customize every aspect of your text section. Check the Preview tab to see your changes in real-time!
        </p>
      </div>
    </div>
  );
}

/**
 * Content Statistics Component
 * Shows word count, character count, reading time, and SEO recommendations
 */
function ContentStatistics({ content }: { content: string }) {
  // Calculate statistics
  const charCount = content.length;
  const charCountNoSpaces = content.replace(/\s+/g, '').length;
  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const readingTimeMinutes = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordLength = wordCount > 0 ? (charCountNoSpaces / wordCount).toFixed(1) : 0;

  // SEO recommendations
  const seoChecks = [
    {
      label: 'Word Count',
      value: wordCount,
      optimal: wordCount >= 100 && wordCount <= 2500,
      recommendation: wordCount < 100 ? '📉 Too short (aim for 100+)' : wordCount > 2500 ? '📈 Very long (consider splitting)' : '✅ Good length',
    },
    {
      label: 'Character Count',
      value: charCount,
      optimal: charCount >= 300,
      recommendation: charCount < 300 ? '📉 Too short (aim for 300+)' : '✅ Good',
    },
  ];

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 space-y-3">
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-white rounded p-2">
          <div className="text-2xl font-bold text-blue-600">{wordCount}</div>
          <div className="text-xs text-gray-600 font-medium">Words</div>
        </div>
        <div className="bg-white rounded p-2">
          <div className="text-2xl font-bold text-purple-600">{charCount}</div>
          <div className="text-xs text-gray-600 font-medium">Characters</div>
        </div>
        <div className="bg-white rounded p-2">
          <div className="text-2xl font-bold text-green-600">{readingTimeMinutes}</div>
          <div className="text-xs text-gray-600 font-medium">Min Read</div>
        </div>
        <div className="bg-white rounded p-2">
          <div className="text-2xl font-bold text-orange-600">{sentences}</div>
          <div className="text-xs text-gray-600 font-medium">Sentences</div>
        </div>
      </div>

      {/* SEO Recommendations */}
      <div className="bg-white rounded p-3 border border-slate-200 space-y-2">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          📊 Content Quality Guidelines
        </div>
        {seoChecks.map((check, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="text-slate-600">{check.label}:</span>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${check.optimal ? 'text-green-600' : 'text-orange-600'}`}>
                {check.value}
              </span>
              <span className="text-slate-500">{check.recommendation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
