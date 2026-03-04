import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Eye,
  EyeOff,
  Copy,
  ChevronDown,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { CmsPageRenderer } from '../components/cms/CmsPageRenderer';
import {
  supportedSectionTypes,
  validateSection,
  getDefaultContent,
} from '../components/cms/sectionRegistry';
import type { CmsSection } from '../components/cms/sectionRegistry';
import type { Database } from '../lib/database.types';

type CMSPage = Database['public']['Tables']['cms_pages']['Row'];

interface SectionWithContent extends CmsSection {
  content: Record<string, any>;
}

export function CMSPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { primaryColor, secondaryColor, siteName } = useBranding();
  const branding = { primaryColor, secondaryColor, siteName };

  const [page, setPage] = useState<CMSPage | null>(null);
  const [sections, setSections] = useState<SectionWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [pagePublished, setPagePublished] = useState(false);

  useEffect(() => {
    if (slug) fetchPageAndSections();
  }, [slug]);

  const fetchPageAndSections = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (pageError) throw pageError;
      if (!pageData) { setError('Page not found'); setLoading(false); return; }

      setPage(pageData as CMSPage);
      setPageTitle(pageData.title || '');
      setPageDescription((pageData as any).description || '');
      setPagePublished(pageData.is_published || false);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageData.id)
        .order('order_index', { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections((sectionsData || []) as SectionWithContent[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 5000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  };

  const handleSavePage = async () => {
    if (!page) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cms_pages')
        .update({
          title: pageTitle,
          description: pageDescription,
          is_published: pagePublished,
        } as any)
        .eq('id', page.id);
      if (error) throw error;
      setPage(p => p ? { ...p, title: pageTitle, is_published: pagePublished } : p);
      showMsg('Page settings saved');
    } catch (err: any) {
      showMsg(err.message || 'Failed to save page', true);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSection = async (sectionType: string) => {
    if (!page) return;
    setAddingSection(false);
    try {
      const newOrder = sections.length;
      const { data, error } = await supabase
        .from('cms_sections')
        .insert([{
          page_id: page.id,
          section_type: sectionType,
          content: getDefaultContent(sectionType),
          order_index: newOrder,
        }] as any)
        .select();
      if (error) throw error;
      const newSection = data[0] as SectionWithContent;
      setSections(prev => [...prev, newSection]);
      setEditingId(newSection.id);
      showMsg('Section added');
    } catch (err: any) {
      showMsg(err.message || 'Failed to add section', true);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section?')) return;
    try {
      const { error } = await supabase.from('cms_sections').delete().eq('id', sectionId);
      if (error) throw error;
      const updated = sections.filter(s => s.id !== sectionId);
      setSections(updated);
      await reorderSections(updated);
      if (editingId === sectionId) setEditingId(null);
      showMsg('Section deleted');
    } catch (err: any) {
      showMsg(err.message || 'Failed to delete section', true);
    }
  };

  const handleDuplicateSection = async (section: SectionWithContent) => {
    if (!page) return;
    try {
      const newOrder = sections.length;
      const { data, error } = await supabase
        .from('cms_sections')
        .insert([{
          page_id: page.id,
          section_type: section.section_type,
          content: { ...section.content },
          order_index: newOrder,
        }] as any)
        .select();
      if (error) throw error;
      setSections(prev => [...prev, data[0] as SectionWithContent]);
      showMsg('Section duplicated');
    } catch (err: any) {
      showMsg(err.message || 'Failed to duplicate section', true);
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...sections];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setSections(reordered);
    try {
      await Promise.all([
        supabase.from('cms_sections').update({ order_index: index }).eq('id', reordered[newIndex].id),
        supabase.from('cms_sections').update({ order_index: newIndex }).eq('id', reordered[index].id),
      ]);
    } catch (err: any) {
      showMsg('Failed to reorder sections', true);
    }
  };

  const reorderSections = async (secs: SectionWithContent[]) => {
    await Promise.all(
      secs.map((s, i) => supabase.from('cms_sections').update({ order_index: i }).eq('id', s.id))
    );
  };

  const handleUpdateContent = async (sectionId: string, newContent: Record<string, any>) => {
    try {
      const { error } = await supabase.from('cms_sections').update({ content: newContent }).eq('id', sectionId);
      if (error) throw error;
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, content: newContent } : s));
      showMsg('Section saved');
    } catch (err: any) {
      showMsg(err.message || 'Failed to save section', true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderBottomColor: primaryColor }} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">{error || 'Page not found'}</p>
        <button onClick={() => navigate('/dashboard/public-pages')} className="text-blue-600 hover:underline font-medium">
          Back to Pages
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard/public-pages')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            ← Public Pages
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
          <p className="text-gray-500 text-sm mt-1">/{page.slug}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          {page.is_published && (
            <a
              href={`/pages/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Live
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className={showPreview ? 'xl:col-span-3 space-y-6' : 'xl:col-span-5 space-y-6'}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings size={16} />
              Page Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={e => setPageTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={page.slug}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={pageDescription}
                  onChange={e => setPageDescription(e.target.value)}
                  placeholder="Optional meta description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={pagePublished}
                    onChange={e => setPagePublished(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${pagePublished ? 'bg-green-500' : 'bg-gray-300'}`}
                    onClick={() => setPagePublished(v => !v)}
                  />
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pagePublished ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {pagePublished ? 'Published' : 'Draft'}
                </span>
              </label>
              <button
                onClick={handleSavePage}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Sections</h2>
              <button
                onClick={() => setAddingSection(v => !v)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <Plus size={14} />
                Add Section
              </button>
            </div>

            {addingSection && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Choose Section Type</h3>
                  <button onClick={() => setAddingSection(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {supportedSectionTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => handleAddSection(type.value)}
                      className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                    >
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{type.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-500 mb-3">No sections yet</p>
                <button
                  onClick={() => setAddingSection(true)}
                  className="text-sm font-medium px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Add your first section
                </button>
              </div>
            ) : (
              sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  total={sections.length}
                  isEditing={editingId === section.id}
                  primaryColor={primaryColor}
                  onToggleEdit={() => setEditingId(editingId === section.id ? null : section.id)}
                  onMove={dir => handleMoveSection(index, dir)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onDuplicate={() => handleDuplicateSection(section)}
                  onSave={newContent => handleUpdateContent(section.id, newContent)}
                />
              ))
            )}
          </div>
        </div>

        {showPreview && (
          <div className="xl:col-span-2">
            <div className="sticky top-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <Eye size={14} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Live Preview</span>
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-200px)] bg-white">
                  {sections.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      Add sections to see the preview
                    </div>
                  ) : (
                    <div className="transform scale-75 origin-top-left w-[133%]">
                      <CmsPageRenderer page={page as any} sections={sections} branding={branding} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SectionCardProps {
  section: SectionWithContent;
  index: number;
  total: number;
  isEditing: boolean;
  primaryColor: string;
  onToggleEdit: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSave: (content: Record<string, any>) => void;
}

function SectionCard({
  section,
  index,
  total,
  isEditing,
  primaryColor,
  onToggleEdit,
  onMove,
  onDelete,
  onDuplicate,
  onSave,
}: SectionCardProps) {
  const validation = validateSection(section);
  const typeInfo = supportedSectionTypes.find(t => t.value === section.section_type);
  const typeLabel = typeInfo?.label || section.section_type;

  return (
    <div className={`bg-white rounded-xl shadow-sm border transition-colors ${
      isEditing ? 'border-blue-300' : 'border-gray-200'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
            title="Move up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown size={14} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-gray-900 truncate">{typeLabel}</span>
            {validation.errors.length > 0 && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {validation.errors.length} error{validation.errors.length > 1 ? 's' : ''}
              </span>
            )}
            {validation.warnings.length > 0 && validation.errors.length === 0 && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                warning
              </span>
            )}
          </div>
          {validation.errors.length > 0 && (
            <p className="text-xs text-red-600 mt-0.5">{validation.errors[0]}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onToggleEdit}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            style={isEditing ? { borderColor: primaryColor, color: primaryColor } : { borderColor: '#e5e7eb', color: '#374151' }}
          >
            {isEditing ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isEditing ? 'Collapse' : 'Edit'}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-gray-100">
          <SectionContentEditor
            section={section}
            primaryColor={primaryColor}
            onSave={onSave}
          />
        </div>
      )}
    </div>
  );
}

interface SectionContentEditorProps {
  section: SectionWithContent;
  primaryColor: string;
  onSave: (content: Record<string, any>) => void;
}

function SectionContentEditor({ section, primaryColor, onSave }: SectionContentEditorProps) {
  const [content, setContent] = useState<Record<string, any>>({ ...section.content });
  const [dirty, setDirty] = useState(false);

  const update = (key: string, value: any) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const updateNested = (path: string[], value: any) => {
    setContent(prev => {
      const next = { ...prev };
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...cur[path[i]] };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    onSave(content);
    setDirty(false);
  };

  const renderEditor = () => {
    switch (section.section_type) {
      case 'hero':
        return <HeroEditor content={content} update={update} />;
      case 'features':
        return <FeaturesEditor content={content} update={update} />;
      case 'showcase':
        return <ShowcaseEditor content={content} update={update} />;
      case 'steps':
        return <StepsEditor content={content} update={update} />;
      case 'categories':
        return <CategoriesEditor content={content} update={update} />;
      case 'text-section':
        return <TextSectionEditor content={content} update={update} />;
      case 'cta':
        return <CTAEditor content={content} update={update} />;
      case 'gallery':
        return <GalleryEditor content={content} update={update} />;
      case 'tabs':
        return <TabsEditor content={content} update={update} />;
      default:
        return (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-2">Raw JSON editor for unknown section type:</p>
            <textarea
              className="w-full font-mono text-xs border border-gray-200 rounded p-3 h-48"
              value={JSON.stringify(content, null, 2)}
              onChange={e => {
                try {
                  setContent(JSON.parse(e.target.value));
                  setDirty(true);
                } catch {}
              }}
            />
          </div>
        );
    }
  };

  return (
    <div>
      <div className="p-4">{renderEditor()}</div>
      <div className="flex justify-end gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
        >
          <Save size={14} />
          Save Section
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
    />
  );
}

function HeroEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldRow label="Headline">
          <TextInput value={content.headline} onChange={v => update('headline', v)} placeholder="Welcome" />
        </FieldRow>
        <FieldRow label="Headline Highlight">
          <TextInput value={content.headline_highlight} onChange={v => update('headline_highlight', v)} placeholder="to our site" />
        </FieldRow>
      </div>
      <FieldRow label="Subheadline">
        <Textarea value={content.subheadline} onChange={v => update('subheadline', v)} rows={2} />
      </FieldRow>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldRow label="Button Text">
          <TextInput value={content.cta_text} onChange={v => update('cta_text', v)} placeholder="Get Started" />
        </FieldRow>
        <FieldRow label="Button Link">
          <TextInput value={content.cta_link} onChange={v => update('cta_link', v)} placeholder="/register" />
        </FieldRow>
      </div>
      <FieldRow label="Background Image URL">
        <TextInput value={content.background_image} onChange={v => update('background_image', v)} placeholder="https://..." />
      </FieldRow>
      {content.background_image && (
        <FieldRow label="Image Layout">
          <select
            value={content.image_layout || 'default'}
            onChange={e => update('image_layout', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="default">Default (text centered, no image)</option>
            <option value="full-width">Full-width background</option>
            <option value="grid-left">Image left, text right</option>
            <option value="grid-right">Text left, image right</option>
          </select>
        </FieldRow>
      )}
    </div>
  );
}

function FeaturesEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  const features = Array.isArray(content.features) ? content.features : [];

  const updateFeature = (i: number, key: string, val: any) => {
    const next = features.map((f: any, idx: number) => idx === i ? { ...f, [key]: val } : f);
    update('features', next);
  };

  const addFeature = () => update('features', [...features, { title: `Feature ${features.length + 1}`, description: '', icon: '', icon_bg_color: 'bg-blue-100', icon_color: 'text-blue-600' }]);
  const removeFeature = (i: number) => update('features', features.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      {features.map((f: any, i: number) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Feature {i + 1}</span>
            <button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Title">
              <TextInput value={f.title} onChange={v => updateFeature(i, 'title', v)} />
            </FieldRow>
            <FieldRow label="Icon name">
              <TextInput value={f.icon} onChange={v => updateFeature(i, 'icon', v)} placeholder="Shield, Star, Zap…" />
            </FieldRow>
          </div>
          <FieldRow label="Description">
            <Textarea value={f.description} onChange={v => updateFeature(i, 'description', v)} rows={2} />
          </FieldRow>
        </div>
      ))}
      <button
        onClick={addFeature}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={14} /> Add Feature
      </button>
    </div>
  );
}

function ShowcaseEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  const items = Array.isArray(content.items) ? content.items : [];

  const updateItem = (i: number, key: string, val: any) => {
    const next = items.map((item: any, idx: number) => idx === i ? { ...item, [key]: val } : item);
    update('items', next);
  };

  const addItem = () => update('items', [...items, { title: `Item ${items.length + 1}`, description: '', image_url: '', link: '' }]);
  const removeItem = (i: number) => update('items', items.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldRow label="Section Title">
          <TextInput value={content.title} onChange={v => update('title', v)} placeholder="Our Showcase" />
        </FieldRow>
        <FieldRow label="Section Subtitle">
          <TextInput value={content.subtitle} onChange={v => update('subtitle', v)} placeholder="Optional subtitle" />
        </FieldRow>
      </div>
      {items.map((item: any, i: number) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Item {i + 1}</span>
            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Title">
              <TextInput value={item.title} onChange={v => updateItem(i, 'title', v)} />
            </FieldRow>
            <FieldRow label="Link">
              <TextInput value={item.link} onChange={v => updateItem(i, 'link', v)} placeholder="https://..." />
            </FieldRow>
          </div>
          <FieldRow label="Description">
            <Textarea value={item.description} onChange={v => updateItem(i, 'description', v)} rows={2} />
          </FieldRow>
          <FieldRow label="Image URL">
            <TextInput value={item.image_url} onChange={v => updateItem(i, 'image_url', v)} placeholder="https://..." />
          </FieldRow>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={14} /> Add Item
      </button>
    </div>
  );
}

function StepsEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  const steps = Array.isArray(content.steps) ? content.steps : [];

  const updateStep = (i: number, key: string, val: any) => {
    const next = steps.map((s: any, idx: number) => idx === i ? { ...s, [key]: val } : s);
    update('steps', next);
  };

  const addStep = () => update('steps', [...steps, { number: steps.length + 1, label: `Step ${steps.length + 1}`, description: '' }]);
  const removeStep = (i: number) => update('steps', steps.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      <FieldRow label="Section Title">
        <TextInput value={content.title} onChange={v => update('title', v)} placeholder="Our Process" />
      </FieldRow>
      {steps.map((s: any, i: number) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Step {i + 1}</span>
            <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Number / Label">
              <TextInput value={s.label || s.title} onChange={v => updateStep(i, 'label', v)} />
            </FieldRow>
            <FieldRow label="Number Badge">
              <TextInput value={String(s.number || i + 1)} onChange={v => updateStep(i, 'number', parseInt(v) || i + 1)} />
            </FieldRow>
          </div>
          <FieldRow label="Description">
            <Textarea value={s.description} onChange={v => updateStep(i, 'description', v)} rows={2} />
          </FieldRow>
        </div>
      ))}
      <button
        onClick={addStep}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={14} /> Add Step
      </button>
    </div>
  );
}

function CategoriesEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  const categories = Array.isArray(content.categories) ? content.categories : [];
  const [newCat, setNewCat] = useState('');

  const addCat = () => {
    if (!newCat.trim()) return;
    update('categories', [...categories, newCat.trim()]);
    setNewCat('');
  };

  const removeCat = (i: number) => update('categories', categories.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      <FieldRow label="Section Title">
        <TextInput value={content.title} onChange={v => update('title', v)} placeholder="Categories" />
      </FieldRow>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Categories</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((cat: string, i: number) => (
            <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-800 text-xs px-3 py-1.5 rounded-full">
              {cat}
              <button onClick={() => removeCat(i)} className="hover:text-red-600 ml-1">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCat()}
            placeholder="Type category name…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addCat}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function TextSectionEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Section Title">
        <TextInput value={content.section_title} onChange={v => update('section_title', v)} placeholder="Section Title" />
      </FieldRow>
      <FieldRow label="Body Content">
        <Textarea value={content.body_content} onChange={v => update('body_content', v)} rows={6} />
        <p className="text-xs text-gray-400 mt-1">Separate paragraphs with a blank line.</p>
      </FieldRow>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <FieldRow label="Text Alignment">
          <select
            value={content.text_alignment || 'left'}
            onChange={e => update('text_alignment', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </FieldRow>
        <FieldRow label="Max Width">
          <select
            value={content.max_width || 'normal'}
            onChange={e => update('max_width', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="narrow">Narrow</option>
            <option value="normal">Normal</option>
            <option value="wide">Wide</option>
          </select>
        </FieldRow>
        <FieldRow label="Background">
          <select
            value={content.background_style || 'none'}
            onChange={e => update('background_style', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="none">White</option>
            <option value="light_gray">Light Gray</option>
            <option value="soft_blue">Soft Blue</option>
            <option value="soft_yellow">Soft Yellow</option>
          </select>
        </FieldRow>
        <FieldRow label="Vertical Spacing">
          <select
            value={content.vertical_spacing || 'normal'}
            onChange={e => update('vertical_spacing', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </FieldRow>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={content.show_divider || false}
          onChange={e => update('show_divider', e.target.checked)}
          className="rounded"
        />
        Show divider lines
      </label>
    </div>
  );
}

function CTAEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <FieldRow label="Heading">
        <TextInput value={content.heading} onChange={v => update('heading', v)} placeholder="Ready to get started?" />
      </FieldRow>
      <FieldRow label="Description">
        <Textarea value={content.description} onChange={v => update('description', v)} rows={2} />
      </FieldRow>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldRow label="Button Text">
          <TextInput value={content.button_text} onChange={v => update('button_text', v)} placeholder="Click Here" />
        </FieldRow>
        <FieldRow label="Button Link">
          <TextInput value={content.button_link} onChange={v => update('button_link', v)} placeholder="/register" />
        </FieldRow>
      </div>
      <FieldRow label="Background Color">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={content.background_color || '#2563EB'}
            onChange={e => update('background_color', e.target.value)}
            className="h-9 w-14 rounded border border-gray-300 cursor-pointer"
          />
          <TextInput value={content.background_color || '#2563EB'} onChange={v => update('background_color', v)} placeholder="#2563EB" />
        </div>
      </FieldRow>
    </div>
  );
}

function GalleryEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  const images = Array.isArray(content.images) ? content.images : [];

  const updateImage = (i: number, key: string, val: any) => {
    const next = images.map((img: any, idx: number) => idx === i ? { ...img, [key]: val } : img);
    update('images', next);
  };

  const addImage = () => update('images', [...images, { url: '', alt_text: '', caption: '' }]);
  const removeImage = (i: number) => update('images', images.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      <FieldRow label="Section Title">
        <TextInput value={content.title} onChange={v => update('title', v)} placeholder="Gallery" />
      </FieldRow>
      {images.map((img: any, i: number) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Image {i + 1}</span>
            <button onClick={() => removeImage(i)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
          <FieldRow label="Image URL">
            <TextInput value={img.url} onChange={v => updateImage(i, 'url', v)} placeholder="https://..." />
          </FieldRow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Alt Text">
              <TextInput value={img.alt_text} onChange={v => updateImage(i, 'alt_text', v)} />
            </FieldRow>
            <FieldRow label="Caption">
              <TextInput value={img.caption} onChange={v => updateImage(i, 'caption', v)} />
            </FieldRow>
          </div>
        </div>
      ))}
      <button
        onClick={addImage}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={14} /> Add Image
      </button>
    </div>
  );
}

function TabsEditor({ content, update }: { content: Record<string, any>; update: (k: string, v: any) => void }) {
  const tabs = Array.isArray(content.tabs) ? content.tabs : [];

  const updateTab = (i: number, key: string, val: any) => {
    const next = tabs.map((t: any, idx: number) => idx === i ? { ...t, [key]: val } : t);
    update('tabs', next);
  };

  const addTab = () => update('tabs', [...tabs, { title: `Tab ${tabs.length + 1}`, content: '' }]);
  const removeTab = (i: number) => update('tabs', tabs.filter((_: any, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      <FieldRow label="Section Title">
        <TextInput value={content.title} onChange={v => update('title', v)} placeholder="Optional section heading" />
      </FieldRow>
      {tabs.map((tab: any, i: number) => (
        <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Tab {i + 1}</span>
            <button onClick={() => removeTab(i)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
          <FieldRow label="Tab Title">
            <TextInput value={tab.title} onChange={v => updateTab(i, 'title', v)} />
          </FieldRow>
          <FieldRow label="Content">
            <Textarea value={tab.content} onChange={v => updateTab(i, 'content', v)} rows={4} />
            <p className="text-xs text-gray-400 mt-1">Use • or - at the start of a line for bullet points.</p>
          </FieldRow>
        </div>
      ))}
      <button
        onClick={addTab}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus size={14} /> Add Tab
      </button>
    </div>
  );
}
