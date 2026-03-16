import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Plus, CreditCard as Edit, Trash2, Search, Eye, EyeOff, AlertCircle, Navigation, RefreshCw, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react';
import { PAGE_TEMPLATES, getTemplate } from '../lib/pageTemplates';
import { canPublishPage } from '../lib/sectionValidation';
import { getDefaultContent, supportedSectionTypes } from '../components/cms/sectionRegistry';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  show_in_nav: boolean;
  nav_order: number;
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
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState<string | null>(null);
  const [showReplaceHomeConfirm, setShowReplaceHomeConfirm] = useState(false);
  const [replacingHome, setReplacingHome] = useState(false);
  const [showNavOrganizer, setShowNavOrganizer] = useState(false);
  const [navOrderList, setNavOrderList] = useState<CMSPage[]>([]);
  const [savingNavOrder, setSavingNavOrder] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
  });
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
    // If unpublishing a live page, require confirmation first
    if (currentStatus) {
      setShowUnpublishConfirm(pageId);
      return;
    }

    // Publishing: validate first
    setToggling(pageId);
    setError(null);

    try {
      const { data: sections, error: sectionsErr } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageId);

      if (sectionsErr) throw sectionsErr;

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

    try {
      const { error: err } = await (supabase
        .from('cms_pages')
        .update({ is_published: true })
        .eq('id', pageId) as any);

      if (err) throw err;

      setPages(pages.map((p) => (p.id === pageId ? { ...p, is_published: true } : p)));
      setSuccess('Page published successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error publishing page:', err);
      setError(err.message || 'Failed to publish page');
    } finally {
      setToggling(null);
    }
  };

  const handleConfirmUnpublish = async (pageId: string) => {
    setShowUnpublishConfirm(null);
    setToggling(pageId);
    setError(null);

    try {
      const { error: err } = await (supabase
        .from('cms_pages')
        .update({ is_published: false })
        .eq('id', pageId) as any);

      if (err) throw err;

      setPages(pages.map((p) => (p.id === pageId ? { ...p, is_published: false } : p)));
      setSuccess('Page unpublished successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error unpublishing page:', err);
      setError(err.message || 'Failed to unpublish page');
    } finally {
      setToggling(null);
    }
  };

  const handleReplaceHomeWithTemplate = async () => {
    setShowReplaceHomeConfirm(false);
    setReplacingHome(true);
    setError(null);
    try {
      const { data: homePageData, error: homeErr } = await supabase
        .from('cms_pages')
        .select('id')
        .eq('slug', 'home')
        .maybeSingle();

      if (homeErr) throw homeErr;

      let homePageId: string;

      if (!homePageData) {
        const { data: newPage, error: createErr } = await supabase
          .from('cms_pages')
          .insert([{ title: 'Home', slug: 'home', is_published: true }] as any)
          .select()
          .single();
        if (createErr) throw createErr;
        homePageId = (newPage as any).id;
      } else {
        homePageId = homePageData.id;
        const { error: delErr } = await supabase
          .from('cms_sections')
          .delete()
          .eq('page_id', homePageId);
        if (delErr) throw delErr;
      }

      const sectionsToInsert = supportedSectionTypes.map((t, index) => ({
        page_id: homePageId,
        section_type: t.value,
        content: getDefaultContent(t.value),
        order_index: index,
      }));

      const { error: insertErr } = await supabase
        .from('cms_sections')
        .insert(sectionsToInsert as any);
      if (insertErr) throw insertErr;

      const { error: publishErr } = await supabase
        .from('cms_pages')
        .update({ is_published: true } as any)
        .eq('slug', 'home');
      if (publishErr) throw publishErr;

      setSuccess('Home page replaced with template. Click "Open Home" to preview.');
      setTimeout(() => setSuccess(null), 8000);
      fetchPages();
    } catch (err: any) {
      setError(err.message || 'Failed to replace home page');
    } finally {
      setReplacingHome(false);
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

  const openNavOrganizer = () => {
    const navPages = pages
      .filter((p) => p.show_in_nav !== false && p.slug !== 'home')
      .sort((a, b) => (a.nav_order ?? 0) - (b.nav_order ?? 0) || a.title.localeCompare(b.title));
    setNavOrderList(navPages);
    setShowNavOrganizer(true);
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const updated = [...navOrderList];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= updated.length) return;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setNavOrderList(updated);
  };

  const handleSaveNavOrder = async () => {
    setSavingNavOrder(true);
    setError(null);
    try {
      await Promise.all(
        navOrderList.map((page, index) =>
          (supabase
            .from('cms_pages')
            .update({ nav_order: index + 1 } as any)
            .eq('id', page.id) as any)
        )
      );
      setPages(
        pages.map((p) => {
          const idx = navOrderList.findIndex((n) => n.id === p.id);
          return idx !== -1 ? { ...p, nav_order: idx + 1 } : p;
        })
      );
      setShowNavOrganizer(false);
      setSuccess('Navbar order saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save navbar order');
    } finally {
      setSavingNavOrder(false);
    }
  };

  const handleResetNavOrder = () => {
    setNavOrderList([...navOrderList].sort((a, b) => a.title.localeCompare(b.title)));
  };

  const handleToggleNavVisibility = async (pageId: string, currentVisible: boolean) => {
    try {
      const { error: err } = await (supabase
        .from('cms_pages')
        .update({ show_in_nav: !currentVisible })
        .eq('id', pageId) as any);

      if (err) throw err;

      setPages(pages.map((p) =>
        p.id === pageId ? { ...p, show_in_nav: !currentVisible } : p
      ));
      setSuccess(`Page ${!currentVisible ? 'shown in' : 'hidden from'} navigation`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling nav visibility:', err);
      setError(err.message || 'Failed to update navigation visibility');
    }
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
            style={{ background: primaryColor }}
          >
            <Plus className="h-5 w-5" />
            Create Page
          </button>
          <button
            onClick={openNavOrganizer}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Navigation className="h-5 w-5" />
            Organize Navbar
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nav</th>
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
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleNavVisibility(page.id, page.show_in_nav ?? true)}
                        title={page.show_in_nav !== false ? 'Shown in navigation — click to hide' : 'Hidden from navigation — click to show'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          page.show_in_nav !== false
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        <Navigation className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(page.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {page.slug === 'home' && (
                          <>
                            <a
                              href="/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-50 text-gray-500 rounded-lg transition-colors"
                              title="Open Home page"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </a>
                            <button
                              onClick={() => setShowReplaceHomeConfirm(true)}
                              disabled={replacingHome}
                              className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors disabled:opacity-50"
                              title="Replace Home with template sections"
                            >
                              <RefreshCw className={`h-5 w-5 ${replacingHome ? 'animate-spin' : ''}`} />
                            </button>
                          </>
                        )}
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

      {/* Unpublish Confirmation Modal */}
      {showUnpublishConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unpublish Page?</h2>
            <p className="text-gray-600 mb-6">
              This page will no longer be visible to the public and will be removed from the
              navigation menu. You can re-publish it at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmUnpublish(showUnpublishConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Unpublish
              </button>
              <button
                onClick={() => setShowUnpublishConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplaceHomeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Replace Home with Template?</h2>
            <p className="text-gray-600 mb-2">
              This will <strong>delete all existing sections</strong> on the Home page and replace them with one of each section type — giving you a clean starting point to edit.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
              The Home page will remain published. Your existing content will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReplaceHomeWithTemplate}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                Replace Home
              </button>
              <button
                onClick={() => setShowReplaceHomeConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar Organizer Modal */}
      {showNavOrganizer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Organize Navbar</h2>
            <p className="text-sm text-gray-500 mb-4">
              Use the arrows to set the order of pages in the public navigation bar.
            </p>

            {navOrderList.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                No pages are currently shown in the navbar.
              </p>
            ) : (
              <ul className="space-y-2 mb-6">
                {navOrderList.map((page, index) => (
                  <li
                    key={page.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <span className="w-5 text-center text-xs font-semibold text-gray-400">{index + 1}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{page.title}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveNavItem(index, 'up')}
                        disabled={index === 0}
                        title="Move up"
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUp className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveNavItem(index, 'down')}
                        disabled={index === navOrderList.length - 1}
                        title="Move down"
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowDown className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNavOrder}
                  disabled={savingNavOrder}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {savingNavOrder ? 'Saving...' : 'Save Order'}
                </button>
                <button
                  onClick={() => setShowNavOrganizer(false)}
                  disabled={savingNavOrder}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetNavOrder}
                disabled={savingNavOrder}
                className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Reset to alphabetical order
              </button>
            </div>
          </div>
        </div>
      )}

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
