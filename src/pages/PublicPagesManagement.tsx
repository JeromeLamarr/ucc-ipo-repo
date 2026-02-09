import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Plus, Edit, Trash2, Search, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { PAGE_TEMPLATES, getTemplate } from '../lib/pageTemplates';
import { canPublishPage } from '../lib/sectionValidation';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  created_at: string;
}

export function PublicPagesManagement() {
  const navigate = useNavigate();
  const { primaryColor } = useBranding();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
  });
  // Track validation errors for each page
  const [pageValidationErrors, setPageValidationErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    filterPages();
  }, [pages, searchTerm]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('cms_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      const pagesData = (data || []) as CMSPage[];
      setPages(pagesData);
      setError(null);

      // For each draft page, fetch sections and validate
      if (pagesData) {
        const validationMap: Record<string, string[]> = {};

        for (const page of pagesData) {
          if (!page.is_published) {
            const { data: sections, error: sectionsErr } = await supabase
              .from('cms_sections')
              .select('*')
              .eq('page_id', page.id);

            if (!sectionsErr && sections) {
              const validation = canPublishPage(sections as any[]);
              if (!validation.canPublish) {
                validationMap[page.id] = validation.issues;
              }
            }
          }
        }

        setPageValidationErrors(validationMap);
      }
    } catch (err: any) {
      console.error('Error fetching pages:', err);
      setError(err.message || 'Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  };

  const filterPages = () => {
    const filtered = pages.filter(
      (page) =>
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPages(filtered);
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.slug.trim()) {
      setError('Title and slug are required');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create the page
      const { data: pageData, error: pageErr } = await supabase
        .from('cms_pages')
        .insert([{
          title: formData.title.trim(),
          slug: formData.slug.trim(),
          is_published: false,
        }] as any)
        .select();

      if (pageErr) throw pageErr;
      if (!pageData || pageData.length === 0) throw new Error('Failed to create page');

      const newPageId = (pageData[0] as CMSPage).id;

      // Get template and create blocks if not blank
      const template = getTemplate(selectedTemplate);
      if (template && template.blocks.length > 0) {
        const blocksToInsert = template.blocks.map((block, index) => ({
          page_id: newPageId,
          section_type: block.section_type,
          content: block.content,
          order_index: index,
        }));

        const { error: blocksErr } = await supabase
          .from('cms_sections')
          .insert(blocksToInsert as any);

        if (blocksErr) throw blocksErr;
      }

      setPages([...pages, ...(pageData as CMSPage[])]);
      setSuccess(`Page created successfully with ${selectedTemplate === 'blank' ? 'no' : selectedTemplate} template`);
      setFormData({ title: '', slug: '' });
      setSelectedTemplate('blank');
      setShowCreateModal(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error creating page:', err);
      setError(err.message || 'Failed to create page');
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (pageId: string, currentStatus: boolean) => {
    // If trying to publish (not unpublish), validate first
    if (!currentStatus) {
      setToggling(pageId);
      setError(null);

      try {
        // Fetch all sections for this page
        const { data: sections, error: sectionsErr } = await supabase
          .from('cms_sections')
          .select('*')
          .eq('page_id', pageId);

        if (sectionsErr) throw sectionsErr;

        // Check if page can be published
        const validation = canPublishPage(sections || []);

        if (!validation.canPublish) {
          setError(
            `Cannot publish: ${validation.issues[0]} (${validation.issues.length} issue${validation.issues.length !== 1 ? 's' : ''})`
          );
          setToggling(null);
          return;
        }
      } catch (err: any) {
        console.error('Error validating page:', err);
        setError(err.message || 'Failed to validate page');
        setToggling(null);
        return;
      }
    }

    try {
      const { error: err } = await (supabase
        .from('cms_pages')
        .update({ is_published: !currentStatus })
        .eq('id', pageId) as any);

      if (err) throw err;

      setPages(
        pages.map((page) =>
          page.id === pageId ? { ...page, is_published: !currentStatus } : page
        )
      );

      setSuccess(
        `Page ${!currentStatus ? 'published' : 'unpublished'} successfully`
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling publish status:', err);
      setError(err.message || 'Failed to update page');
    } finally {
      setToggling(null);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page? This will also delete all associated sections.')) {
      return;
    }

    setDeleting(pageId);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('cms_pages')
        .delete()
        .eq('id', pageId);

      if (err) throw err;

      setPages(pages.filter((page) => page.id !== pageId));
      setSuccess('Page deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting page:', err);
      setError(err.message || 'Failed to delete page');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pages</h1>
        <p className="text-gray-600">Create and manage your website pages</p>
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

      <div className="rounded-xl shadow-lg p-6 mb-6" style={{ background: 'white' }}>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium"
            style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)` }}
          >
            <Plus className="h-5 w-5" />
            Create Page
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {pages.length === 0 ? 'No pages created yet' : 'No pages match your search'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Page URL</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((page) => (
                  <tr key={page.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{page.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-600">
                        /pages/{page.slug}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            page.is_published
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {page.is_published ? 'Published' : 'Draft'}
                        </span>
                        {!page.is_published && pageValidationErrors[page.id]?.length && (
                          <div className="text-xs text-red-600 flex items-center gap-1">
                            <span>⚠ {pageValidationErrors[page.id].length} issues</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(page.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/dashboard/public-pages/${page.slug}/edit`)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Edit page content"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleTogglePublish(page.id, page.is_published)}
                          disabled={toggling === page.id}
                          className={`p-2 rounded-lg transition-colors ${
                            !page.is_published && pageValidationErrors[page.id]?.length
                              ? 'text-gray-400 hover:bg-gray-50 cursor-not-allowed'
                              : 'text-green-600 hover:bg-green-50 disabled:opacity-50'
                          }`}
                          title={
                            !page.is_published && pageValidationErrors[page.id]?.length
                              ? `Cannot publish: ${pageValidationErrors[page.id][0]}`
                              : page.is_published
                              ? 'Unpublish'
                              : 'Publish'
                          }
                        >
                          {page.is_published ? (
                            <Eye className="h-5 w-5" />
                          ) : (
                            <EyeOff className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          disabled={deleting === page.id}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Page Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Page</h2>

            <form onSubmit={handleCreatePage} className="space-y-6">
              {/* Page Details */}
              <div className="space-y-4 pb-6 border-b border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., About Us, Terms & Conditions"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page URL *
                  </label>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">/pages/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        })
                      }
                      placeholder="e.g., about-us"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={creating}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use lowercase letters, numbers, and hyphens only
                  </p>
                </div>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select a Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PAGE_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      disabled={creating}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } disabled:opacity-50`}
                    >
                      <div className="text-2xl mb-2">{template.icon}</div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                      {template.blocks.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          📦 {template.blocks.length} block{template.blocks.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Page'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ title: '', slug: '' });
                    setSelectedTemplate('blank');
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
