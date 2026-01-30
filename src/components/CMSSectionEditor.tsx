import { useState, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { BACKGROUND_PRESETS, ICON_COLOR_PRESETS, findPresetName } from '../lib/stylePresets';
import { validateSection, formatFieldName } from '../lib/sectionValidation';

interface CMSSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
}

interface CMSSectionEditorProps {
  section: CMSSection;
  onSave: (content: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export function CMSSectionEditor({ section, onSave, onCancel, saving }: CMSSectionEditorProps) {
  const [formData, setFormData] = useState(section.content);
  const [error, setError] = useState<string | null>(null);

  // Validate in real-time
  const validation = useMemo(() => {
    return validateSection(section.section_type, formData);
  }, [formData, section.section_type]);

  const handleSave = async () => {
    setError(null);
    
    // Check for hard errors (cannot save with these)
    if (!validation.isValid) {
      setError(`Cannot save: ${validation.errors[0]?.message || 'Please fix validation errors'}`);
      return;
    }

    // Basic validation
    if (!formData || Object.keys(formData).length === 0) {
      setError('Please fill in at least one field');
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save block');
    }
  };

  const updateField = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const addArrayItem = (key: string, template: Record<string, any>) => {
    const currentArray = Array.isArray(formData[key]) ? formData[key] : [];
    setFormData({ ...formData, [key]: [...currentArray, template] });
  };

  const removeArrayItem = (key: string, index: number) => {
    const currentArray = Array.isArray(formData[key]) ? formData[key] : [];
    setFormData({ 
      ...formData, 
      [key]: currentArray.filter((_, i) => i !== index) 
    });
  };

  const updateArrayItem = (key: string, index: number, field: string, value: any) => {
    const currentArray = Array.isArray(formData[key]) ? formData[key] : [];
    currentArray[index] = { ...currentArray[index], [field]: value };
    setFormData({ ...formData, [key]: [...currentArray] });
  };

  return (
    <div className="space-y-6">
      {/* Main Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Validation Errors (Blocking) */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-semibold text-red-900">Required fields are missing</h4>
          </div>
          <ul className="space-y-2">
            {validation.errors.map((err, idx) => (
              <li key={idx} className="text-sm text-red-700">
                <span className="font-medium">• {formatFieldName(err.field)}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation Warnings (Non-blocking) */}
      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h4 className="font-semibold text-yellow-900">Content warnings</h4>
          </div>
          <ul className="space-y-2">
            {validation.warnings.map((warn, idx) => (
              <li key={idx} className="text-sm text-yellow-700">
                <span className="font-medium">⚠ {formatFieldName(warn.field)}:</span> {warn.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {section.section_type === 'hero' && (
        <HeroBlockForm formData={formData} updateField={updateField} />
      )}

      {section.section_type === 'features' && (
        <FeaturesBlockForm 
          formData={formData} 
          updateField={updateField}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
          updateArrayItem={updateArrayItem}
        />
      )}

      {section.section_type === 'steps' && (
        <StepsBlockForm 
          formData={formData} 
          updateField={updateField}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
          updateArrayItem={updateArrayItem}
        />
      )}

      {section.section_type === 'text' && (
        <TextBlockForm formData={formData} updateField={updateField} />
      )}

      {section.section_type === 'categories' && (
        <CategoriesBlockForm 
          formData={formData} 
          updateField={updateField}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
        />
      )}

      {section.section_type === 'cta' && (
        <CTABlockForm formData={formData} updateField={updateField} />
      )}

      {section.section_type === 'gallery' && (
        <GalleryBlockForm 
          formData={formData} 
          updateField={updateField}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
          updateArrayItem={updateArrayItem}
        />
      )}

      {section.section_type === 'showcase' && (
        <ShowcaseBlockForm 
          formData={formData} 
          updateField={updateField}
          addArrayItem={addArrayItem}
          removeArrayItem={removeArrayItem}
          updateArrayItem={updateArrayItem}
        />
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving || !validation.isValid}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title={!validation.isValid ? 'Fix validation errors before saving' : undefined}
        >
          {saving ? 'Saving...' : 'Save Block'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Hero Block Form
// ============================================================================

function HeroBlockForm({ formData, updateField }: any) {
  const validation = useMemo(() => {
    return validateSection('hero', formData);
  }, [formData]);

  return (
    <div className="space-y-4">
      {/* Headline - Required */}
      <div className={validation.errors.some(e => e.field === 'headline') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Main Headline
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'headline') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <input
          type="text"
          value={formData.headline || ''}
          onChange={(e) => updateField('headline', e.target.value)}
          placeholder="e.g., Welcome to UCC IP Office"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'headline')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'headline') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'headline')?.message}
          </p>
        )}
      </div>

      {/* Highlighted Text - Optional */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Highlighted Text (optional)
        </label>
        <input
          type="text"
          value={formData.headline_highlight || ''}
          onChange={(e) => updateField('headline_highlight', e.target.value)}
          placeholder="e.g., Protect Your Innovation"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">This text will appear in the primary color</p>
      </div>

      {/* Subheadline - Required */}
      <div className={validation.errors.some(e => e.field === 'subheadline') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Subheadline
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'subheadline') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <textarea
          value={formData.subheadline || ''}
          onChange={(e) => updateField('subheadline', e.target.value)}
          placeholder="Brief description of your page"
          rows={2}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'subheadline')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'subheadline') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'subheadline')?.message}
          </p>
        )}
      </div>

      {/* Button Text - Required */}
      <div className={validation.errors.some(e => e.field === 'cta_text') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Button Text
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'cta_text') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <input
          type="text"
          value={formData.cta_text || ''}
          onChange={(e) => updateField('cta_text', e.target.value)}
          placeholder="e.g., Get Started"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'cta_text')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'cta_text') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'cta_text')?.message}
          </p>
        )}
      </div>

      {/* Button Link - Required + Validation */}
      <div className={validation.errors.some(e => e.field === 'cta_link') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Button Link
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'cta_link') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <input
          type="text"
          value={formData.cta_link || ''}
          onChange={(e) => updateField('cta_link', e.target.value)}
          placeholder="e.g., /register"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'cta_link')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'cta_link') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'cta_link')?.message}
          </p>
        )}
        {!validation.errors.find(e => e.field === 'cta_link') && (
          <p className="text-xs text-gray-500 mt-1">Use "/" for internal links (/register) or full URL (https://...)</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Features Block Form
// ============================================================================

function FeaturesBlockForm({ formData, addArrayItem, removeArrayItem, updateArrayItem }: any) {
  const features = Array.isArray(formData.features) ? formData.features : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Features ({features.length})
        </label>
        <button
          onClick={() => addArrayItem('features', { title: '', description: '', icon_bg_color: 'bg-blue-100', icon_color: 'text-blue-600' })}
          className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          + Add Feature
        </button>
      </div>

      {features.map((feature: any, idx: number) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Feature {idx + 1}</h4>
            <button
              onClick={() => removeArrayItem('features', idx)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={feature.title || ''}
              onChange={(e) => updateArrayItem('features', idx, 'title', e.target.value)}
              placeholder="Feature title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={feature.description || ''}
              onChange={(e) => updateArrayItem('features', idx, 'description', e.target.value)}
              placeholder="Feature description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Icon Color</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ICON_COLOR_PRESETS).map(([name, colors]) => (
                <button
                  key={name}
                  onClick={() => {
                    updateArrayItem('features', idx, 'icon_bg_color', (colors as any).bg);
                    updateArrayItem('features', idx, 'icon_color', (colors as any).text);
                  }}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border-2 flex items-center justify-center ${
                    feature.icon_bg_color === (colors as any).bg
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-lg ${(colors as any).text}`}>●</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{Object.keys(ICON_COLOR_PRESETS).find(k => ICON_COLOR_PRESETS[k as keyof typeof ICON_COLOR_PRESETS].bg === feature.icon_bg_color) || 'Select color'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Steps Block Form
// ============================================================================

function StepsBlockForm({ formData, updateField, addArrayItem, removeArrayItem, updateArrayItem }: any) {
  const steps = Array.isArray(formData.steps) ? formData.steps : [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Section Title
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., How It Works"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Steps ({steps.length})
        </label>
        <button
          onClick={() => addArrayItem('steps', { number: steps.length + 1, label: '', description: '' })}
          className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          + Add Step
        </button>
      </div>

      {steps.map((step: any, idx: number) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Step {idx + 1}</h4>
            <button
              onClick={() => removeArrayItem('steps', idx)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Label *</label>
            <input
              type="text"
              value={step.label || ''}
              onChange={(e) => updateArrayItem('steps', idx, 'label', e.target.value)}
              placeholder="e.g., Register"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={step.description || ''}
              onChange={(e) => updateArrayItem('steps', idx, 'description', e.target.value)}
              placeholder="Step description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Text Block Form
// ============================================================================

function TextBlockForm({ formData, updateField }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title (optional)
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Section title"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Text Style
        </label>
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
          Choose a style to automatically format your text appropriately.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content *
        </label>
        <textarea
          value={formData.body || ''}
          onChange={(e) => updateField('body', e.target.value)}
          placeholder='Enter your text content. Format with line breaks and spacing as needed.'
          rows={8}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          Write plain text only. Use line breaks to separate paragraphs. No HTML tags needed.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Categories Block Form
// ============================================================================

function CategoriesBlockForm({ formData, updateField, addArrayItem, removeArrayItem }: any) {
  const categories = Array.isArray(formData.categories) ? formData.categories : [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., IP Categories We Support"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Categories ({categories.length})
        </label>
        <button
          onClick={() => addArrayItem('categories', '')}
          className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          + Add Category
        </button>
      </div>

      <div className="space-y-2">
        {categories.map((category: string, idx: number) => (
          <div key={idx} className="flex gap-2">
            <input
              type="text"
              value={category}
              onChange={(e) => {
                const updated = [...categories];
                updated[idx] = e.target.value;
                updateField('categories', updated);
              }}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={() => removeArrayItem('categories', idx)}
              className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
              title="Remove category"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CTA Block Form
// ============================================================================

function CTABlockForm({ formData, updateField }: any) {
  const selectedBg = findPresetName('background', formData.background_color) || 'Custom';
  const validation = useMemo(() => {
    return validateSection('cta', formData);
  }, [formData]);

  return (
    <div className="space-y-4">
      {/* Heading - Required */}
      <div className={validation.errors.some(e => e.field === 'heading') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Heading
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'heading') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <input
          type="text"
          value={formData.heading || ''}
          onChange={(e) => updateField('heading', e.target.value)}
          placeholder="e.g., Start Your Journey Today"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'heading')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'heading') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'heading')?.message}
          </p>
        )}
      </div>

      {/* Description - Required */}
      <div className={validation.errors.some(e => e.field === 'description') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Description
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'description') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Descriptive text for the CTA"
          rows={3}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'description')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'description') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'description')?.message}
          </p>
        )}
      </div>

      {/* Background Color - Warning if missing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Background Color
          {validation.warnings.some(w => w.field === 'background_color') && (
            <span className="text-yellow-600 text-xs font-semibold">⚠ WARNING</span>
          )}
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(BACKGROUND_PRESETS).map(([name, value]) => (
              <button
                key={name}
                onClick={() => updateField('background_color', value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                  selectedBg === name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Selected: {selectedBg === 'Custom' ? formData.background_color : selectedBg}
          </p>
          {validation.warnings.find(w => w.field === 'background_color') && (
            <p className="text-xs text-yellow-600">
              ⚠ {validation.warnings.find(w => w.field === 'background_color')?.message}
            </p>
          )}
        </div>
      </div>

      {/* Button Text - Required */}
      <div className={validation.errors.some(e => e.field === 'button_text') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Button Text
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'button_text') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <input
          type="text"
          value={formData.button_text || ''}
          onChange={(e) => updateField('button_text', e.target.value)}
          placeholder="e.g., Register Now"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'button_text')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'button_text') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'button_text')?.message}
          </p>
        )}
      </div>

      {/* Button Link - Required + Validation */}
      <div className={validation.errors.some(e => e.field === 'button_link') ? 'p-3 rounded-lg bg-red-50 border border-red-200' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          Button Link
          <span className="text-red-600 font-bold">*</span>
          {validation.errors.some(e => e.field === 'button_link') && (
            <span className="text-red-600 text-xs font-semibold">ERROR</span>
          )}
        </label>
        <input
          type="text"
          value={formData.button_link || ''}
          onChange={(e) => updateField('button_link', e.target.value)}
          placeholder="e.g., /register"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
            validation.errors.some(e => e.field === 'button_link')
              ? 'border-red-300 bg-white focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {validation.errors.find(e => e.field === 'button_link') && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            ✗ {validation.errors.find(e => e.field === 'button_link')?.message}
          </p>
        )}
        {!validation.errors.find(e => e.field === 'button_link') && (
          <p className="text-xs text-gray-500 mt-1">Use "/" for internal links (/register) or full URL (https://...)</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Gallery Block Form
// ============================================================================

function GalleryBlockForm({ formData, updateField, addArrayItem, removeArrayItem, updateArrayItem }: any) {
  const images = Array.isArray(formData.images) ? formData.images : [];
  const [draggedImageIdx, setDraggedImageIdx] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleImageDragStart = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    setDraggedImageIdx(idx);
    setIsDragging(true);
  };

  const handleImageDragMove = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || draggedImageIdx !== idx) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    
    // Calculate position as percentage (0-100)
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Store offset in image data
    updateArrayItem('images', idx, 'offset_x', Math.round(x));
    updateArrayItem('images', idx, 'offset_y', Math.round(y));
  };

  const handleImageDragEnd = () => {
    setIsDragging(false);
    setDraggedImageIdx(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Title
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., Photo Gallery"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Images ({images.length})
        </label>
        <button
          onClick={() => addArrayItem('images', { url: '', alt_text: '', caption: '', offset_x: 50, offset_y: 50 })}
          className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          + Add Image
        </button>
      </div>

      {images.map((image: any, idx: number) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Image {idx + 1}</h4>
            <button
              onClick={() => removeArrayItem('images', idx)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Image URL *</label>
            <input
              type="text"
              value={image.url || ''}
              onChange={(e) => updateArrayItem('images', idx, 'url', e.target.value)}
              placeholder="https://bucket.supabase.co/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alt Text *</label>
            <input
              type="text"
              value={image.alt_text || ''}
              onChange={(e) => updateArrayItem('images', idx, 'alt_text', e.target.value)}
              placeholder="Description for screen readers"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={image.caption || ''}
              onChange={(e) => updateArrayItem('images', idx, 'caption', e.target.value)}
              placeholder="Image caption shown below photo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {image.url && (
            <div className="mt-3 p-3 bg-white rounded border border-gray-300">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Adjust Image Position (Drag to position)
              </label>
              <div
                className="w-full h-48 bg-gray-200 rounded cursor-move overflow-hidden relative"
                onMouseDown={(e) => handleImageDragStart(idx, e)}
                onMouseMove={(e) => handleImageDragMove(idx, e)}
                onMouseUp={handleImageDragEnd}
                onMouseLeave={handleImageDragEnd}
                style={{ cursor: isDragging && draggedImageIdx === idx ? 'grabbing' : 'grab' }}
              >
                <img
                  src={image.url}
                  alt="preview"
                  className="w-full h-full object-cover pointer-events-none"
                  style={{
                    objectPosition: `${image.offset_x || 50}% ${image.offset_y || 50}%`,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {!image.url || (image.url && !image.offset_x) && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                    Drag to adjust view
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Position: {image.offset_x || 50}% horizontal, {image.offset_y || 50}% vertical
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
// ============================================================================
// Showcase Block Form
// ============================================================================

function ShowcaseBlockForm({ formData, updateField, addArrayItem, removeArrayItem, updateArrayItem }: any) {
  const items = Array.isArray(formData.items) ? formData.items : [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Showcase Title
        </label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., Our Achievements"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Items ({items.length})
        </label>
        <button
          onClick={() => addArrayItem('items', { 
            title: '', 
            description: '', 
            image_url: '',
            image_width: 300,
            image_height: 300,
            image_position: 'center'
          })}
          className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
        >
          + Add Item
        </button>
      </div>

      {items.map((item: any, idx: number) => (
        <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Item {idx + 1}</h4>
            <button
              onClick={() => removeArrayItem('items', idx)}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>

          {/* Item Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Item Title</label>
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => updateArrayItem('items', idx, 'title', e.target.value)}
              placeholder="Item title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={item.description || ''}
              onChange={(e) => updateArrayItem('items', idx, 'description', e.target.value)}
              placeholder="Item description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Image Management */}
          <div className="bg-white p-3 rounded border border-blue-200">
            <h5 className="text-xs font-semibold text-gray-900 mb-3">Image Settings</h5>

            {/* Image URL */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="text"
                value={item.image_url || ''}
                onChange={(e) => updateArrayItem('items', idx, 'image_url', e.target.value)}
                placeholder="https://bucket.supabase.co/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Image Preview */}
            {item.image_url && (
              <div className="mb-3 p-2 bg-gray-100 rounded border border-gray-300">
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{
                    width: `${item.image_width || 300}px`,
                    height: `${item.image_height || 300}px`,
                    objectFit: 'cover',
                    margin: '0 auto',
                    display: 'block'
                  }}
                  className="rounded"
                />
              </div>
            )}

            {/* Image Dimensions */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={item.image_width || 300}
                  onChange={(e) => updateArrayItem('items', idx, 'image_width', parseInt(e.target.value) || 300)}
                  min="100"
                  max="800"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={item.image_height || 300}
                  onChange={(e) => updateArrayItem('items', idx, 'image_height', parseInt(e.target.value) || 300)}
                  min="100"
                  max="800"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Image Position */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Image Position</label>
              <select
                value={item.image_position || 'center'}
                onChange={(e) => updateArrayItem('items', idx, 'image_position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}