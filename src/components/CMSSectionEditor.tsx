import { useState } from 'react';
import { X } from 'lucide-react';

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

  const handleSave = async () => {
    setError(null);
    
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
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
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

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
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
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Main Headline *
        </label>
        <input
          type="text"
          value={formData.headline || ''}
          onChange={(e) => updateField('headline', e.target.value)}
          placeholder="e.g., Welcome to UCC IP Office"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subheadline *
        </label>
        <textarea
          value={formData.subheadline || ''}
          onChange={(e) => updateField('subheadline', e.target.value)}
          placeholder="Brief description of your page"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Button Text *
        </label>
        <input
          type="text"
          value={formData.cta_text || ''}
          onChange={(e) => updateField('cta_text', e.target.value)}
          placeholder="e.g., Get Started"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Button Link *
        </label>
        <input
          type="text"
          value={formData.cta_link || ''}
          onChange={(e) => updateField('cta_link', e.target.value)}
          placeholder="e.g., /register"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Features Block Form
// ============================================================================

function FeaturesBlockForm({ formData, updateField, addArrayItem, removeArrayItem, updateArrayItem }: any) {
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Icon Background</label>
              <input
                type="text"
                value={feature.icon_bg_color || ''}
                onChange={(e) => updateArrayItem('features', idx, 'icon_bg_color', e.target.value)}
                placeholder="e.g., bg-blue-100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Icon Color</label>
              <input
                type="text"
                value={feature.icon_color || ''}
                onChange={(e) => updateArrayItem('features', idx, 'icon_color', e.target.value)}
                placeholder="e.g., text-blue-600"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
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
          Content *
        </label>
        <textarea
          value={formData.body || ''}
          onChange={(e) => updateField('body', e.target.value)}
          placeholder='Enter HTML content. Allowed: <h3>, <p>, <strong>, <em>, <a>, <ul>, <li>, etc.'
          rows={8}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-2">
          You can use basic HTML tags. Example: &lt;h3&gt;Heading&lt;/h3&gt;&lt;p&gt;Paragraph&lt;/p&gt;
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
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Heading *
        </label>
        <input
          type="text"
          value={formData.heading || ''}
          onChange={(e) => updateField('heading', e.target.value)}
          placeholder="e.g., Start Your Journey Today"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Descriptive text for the CTA"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Color *
        </label>
        <input
          type="text"
          value={formData.background_color || ''}
          onChange={(e) => updateField('background_color', e.target.value)}
          placeholder="e.g., #2563EB or bg-gradient-to-r from-blue-600 to-blue-800"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use hex color (#2563EB) or Tailwind gradient (bg-gradient-to-r from-blue-600 to-blue-800)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Button Text *
        </label>
        <input
          type="text"
          value={formData.button_text || ''}
          onChange={(e) => updateField('button_text', e.target.value)}
          placeholder="e.g., Register Now"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Button Link *
        </label>
        <input
          type="text"
          value={formData.button_link || ''}
          onChange={(e) => updateField('button_link', e.target.value)}
          placeholder="e.g., /register"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Gallery Block Form
// ============================================================================

function GalleryBlockForm({ formData, updateField, addArrayItem, removeArrayItem, updateArrayItem }: any) {
  const images = Array.isArray(formData.images) ? formData.images : [];

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
          onClick={() => addArrayItem('images', { url: '', alt_text: '', caption: '' })}
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
        </div>
      ))}
    </div>
  );
}
