import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X, Eye, Edit2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { Database } from '../lib/database.types';
import { FileUploadField, MediaPicker } from '../components/FileUploadField';
import { RichTextEditor } from '../components/RichTextEditor';

type CMSPage = Database['public']['Tables']['cms_pages']['Row'];
type CMSSection = Database['public']['Tables']['cms_sections']['Row'];

interface SectionWithContent extends CMSSection {
  content: Record<string, any>;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Section', icon: '🦸', description: 'Large banner with headline and CTA' },
  { value: 'features', label: 'Features Grid', icon: '✨', description: 'Showcase your key features' },
  { value: 'steps', label: 'Steps/Process', icon: '📋', description: 'Show a step-by-step process' },
  { value: 'categories', label: 'Categories', icon: '📂', description: 'Display categories or services' },
  { value: 'gallery', label: 'Image Gallery', icon: '🖼️', description: 'Display multiple images' },
  { value: 'text', label: 'Text Block', icon: '📝', description: 'Rich text content' },
  { value: 'cta', label: 'Call to Action', icon: '🎯', description: 'Button or action section' },
];

export function CMSPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { primaryColor } = useBranding();

  const [page, setPage] = useState<CMSPage | null>(null);
  const [sections, setSections] = useState<SectionWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPageAndSections();
  }, [slug]);

  const fetchPageAndSections = async () => {
    if (!slug) return;

    try {
      setLoading(true);

      // Fetch page
      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .single();

      if (pageError) throw pageError;
      setPage(pageData as CMSPage);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageData.id)
        .order('order_index', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections((sectionsData || []) as SectionWithContent[]);
    } catch (err: any) {
      console.error('Error fetching page:', err);
      setError(err.message || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async (sectionType: string) => {
    if (!page) return;

    try {
      const newOrderIndex = sections.length;

      const { data, error } = await supabase
        .from('cms_sections')
        .insert([
          {
            page_id: page.id,
            section_type: sectionType,
            content: getDefaultContent(sectionType),
            order_index: newOrderIndex,
          },
        ] as any)
        .select();

      if (error) throw error;
      setSections([...sections, data[0] as SectionWithContent]);
      setSuccess('Section added');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase
        .from('cms_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      const updated = sections.filter(s => s.id !== sectionId);
      setSections(updated);

      // Reorder remaining sections
      for (let i = 0; i < updated.length; i++) {
        await supabase
          .from('cms_sections')
          .update({ order_index: i })
          .eq('id', updated[i].id);
      }

      setSuccess('Section deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete section');
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];

    setSections(newSections);

    try {
      await Promise.all([
        supabase.from('cms_sections').update({ order_index: index }).eq('id', newSections[newIndex].id),
        supabase.from('cms_sections').update({ order_index: newIndex }).eq('id', newSections[index].id),
      ]);
    } catch (err: any) {
      setError('Failed to reorder sections');
    }
  };

  const handleUpdateSectionContent = async (sectionId: string, newContent: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('cms_sections')
        .update({ content: newContent })
        .eq('id', sectionId);

      if (error) throw error;

      setSections(sections.map(s => s.id === sectionId ? { ...s, content: newContent } : s));
      setSuccess('Section updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update section');
    }
  };

  const getDefaultContent = (sectionType: string): Record<string, any> => {
    switch (sectionType) {
      case 'hero':
        return {
          headline: 'Welcome',
          headline_highlight: 'to our site',
          subheadline: 'Add your description here',
          cta_text: 'Get Started',
          cta_link: '/register',
        };
      case 'features':
        return {
          features: [
            { title: 'Feature 1', description: 'Description', icon_bg_color: 'bg-blue-100', icon_color: 'text-blue-600' },
          ],
        };
      case 'text':
        return { text: '<p>Your text content here</p>' };
      case 'gallery':
        return {
          title: 'Gallery',
          images: [],
        };
      case 'steps':
        return {
          steps: [
            { title: 'Step 1', description: 'Description' },
          ],
        };
      case 'categories':
        return {
          categories: [
            { name: 'Category 1', description: 'Description' },
          ],
        };
      case 'cta':
        return {
          heading: 'Ready to get started?',
          description: 'Take action now',
          button_text: 'Click Here',
          button_link: '/register',
        };
      default:
        return {};
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Page not found</p>
        <button
          onClick={() => navigate('/dashboard/pages')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Pages
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
          <p className="text-gray-600 mt-1">Edit page content and sections</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard/pages')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <X className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Save className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No sections yet. Add one to get started.</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              onUpdate={handleUpdateSectionContent}
              onDelete={handleDeleteSection}
              onMove={handleMoveSection}
              isEditing={editingSection === section.id}
              onEditToggle={() => setEditingSection(editingSection === section.id ? null : section.id)}
              primaryColor={primaryColor}
            />
          ))
        )}
      </div>

      {/* Add Section */}
      <div className="rounded-lg border border-gray-300 p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h3 className="font-bold text-gray-900 mb-4">Add New Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTION_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => handleAddSection(type.value)}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-left"
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="font-medium text-gray-900">{type.label}</div>
              <div className="text-xs text-gray-600 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  isEditing,
  onEditToggle,
  primaryColor,
}: {
  section: SectionWithContent;
  index: number;
  total: number;
  onUpdate: (id: string, content: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  isEditing: boolean;
  onEditToggle: () => void;
  primaryColor: string;
}) {
  const [content, setContent] = useState(section.content);

  const handleSave = () => {
    onUpdate(section.id, content);
    onEditToggle();
  };

  const getPreview = () => {
    switch (section.section_type) {
      case 'hero':
        return `${content.headline} ${content.headline_highlight}`;
      case 'text':
        return content.text?.substring(0, 50) || 'Text content...';
      case 'features':
        return `${(content.features || []).length} features`;
      case 'steps':
        return `${(content.steps || []).length} steps`;
      case 'categories':
        return `${(content.categories || []).length} categories`;
      case 'gallery':
        return `${(content.images || []).length} images`;
      case 'cta':
        return content.heading || 'Call to action';
      default:
        return 'Section content';
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
      <div
        className="p-4 flex justify-between items-center cursor-pointer"
        style={{ background: `${primaryColor}10`, borderBottomColor: `${primaryColor}40` }}
        onClick={onEditToggle}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="text-2xl">
            {SECTION_TYPES.find(t => t.value === section.section_type)?.icon}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 capitalize">{section.section_type} Section</p>
            <p className="text-sm text-gray-600 truncate">{getPreview()}</p>
            <p className="text-xs text-gray-500 mt-1">Position: {index + 1} of {total}</p>
          </div>
        </div>
        <div className="flex gap-1 ml-4 flex-shrink-0">
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
              className="p-2 hover:bg-gray-200 rounded text-gray-600"
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
              className="p-2 hover:bg-gray-200 rounded text-gray-600"
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEditToggle(); }}
            className="p-2 hover:bg-blue-100 rounded text-blue-600"
            title="Edit"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
            className="p-2 hover:bg-red-100 rounded text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="p-6 border-t border-gray-300 space-y-4 bg-white">
          <SectionContentEditor
            sectionType={section.section_type}
            content={content}
            onChange={setContent}
            pageSlug="home"
          />
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition"
              style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)` }}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
            <button
              onClick={onEditToggle}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionContentEditor({
  sectionType,
  content,
  onChange,
  pageSlug = 'home',
}: {
  sectionType: string;
  content: Record<string, any>;
  onChange: (content: Record<string, any>) => void;
  pageSlug?: string;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  switch (sectionType) {
    case 'hero':
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Headline</label>
            <input
              type="text"
              value={content.headline || ''}
              onChange={(e) => onChange({ ...content, headline: e.target.value })}
              placeholder="e.g., University Intellectual"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">This is the first part of your headline</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Highlighted Text</label>
            <input
              type="text"
              value={content.headline_highlight || ''}
              onChange={(e) => onChange({ ...content, headline_highlight: e.target.value })}
              placeholder="e.g., Property Management System"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">This text will be highlighted in blue</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
            <textarea
              value={content.subheadline || ''}
              onChange={(e) => onChange({ ...content, subheadline: e.target.value })}
              placeholder="Describe your service..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
              <input
                type="text"
                value={content.cta_text || ''}
                onChange={(e) => onChange({ ...content, cta_text: e.target.value })}
                placeholder="e.g., Get Started"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
              <input
                type="text"
                value={content.cta_link || ''}
                onChange={(e) => onChange({ ...content, cta_link: e.target.value })}
                placeholder="e.g., /register"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Background Image (Optional)</label>
            {uploadError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {uploadError}
              </div>
            )}
            <MediaPicker
              type="image"
              onSelect={(url) => {
                onChange({ ...content, background_image: url });
                setUploadError(null);
              }}
              pageSlug={pageSlug}
            />
          </div>
        </div>
      );

    case 'features':
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            {(content.features || []).map((feature: any, idx: number) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Feature {idx + 1}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newFeatures = content.features.filter((_: any, i: number) => i !== idx);
                      onChange({ ...content, features: newFeatures });
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={feature.title || ''}
                  onChange={(e) => {
                    const newFeatures = [...content.features];
                    newFeatures[idx].title = e.target.value;
                    onChange({ ...content, features: newFeatures });
                  }}
                  placeholder="Feature title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                />
                <textarea
                  value={feature.description || ''}
                  onChange={(e) => {
                    const newFeatures = [...content.features];
                    newFeatures[idx].description = e.target.value;
                    onChange({ ...content, features: newFeatures });
                  }}
                  placeholder="Feature description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const newFeatures = [...(content.features || []), { title: '', description: '' }];
              onChange({ ...content, features: newFeatures });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
          >
            + Add Feature
          </button>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-4">
          <RichTextEditor
            value={content.text || ''}
            onChange={(text) => onChange({ ...content, text })}
            placeholder="Enter your content here..."
          />
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => onChange({ ...content, heading: e.target.value })}
              placeholder="Ready to get started?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={content.description || ''}
              onChange={(e) => onChange({ ...content, description: e.target.value })}
              placeholder="Add details about your CTA..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
              <input
                type="text"
                value={content.button_text || ''}
                onChange={(e) => onChange({ ...content, button_text: e.target.value })}
                placeholder="Click here"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
              <input
                type="text"
                value={content.button_link || ''}
                onChange={(e) => onChange({ ...content, button_link: e.target.value })}
                placeholder="/register"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      );

    case 'steps':
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            {(content.steps || []).map((step: any, idx: number) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Step {idx + 1}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newSteps = content.steps.filter((_: any, i: number) => i !== idx);
                      onChange({ ...content, steps: newSteps });
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={step.title || ''}
                  onChange={(e) => {
                    const newSteps = [...content.steps];
                    newSteps[idx].title = e.target.value;
                    onChange({ ...content, steps: newSteps });
                  }}
                  placeholder="Step title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                />
                <textarea
                  value={step.description || ''}
                  onChange={(e) => {
                    const newSteps = [...content.steps];
                    newSteps[idx].description = e.target.value;
                    onChange({ ...content, steps: newSteps });
                  }}
                  placeholder="Step description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const newSteps = [...(content.steps || []), { title: '', description: '' }];
              onChange({ ...content, steps: newSteps });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
          >
            + Add Step
          </button>
        </div>
      );

    case 'categories':
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            {(content.categories || []).map((category: any, idx: number) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Category {idx + 1}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newCategories = content.categories.filter((_: any, i: number) => i !== idx);
                      onChange({ ...content, categories: newCategories });
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={category.name || ''}
                  onChange={(e) => {
                    const newCategories = [...content.categories];
                    newCategories[idx].name = e.target.value;
                    onChange({ ...content, categories: newCategories });
                  }}
                  placeholder="Category name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                />
                <textarea
                  value={category.description || ''}
                  onChange={(e) => {
                    const newCategories = [...content.categories];
                    newCategories[idx].description = e.target.value;
                    onChange({ ...content, categories: newCategories });
                  }}
                  placeholder="Category description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const newCategories = [...(content.categories || []), { name: '', description: '' }];
              onChange({ ...content, categories: newCategories });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
          >
            + Add Category
          </button>
        </div>
      );

    case 'gallery':
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gallery Title</label>
            <input
              type="text"
              value={content.title || ''}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="e.g., Photo Gallery"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Gallery Images</label>
            <div className="space-y-4">
              {(content.images || []).map((image: any, idx: number) => (
                <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">Image {idx + 1}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = content.images.filter((_: any, i: number) => i !== idx);
                        onChange({ ...content, images: newImages });
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  {image.url && (
                    <img 
                      src={image.url} 
                      alt={image.alt_text || 'Gallery image'} 
                      className="w-full h-32 object-cover rounded"
                    />
                  )}

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Upload Image</label>
                    <MediaPicker
                      type="image"
                      onSelect={(url) => {
                        const newImages = [...content.images];
                        newImages[idx].url = url;
                        onChange({ ...content, images: newImages });
                        setUploadError(null);
                      }}
                      pageSlug={pageSlug}
                    />
                  </div>

                  <input
                    type="text"
                    value={image.alt_text || ''}
                    onChange={(e) => {
                      const newImages = [...content.images];
                      newImages[idx].alt_text = e.target.value;
                      onChange({ ...content, images: newImages });
                    }}
                    placeholder="Alt text (for accessibility)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  />

                  <input
                    type="text"
                    value={image.caption || ''}
                    onChange={(e) => {
                      const newImages = [...content.images];
                      newImages[idx].caption = e.target.value;
                      onChange({ ...content, images: newImages });
                    }}
                    placeholder="Image caption (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const newImages = [...(content.images || []), { url: '', alt_text: '', caption: '' }];
                onChange({ ...content, images: newImages });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
            >
              + Add Image
            </button>
          </div>
        </div>
      );
  }
}
