import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, AlertTriangle } from 'lucide-react';
import { TextSectionContent, TextSectionNew } from './TextSectionNew';

export interface TextBlockFormNewProps {
  formData: TextSectionContent;
  updateField: (key: keyof TextSectionContent, value: any) => void;
  errors: string[];
  warnings: string[];
}

const TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small', size: '14px' },
  { value: 'md', label: 'Medium', size: '16px' },
  { value: 'lg', label: 'Large', size: '18px' }
];
const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '⬅️ Left' },
  { value: 'center', label: '⬇️ Center' },
  { value: 'right', label: '➡️ Right' }
];
const LAYOUT_OPTIONS = [
  { value: 'single', label: 'Single column', icon: '📄' },
  { value: 'two-column', label: 'Two columns', icon: '📰' },
  { value: 'three-column', label: 'Three columns', icon: '📑' }
];
const PADDING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' }
];

export function TextBlockFormNew({ formData, updateField, errors, warnings }: TextBlockFormNewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(formData);

  function handleFieldChange(key: keyof TextSectionContent, value: any) {
    updateField(key, value);
    setPreviewData({ ...formData, [key]: value });
  }

  return (
    <div className="space-y-6">
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <h4 className="font-semibold text-red-900">Validation errors</h4>
          </div>
          <ul className="space-y-2">
            {errors.map((err, idx) => (
              <li key={idx} className="text-sm text-red-700">
                <span className="font-medium">• {err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <h4 className="font-semibold text-yellow-900">Content warnings</h4>
          </div>
          <ul className="space-y-2">
            {warnings.map((warn, idx) => (
              <li key={idx} className="text-sm text-yellow-700">
                <span className="font-medium">⚠ {warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Content Block */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Content</h3>

        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section Title (optional)
          </label>
          <input
            type="text"
            dir="ltr"
            value={formData.title || ''}
            onChange={e => handleFieldChange('title', e.target.value)}
            placeholder="e.g., About Our Service, Why Choose Us"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Body Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content <span className="text-red-600 font-bold">*</span>
          </label>
          <textarea
            dir="ltr"
            value={formData.body || ''}
            onChange={e => handleFieldChange('body', e.target.value)}
            placeholder="Enter your content here. Use blank lines to create new paragraphs."
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Press Enter twice to create a new paragraph
          </p>
        </div>
      </div>

      {/* 2. Typography Section */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Typography</h3>

        {/* Text Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TEXT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFieldChange('textSize', opt.value)}
                className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.textSize === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
                style={{ fontSize: opt.size }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Alignment
          </label>
          <div className="flex gap-2">
            {TEXT_ALIGN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFieldChange('textAlign', opt.value)}
                className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                  formData.textAlign === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Layout Section */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Layout</h3>

        {/* Layout Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Layout
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFieldChange('layout', opt.value)}
                className={`px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  formData.layout === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Padding */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vertical Spacing
          </label>
          <div className="grid grid-cols-5 gap-2">
            {PADDING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFieldChange('padding', opt.value)}
                className={`px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                  formData.padding === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Colors Section */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Colors</h3>

        {/* Text Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.textColor || '#000000'}
              onChange={(e) => handleFieldChange('textColor', e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-600 font-mono">{formData.textColor || '#000000'}</span>
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.backgroundColor || '#ffffff'}
              onChange={(e) => handleFieldChange('backgroundColor', e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-gray-600 font-mono">{formData.backgroundColor || '#ffffff'}</span>
          </div>
        </div>
      </div>

      {/* 5. Live Preview Section */}
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
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <TextSectionNew content={previewData} />
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          ✨ <strong>Pro Tip:</strong> Keep your content concise and well-organized. Responsive grid layouts automatically adjust on mobile devices.
        </p>
      </div>
    </div>
  );
}
