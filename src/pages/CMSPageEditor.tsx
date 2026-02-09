import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { Database } from '../lib/database.types';

type CMSPage = Database['public']['Tables']['cms_pages']['Row'];
type CMSSection = Database['public']['Tables']['cms_sections']['Row'];

interface SectionWithContent extends CMSSection {
  content: Record<string, any>;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Section', icon: '🦸' },
  { value: 'features', label: 'Features Grid', icon: '✨' },
  { value: 'steps', label: 'Steps/Process', icon: '📋' },
  { value: 'categories', label: 'Categories', icon: '📂' },
  { value: 'text', label: 'Text Block', icon: '📝' },
  { value: 'cta', label: 'Call to Action', icon: '🎯' },
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
      <div className="rounded-lg border border-gray-300 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Add New Section</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SECTION_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => handleAddSection(type.value)}
              className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
            >
              <div className="text-2xl mb-2">{type.icon}</div>
              <div className="text-sm font-medium text-gray-900">{type.label}</div>
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

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div
        className="p-4 flex justify-between items-center cursor-pointer"
        style={{ background: `${primaryColor}10`, borderBottomColor: `${primaryColor}40` }}
        onClick={onEditToggle}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-bold text-gray-900 capitalize">{section.section_type} Section</p>
            <p className="text-sm text-gray-600">Position: {index + 1} of {total}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
              className="p-2 hover:bg-gray-200 rounded"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
          {index < total - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
              className="p-2 hover:bg-gray-200 rounded"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
            className="p-2 hover:bg-red-100 rounded"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="p-6 border-t border-gray-300 space-y-4">
          <SectionContentEditor
            sectionType={section.section_type}
            content={content}
            onChange={setContent}
          />
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white rounded-lg font-medium"
              style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)` }}
            >
              <Save className="h-4 w-4 inline mr-2" />
              Save Changes
            </button>
            <button
              onClick={onEditToggle}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
}: {
  sectionType: string;
  content: Record<string, any>;
  onChange: (content: Record<string, any>) => void;
}) {
  switch (sectionType) {
    case 'hero':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <input
              type="text"
              value={content.headline || ''}
              onChange={(e) => onChange({ ...content, headline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Highlight Text</label>
            <input
              type="text"
              value={content.headline_highlight || ''}
              onChange={(e) => onChange({ ...content, headline_highlight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
            <textarea
              value={content.subheadline || ''}
              onChange={(e) => onChange({ ...content, subheadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
            <input
              type="text"
              value={content.cta_text || ''}
              onChange={(e) => onChange({ ...content, cta_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
            <input
              type="text"
              value={content.cta_link || ''}
              onChange={(e) => onChange({ ...content, cta_link: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              placeholder="/register"
            />
          </div>
        </div>
      );

    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
          <textarea
            value={content.text || ''}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none font-mono text-sm"
            rows={6}
            placeholder="<p>Your HTML content here</p>"
          />
          <p className="text-xs text-gray-500 mt-2">HTML tags supported: p, h1-h6, strong, em, a, ul, ol, li</p>
        </div>
      );

    default:
      return (
        <div className="p-4 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-600">
            Editor for {sectionType} sections coming soon. Raw content:
          </p>
          <pre className="text-xs mt-2 bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      );
  }
}
