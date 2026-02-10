import React, { useState } from 'react';
import { TextSectionContent, TextSectionNew } from './TextSectionNew';

export interface TextBlockFormNewProps {
  formData: TextSectionContent;
  updateField: (key: keyof TextSectionContent, value: any) => void;
  errors: string[];
  warnings: string[];
}

const TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' }
];
const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
];
const LAYOUT_OPTIONS = [
  { value: 'single', label: 'Single column' },
  { value: 'two-column', label: 'Two columns' },
  { value: 'three-column', label: 'Three columns' }
];
const PADDING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' }
];

export function TextBlockFormNew({ formData, updateField, errors, warnings }: TextBlockFormNewProps) {
  // Live preview state (optional, can be removed if not needed)
  const [previewData, setPreviewData] = useState(formData);

  // Update preview on form change
  function handleFieldChange(key: keyof TextSectionContent, value: any) {
    updateField(key, value);
    setPreviewData({ ...formData, [key]: value });
  }

  return (
    <div className="text-block-form-new">
      {/* 1. Content Block */}
      <div>
        <label>Title (optional):</label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={e => handleFieldChange('title', e.target.value)}
          placeholder="Section title"
        />
      </div>
      <div>
        <label>Body <span style={{ color: 'red' }}>*</span></label>
        <textarea
          value={formData.body}
          onChange={e => handleFieldChange('body', e.target.value)}
          rows={6}
          placeholder="Enter your text here. Double line breaks create new paragraphs."
        />
      </div>
      {/* 2. Typography */}
      <div>
        <label>Text Size:</label>
        <select
          value={formData.textSize || 'md'}
          onChange={e => handleFieldChange('textSize', e.target.value)}
        >
          {TEXT_SIZE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Text Alignment:</label>
        <select
          value={formData.textAlign || 'left'}
          onChange={e => handleFieldChange('textAlign', e.target.value)}
        >
          {TEXT_ALIGN_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* 3. Layout */}
      <div>
        <label>Layout:</label>
        <select
          value={formData.layout || 'single'}
          onChange={e => handleFieldChange('layout', e.target.value)}
        >
          {LAYOUT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Vertical Padding:</label>
        <select
          value={formData.padding || 'md'}
          onChange={e => handleFieldChange('padding', e.target.value)}
        >
          {PADDING_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* 4. Colors */}
      <div>
        <label>Text Color:</label>
        <input
          type="color"
          value={formData.textColor || '#000000'}
          onChange={e => handleFieldChange('textColor', e.target.value)}
        />
      </div>
      <div>
        <label>Background Color:</label>
        <input
          type="color"
          value={formData.backgroundColor || '#ffffff'}
          onChange={e => handleFieldChange('backgroundColor', e.target.value)}
        />
      </div>
      {/* 5. Errors & Warnings */}
      {errors.length > 0 && (
        <div style={{ color: 'red' }}>
          {errors.map((err, i) => <div key={i}>{err}</div>)}
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ color: 'orange' }}>
          {warnings.map((warn, i) => <div key={i}>{warn}</div>)}
        </div>
      )}
      {/* 6. Live Preview */}
      <div style={{ marginTop: '2rem', border: '1px solid #eee', padding: '1rem', background: '#fafafa' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Live Preview:</div>
        <TextSectionNew content={previewData} />
      </div>
    </div>
  );
}
