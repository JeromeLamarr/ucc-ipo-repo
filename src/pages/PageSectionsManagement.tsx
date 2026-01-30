import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ArrowUp, ArrowDown, Edit, AlertCircle, ChevronLeft } from 'lucide-react';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
}

interface CMSSection {
  id: string;
  section_type: string;
  content: Record<string, any>;
  order_index: number;
}

const SECTION_TYPES = ['hero', 'text', 'features', 'showcase', 'steps', 'categories', 'cta', 'gallery'];

const SECTION_TYPE_TEMPLATES: Record<string, Record<string, any>> = {
  hero: {
    headline: 'Your Headline',
    headline_highlight: 'Highlighted Text',
    subheadline: 'Your subheadline here',
    cta_text: 'Get Started',
    cta_link: '/register',
  },
  text: {
    title: 'Section Title',
    body: 'Text content here',
    alignment: 'left',
  },
  features: {
    features: [
      {
        title: 'Feature Title',
        description: 'Feature description',
        icon: 'FileText',
        icon_bg_color: 'bg-blue-100',
        icon_color: 'text-blue-600',
      },
    ],
  },
  showcase: {
    title: 'Showcase Title',
    items: [
      {
        title: 'Item Title',
        description: 'Item description',
        image_url: 'https://example.com/image.jpg',
        link: '/link',
      },
    ],
  },
  steps: {
    title: 'Steps Title',
    steps: [
      {
        number: 1,
        label: 'Step Label',
        description: 'Step description',
      },
    ],
  },
  categories: {
    title: 'Categories Title',
    categories: ['Category 1', 'Category 2'],
  },
  cta: {
    heading: 'Call to Action',
    description: 'Description text',
    button_text: 'Button Text',
    button_link: '/link',
    background_color: 'bg-blue-600',
  },
  gallery: {
    title: 'Gallery Title',
    images: [
      {
        url: 'https://example.com/image.jpg',
        caption: 'Image caption',
        alt_text: 'Alt text',
      },
    ],
    columns: 3,
  },
};

export function PageSectionsManagement() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState<CMSPage | null>(null);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSectionType, setSelectedSectionType] = useState<string>('hero');
  const [editingSection, setEditingSection] = useState<CMSSection | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    if (pageId) {
      fetchPageAndSections();
    }
  }, [pageId]);

  const fetchPageAndSections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch page
      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (pageError) throw pageError;
      if (!pageData) throw new Error('Page not found');

      setPage(pageData);

      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageId)
        .order('order_index', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
    } catch (err: any) {
      console.error('Error fetching page and sections:', err);
      setError(err.message || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async () => {
    if (!pageId) return;

    setSaving(true);
    setError(null);

    try {
      const newOrderIndex = sections.length > 0 ? Math.max(...sections.map(s => s.order_index)) + 1 : 0;
      const template = SECTION_TYPE_TEMPLATES[selectedSectionType] || {};

      const { data, error: err } = await supabase
        .from('cms_sections')
        .insert([
          {
            page_id: pageId,
            section_type: selectedSectionType,
            content: template,
            order_index: newOrderIndex,
          },
        ])
        .select();

      if (err) throw err;

      setSections([...sections, ...(data || [])]);
      setSuccess('Section created successfully');
      setShowCreateModal(false);
      setSelectedSectionType('hero');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating section:', err);
      setError(err.message || 'Failed to create section');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSection = (section: CMSSection) => {
    setEditingSection(section);
    setEditingContent(JSON.stringify(section.content, null, 2));
    setShowEditModal(true);
  };

  const handleSaveSection = async () => {
    if (!editingSection) return;

    setSaving(true);
    setError(null);

    try {
      let parsedContent: Record<string, any>;
      try {
        parsedContent = JSON.parse(editingContent);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }

      const { error: err } = await supabase
        .from('cms_sections')
        .update({ content: parsedContent })
        .eq('id', editingSection.id);

      if (err) throw err;

      setSections(
        sections.map((s) =>
          s.id === editingSection.id ? { ...s, content: parsedContent } : s
        )
      );

      setSuccess('Section updated successfully');
      setShowEditModal(false);
      setEditingSection(null);
      setEditingContent('');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving section:', err);
      setError(err.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    setDeleting(sectionId);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('cms_sections')
        .delete()
        .eq('id', sectionId);

      if (err) throw err;

      setSections(sections.filter((s) => s.id !== sectionId));
      setSuccess('Section deleted successfully');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting section:', err);
      setError(err.message || 'Failed to delete section');
    } finally {
      setDeleting(null);
    }
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) return;

    if (direction === 'up' && sectionIndex === 0) return;
    if (direction === 'down' && sectionIndex === sections.length - 1) return;

    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    const section = sections[sectionIndex];
    const targetSection = sections[targetIndex];

    setReordering(sectionId);
    setError(null);

    try {
      // Update both sections' order_index
      const { error: err } = await supabase
        .from('cms_sections')
        .update([
          { order_index: targetSection.order_index },
          { order_index: section.order_index },
        ])
        .in('id', [sectionId, targetSection.id]);

      if (err) throw err;

      // Re-fetch to maintain correct order
      await fetchPageAndSections();
      setSuccess(`Section moved ${direction}`);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error reordering sections:', err);
      setError(err.message || 'Failed to reorder sections');
    } finally {
      setReordering(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Page not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/public-pages')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to Pages
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
          <p className="text-gray-600">Manage sections for this page</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Sections ({sections.length})
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Section
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No sections yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                        {section.section_type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">Order: {section.order_index}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {Object.keys(section.content).length} fields
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {index > 0 && (
                      <button
                        onClick={() => handleMoveSection(section.id, 'up')}
                        disabled={reordering === section.id}
                        className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        title="Move up"
                      >
                        <ArrowUp className="h-5 w-5" />
                      </button>
                    )}
                    {index < sections.length - 1 && (
                      <button
                        onClick={() => handleMoveSection(section.id, 'down')}
                        disabled={reordering === section.id}
                        className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        title="Move down"
                      >
                        <ArrowDown className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditSection(section)}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      disabled={deleting === section.id}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Section</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Type *
                </label>
                <select
                  value={selectedSectionType}
                  onChange={(e) => setSelectedSectionType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                >
                  {SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-gray-600">
                A new section will be created with template content that you can edit.
              </p>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateSection}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Section'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {showEditModal && editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Edit {editingSection.section_type.toUpperCase()} Section
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content (JSON) *
                </label>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter JSON content..."
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Valid JSON required. Use quotes for all keys and string values.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveSection}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSection(null);
                    setEditingContent('');
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
