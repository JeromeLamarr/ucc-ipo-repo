/**
 * Simplified Text Block Form
 * Clean, user-friendly interface for editing text sections
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface TextBlockFormSimpleProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
}

export function TextBlockFormSimple({ formData, updateField }: TextBlockFormSimpleProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-6">
      {/* Title Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Section Title (optional)
        </label>
        <input
          dir="ltr"
          type="text"
          value={formData.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., About Our Service, Why Choose Us, etc."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Body Content Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content *
        </label>
        <textarea
          dir="ltr"
          value={formData.body || ''}
          onChange={(e) => updateField('body', e.target.value)}
          placeholder="Enter your content here. Use blank lines to create new paragraphs."
          rows={12}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Press Enter twice to create a new paragraph
        </p>
      </div>

      {/* Display Options */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Display Options</h3>

        {/* Text Alignment */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Alignment
          </label>
          <div className="flex gap-2">
            {[
              { value: 'left', label: '⬅️ Left', icon: 'text-left' },
              { value: 'center', label: '⬇️ Center', icon: 'text-center' },
              { value: 'right', label: '➡️ Right', icon: 'text-right' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateField('textAlign', option.value)}
                className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                  formData.textAlign === option.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'sm', label: 'Small', size: '14px' },
              { value: 'base', label: 'Normal', size: '16px' },
              { value: 'lg', label: 'Large', size: '18px' },
              { value: 'xl', label: 'Extra Large', size: '20px' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => updateField('fontSize', option.value)}
                className={`px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                  formData.fontSize === option.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
                style={{ fontSize: option.size }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.textColor || '#000000'}
              onChange={(e) => updateField('textColor', e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-600">{formData.textColor || '#000000'}</span>
          </div>
        </div>

        {/* Background Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.backgroundColor || '#ffffff'}
              onChange={(e) => updateField('backgroundColor', e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-600">{formData.backgroundColor || '#ffffff'}</span>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPreview && (
          <div
            className="border border-gray-300 rounded-lg p-6 min-h-64"
            style={{ backgroundColor: formData.backgroundColor || '#ffffff' }}
          >
            {formData.title && (
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: formData.textColor || '#000000', textAlign: formData.textAlign || 'left' }}
              >
                {formData.title}
              </h2>
            )}
            {formData.body && (
              <div
                style={{
                  color: formData.textColor || '#000000',
                  textAlign: formData.textAlign || 'left',
                  fontSize: { 'sm': '14px', 'base': '16px', 'lg': '18px', 'xl': '20px' }[formData.fontSize || 'base'],
                  lineHeight: '1.6',
                }}
              >
                {formData.body.split('\n\n').map((para, idx) => (
                  <p key={idx} className="mb-4 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          ✨ <strong>Pro Tip:</strong> Keep your content concise and well-organized. Use clear paragraphs and avoid excessive formatting for best readability.
        </p>
      </div>
    </div>
  );
}
