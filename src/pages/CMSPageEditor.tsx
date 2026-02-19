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
  { value: 'showcase', label: 'Showcase', icon: '🎪', description: 'Display items in a showcase format' },
  { value: 'steps', label: 'Steps/Process', icon: '📋', description: 'Show a step-by-step process' },
  { value: 'categories', label: 'Categories', icon: '📂', description: 'Display categories or services' },
  { value: 'text-section', label: 'Text Section', icon: '📄', description: 'Display informational text content' },
  { value: 'gallery', label: 'Image Gallery', icon: '🖼️', description: 'Display multiple images' },
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
      case 'showcase':
        return {
          title: 'Showcase',
          items: [
            { title: 'Item 1', description: 'Description', image_url: '', image_width: 300, image_height: 300, image_position: 'center' },
          ],
        };
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
      case 'text-section':
        return {
          section_title: 'Section Title',
          body_content: 'Add your informational content here.',
          text_alignment: 'left',
          max_width: 'normal',
          background_style: 'none',
          show_divider: false,
          text_style_preset: 'default',
          title_style: 'normal',
          text_size: 'medium',
          visual_tone: 'neutral',
          accent_icon: 'none',
          emphasize_section: false,
          vertical_spacing: 'normal',
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
      case 'text-section':
        return content.section_title || content.body_content?.substring(0, 40) + '...' || 'Text Section';
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

          {/* Background Image Control */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const newImageExpanded = !content.image_settings_expanded;
                onChange({ ...content, image_settings_expanded: newImageExpanded });
              }}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center font-medium text-left transition"
            >
              <span className="text-gray-900">Background Image Settings</span>
              <span className="text-gray-600">{content.image_settings_expanded ? '▼' : '▶'}</span>
            </button>

            {content.image_settings_expanded && (
              <div className="p-4 space-y-4 bg-white">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Upload Image</label>
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
                  <p className="text-xs text-gray-500 mt-1">Upload PNG, JPG, GIF or WebP (max 10MB)</p>
                </div>

                {/* Image Preview */}
                {content.background_image && (
                  <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                    <p className="text-xs font-medium text-gray-700 mb-2">Preview</p>
                    <img
                      src={content.background_image}
                      alt="Hero background"
                      className="w-full h-40 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ ...content, background_image: null })}
                      className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove Image
                    </button>
                  </div>
                )}

                {content.background_image && (
                  <>
                    {/* Layout Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image Layout</label>
                      <select
                        value={content.image_layout || 'full-width'}
                        onChange={(e) => onChange({
                          ...content,
                          image_layout: e.target.value,
                          // Reset sizing if switching to full-width
                          ...(e.target.value === 'full-width' ? {
                            image_width: undefined,
                            image_height: undefined
                          } : {})
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="full-width">Full Width (Stretched)</option>
                        <option value="contained">Contained (Fixed Size)</option>
                        <option value="grid-left">Grid: Image Left (50% width)</option>
                        <option value="grid-right">Grid: Image Right (50% width)</option>
                        <option value="grid-center">Grid: Image Center (40% width)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Choose how the image should be displayed</p>
                    </div>

                    {/* Size Controls (if not full-width) */}
                    {content.image_layout !== 'full-width' && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Width (px)</label>
                          <input
                            type="number"
                            value={content.image_width || 400}
                            onChange={(e) => onChange({
                              ...content,
                              image_width: parseInt(e.target.value) || 400
                            })}
                            placeholder="400"
                            min="100"
                            max="1200"
                            step="50"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Height (px)</label>
                          <input
                            type="number"
                            value={content.image_height || 300}
                            onChange={(e) => onChange({
                              ...content,
                              image_height: parseInt(e.target.value) || 300
                            })}
                            placeholder="300"
                            min="100"
                            max="1000"
                            step="50"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* Image Positioning */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image Position</label>
                      <select
                        value={content.image_position || 'center'}
                        onChange={(e) => onChange({
                          ...content,
                          image_position: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="top">Top</option>
                        <option value="center">Center</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </div>

                    {/* Overlay Opacity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overlay Darkness ({content.image_overlay || 0}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="70"
                        step="5"
                        value={content.image_overlay || 0}
                        onChange={(e) => onChange({
                          ...content,
                          image_overlay: parseInt(e.target.value)
                        })}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Darken the image to improve text readability (0% = no overlay)</p>
                    </div>
                  </>
                )}
              </div>
            )}
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
                    value={image.caption || ''}
                    onChange={(e) => {
                      const newImages = [...content.images];
                      newImages[idx].caption = e.target.value;
                      onChange({ ...content, images: newImages });
                    }}
                    placeholder="Name or title (displayed above position)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  />

                  <input
                    type="text"
                    value={image.position || ''}
                    onChange={(e) => {
                      const newImages = [...content.images];
                      newImages[idx].position = e.target.value;
                      onChange({ ...content, images: newImages });
                    }}
                    placeholder="Position/Title (e.g., Full Stack Developer)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500 text-sm"
                  />

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
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const newImages = [...(content.images || []), { url: '', caption: '', position: '', alt_text: '' }];
                onChange({ ...content, images: newImages });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition"
            >
              + Add Image
            </button>
          </div>
        </div>
      );

    case 'text-section':
      return (
        <TextSectionEditor content={content} onChange={onChange} />
      );
  }
}

function TextSectionEditor({ content, onChange }: { content: Record<string, any>; onChange: (content: Record<string, any>) => void }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    content: true,
    style: false,
    layout: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getAccentIconDisplay = (iconType: string) => {
    const icons: Record<string, string> = {
      none: '—',
      info: 'ℹ️',
      lightbulb: '💡',
      shield: '🛡️',
      document: '📄',
    };
    return icons[iconType] || '—';
  };

  return (
    <div className="space-y-4">
      {/* CONTENT SECTION */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('content')}
          className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center font-medium text-left transition"
        >
          <span className="text-gray-900">Content</span>
          <span className="text-gray-600">{expandedSections.content ? '▼' : '▶'}</span>
        </button>
        {expandedSections.content && (
          <div className="p-4 space-y-4 bg-white">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Title (Optional)</label>
              <input
                type="text"
                value={content.section_title || ''}
                onChange={(e) => onChange({ ...content, section_title: e.target.value })}
                placeholder="e.g., About Our Mission"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty if you don't want a title</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Content (Required)</label>
              <textarea
                value={content.body_content || ''}
                onChange={(e) => onChange({ ...content, body_content: e.target.value })}
                placeholder="Add your informational content here. Separate paragraphs with blank lines."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">Supports line breaks and paragraphs (separate with blank lines)</p>
            </div>
          </div>
        )}
      </div>

      {/* STYLE SECTION */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('style')}
          className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center font-medium text-left transition"
        >
          <span className="text-gray-900">Style</span>
          <span className="text-gray-600">{expandedSections.style ? '▼' : '▶'}</span>
        </button>
        {expandedSections.style && (
          <div className="p-4 space-y-4 bg-white">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Style Preset</label>
              <select
                value={content.text_style_preset || 'default'}
                onChange={(e) => onChange({ ...content, text_style_preset: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              >
                <option value="default">Default (Body Text)</option>
                <option value="introduction">Section Introduction</option>
                <option value="highlight">Highlight Statement</option>
                <option value="policy">Policy / Notice</option>
                <option value="callout">Callout Text</option>
              </select>
            </div>

            {content.section_title && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title Style</label>
                <select
                  value={content.title_style || 'normal'}
                  onChange={(e) => onChange({ ...content, title_style: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="underline">Subtle Underline</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text Size</label>
              <select
                value={content.text_size || 'medium'}
                onChange={(e) => onChange({ ...content, text_size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone / Mood</label>
              <select
                value={content.visual_tone || 'neutral'}
                onChange={(e) => onChange({ ...content, visual_tone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              >
                <option value="neutral">Neutral</option>
                <option value="informative">Informative</option>
                <option value="emphasis">Emphasis</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accent Icon (Optional)</label>
              <div className="flex items-center gap-2">
                <select
                  value={content.accent_icon || 'none'}
                  onChange={(e) => onChange({ ...content, accent_icon: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="none">None</option>
                  <option value="info">ℹ️ Info</option>
                  <option value="lightbulb">💡 Lightbulb</option>
                  <option value="shield">🛡️ Shield</option>
                  <option value="document">📄 Document</option>
                </select>
                <div className="text-2xl px-3 py-2 bg-gray-100 rounded-lg min-w-12 flex items-center justify-center">
                  {getAccentIconDisplay(content.accent_icon || 'none')}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Displays near section title if provided</p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="emphasizeSection"
                checked={content.emphasize_section || false}
                onChange={(e) => onChange({ ...content, emphasize_section: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:outline-none"
              />
              <label htmlFor="emphasizeSection" className="text-sm font-medium text-gray-700">
                Emphasize Section (adds border and background accent)
              </label>
            </div>
          </div>
        )}
      </div>

      {/* LAYOUT SECTION */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('layout')}
          className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 flex justify-between items-center font-medium text-left transition"
        >
          <span className="text-gray-900">Layout</span>
          <span className="text-gray-600">{expandedSections.layout ? '▼' : '▶'}</span>
        </button>
        {expandedSections.layout && (
          <div className="p-4 space-y-4 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Text Alignment</label>
                <select
                  value={content.text_alignment || 'left'}
                  onChange={(e) => onChange({ ...content, text_alignment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Width</label>
                <select
                  value={content.max_width || 'normal'}
                  onChange={(e) => onChange({ ...content, max_width: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="narrow">Narrow</option>
                  <option value="normal">Normal (Default)</option>
                  <option value="wide">Wide</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background Style</label>
              <select
                value={content.background_style || 'none'}
                onChange={(e) => onChange({ ...content, background_style: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              >
                <option value="none">None (White)</option>
                <option value="light_gray">Soft Gray</option>
                <option value="soft_blue">Soft Blue</option>
                <option value="soft_yellow">Soft Yellow (Notice-style)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vertical Spacing</label>
              <select
                value={content.vertical_spacing || 'normal'}
                onChange={(e) => onChange({ ...content, vertical_spacing: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none focus:border-blue-500"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal (Default)</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="showDivider"
                checked={content.show_divider || false}
                onChange={(e) => onChange({ ...content, show_divider: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:outline-none"
              />
              <label htmlFor="showDivider" className="text-sm font-medium text-gray-700">
                Show subtle dividers above and below
              </label>
            </div>

            {/* Grid Layout Controls */}
            <div className="pt-4 border-t border-gray-300">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Grid Layout</h4>
                    <p className="text-xs text-gray-600 mt-1">Display content in columns (e.g., Mission & Vision side-by-side)</p>
                  </div>
                  <input
                    type="checkbox"
                    id="gridLayout"
                    checked={content.internal_grid?.enabled === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange({
                          ...content,
                          internal_grid: { enabled: true, columns: 2, gap: 'gap-6' },
                          blocks: content.blocks && content.blocks.length > 0 ? content.blocks : [{ title: '', content: content.body_content || '' }]
                        });
                      } else {
                        onChange({
                          ...content,
                          internal_grid: { enabled: false, columns: 2, gap: 'gap-6' }
                        });
                      }
                    }}
                    className="h-5 w-5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {content.internal_grid?.enabled && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-blue-200">
                    {/* Number of Columns */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Number of Columns
                      </label>
                      <select
                        value={content.internal_grid?.columns || 2}
                        onChange={(e) => onChange({
                          ...content,
                          internal_grid: {
                            ...content.internal_grid,
                            columns: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={2}>2 Columns</option>
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                      </select>
                    </div>

                    {/* Gap/Spacing */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Column Spacing
                      </label>
                      <select
                        value={content.internal_grid?.gap || 'gap-6'}
                        onChange={(e) => onChange({
                          ...content,
                          internal_grid: {
                            ...content.internal_grid,
                            gap: e.target.value
                          }
                        })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="gap-4">Small (16px)</option>
                        <option value="gap-6">Medium (24px)</option>
                        <option value="gap-8">Large (32px)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Blocks Manager */}
              {content.internal_grid?.enabled && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Content Blocks ({(content.blocks || []).length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentBlocks = content.blocks || [];
                        onChange({
                          ...content,
                          blocks: [...currentBlocks, { title: '', content: '' }]
                        });
                      }}
                      className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 font-medium"
                    >
                      + Add Block
                    </button>
                  </div>

                  {(!content.blocks || content.blocks.length === 0) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">No blocks yet. Click "Add Block" to create content.</p>
                    </div>
                  )}

                  {(content.blocks || []).map((block: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 mb-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-gray-900">Block {idx + 1}</h5>
                        <button
                          type="button"
                          onClick={() => {
                            const newBlocks = (content.blocks || []).filter((_: any, i: number) => i !== idx);
                            onChange({
                              ...content,
                              blocks: newBlocks
                            });
                          }}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Block Title (optional)
                        </label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => {
                            const newBlocks = [...(content.blocks || [])];
                            newBlocks[idx] = { ...newBlocks[idx], title: e.target.value };
                            onChange({
                              ...content,
                              blocks: newBlocks
                            });
                          }}
                          placeholder="e.g., Our Mission"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Block Content <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          value={block.content || ''}
                          onChange={(e) => {
                            const newBlocks = [...(content.blocks || [])];
                            newBlocks[idx] = { ...newBlocks[idx], content: e.target.value };
                            onChange({
                              ...content,
                              blocks: newBlocks
                            });
                          }}
                          placeholder="Enter content for this block..."
                          rows={4}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Use line breaks to create paragraphs</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
