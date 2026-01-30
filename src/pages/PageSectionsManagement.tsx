import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit, AlertCircle, ChevronLeft, GripVertical } from 'lucide-react';
import { CMSSectionEditor } from '../components/CMSSectionEditor';
import { BlockTypePicker } from '../components/BlockTypePicker';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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
    setShowEditModal(true);
  };

  const handleSaveSection = async (content: Record<string, any>) => {
    if (!editingSection) return;

    setSaving(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('cms_sections')
        .update({ content })
        .eq('id', editingSection.id);

      if (err) throw err;

      setSections(
        sections.map((s) =>
          s.id === editingSection.id ? { ...s, content } : s
        )
      );

      setSuccess('Block saved successfully');
      setShowEditModal(false);
      setEditingSection(null);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving block:', err);
      throw err;
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    setDraggedId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(sectionId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetSectionId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetSectionId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = sections.findIndex((s) => s.id === draggedId);
    const targetIndex = sections.findIndex((s) => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Reorder locally first
    const newSections = [...sections];
    const [draggedSection] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedSection);

    // Update order_index values to match new visual order
    newSections.forEach((section, index) => {
      section.order_index = index;
    });

    setSections(newSections);
    setDraggedId(null);
    setError(null);

    // Update database with new order_index values
    try {
      const updates = newSections.map((section) => ({
        id: section.id,
        order_index: section.order_index,
      }));

      // Update all sections with their new order_index
      for (const update of updates) {
        const { error: err } = await supabase
          .from('cms_sections')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (err) throw err;
      }

      setSuccess('Block order updated');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Error updating section order:', err);
      setError(err.message || 'Failed to update block order');
      // Refetch to restore correct state on error
      await fetchPageAndSections();
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
          <p className="text-gray-600">Manage blocks for this page</p>
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
            Blocks ({sections.length})
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Block
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No sections yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                draggable
                onDragStart={(e) => handleDragStart(e, section.id)}
                onDragOver={(e) => handleDragOver(e, section.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, section.id)}
                className={`border-2 rounded-lg p-4 transition-all cursor-grab active:cursor-grabbing ${
                  draggedId === section.id
                    ? 'opacity-50 bg-gray-100 border-gray-300'
                    : dragOverId === section.id
                    ? 'bg-blue-50 border-blue-400 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                        {section.section_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {Object.keys(section.content).length} fields
                    </p>
                  </div>

                  <div className="flex gap-2">
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

      {/* Create Block Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Block</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Block Type *
                </label>
                <BlockTypePicker
                  selectedType={selectedSectionType}
                  onSelect={setSelectedSectionType}
                />
              </div>

              <p className="text-sm text-gray-600">
                Choose a block type, then click "Create Block" to add it to your page.
              </p>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateSection}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Block'}
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

      {/* Edit Block Modal */}
      {showEditModal && editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Edit {editingSection.section_type.toUpperCase()} Block
            </h2>

            <CMSSectionEditor
              section={editingSection}
              onSave={handleSaveSection}
              onCancel={() => {
                setShowEditModal(false);
                setEditingSection(null);
              }}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
