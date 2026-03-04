import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { PublicNavigation } from '../components/PublicNavigation';
import { Footer } from '../components/Footer';
import { CmsPageRenderer } from '../components/cms/CmsPageRenderer';
import type { CmsSection } from '../components/cms/sectionRegistry';

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
}

export function CMSPageRenderer() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CMSPage | null>(null);
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { siteName, primaryColor, secondaryColor } = useBranding();
  const branding = { primaryColor, secondaryColor, siteName };

  useEffect(() => {
    if (slug) fetchPageData();
  }, [slug]);

  useEffect(() => {
    if (!page) return;
    const prev = document.title;
    document.title = `${page.title} | ${siteName}`;
    return () => { document.title = prev; };
  }, [page, siteName]);

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      setLoadError(null);

      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data: pageData, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (pageError) {
        if (import.meta.env.DEV) console.error('Page fetch error:', pageError);
        setLoadError(`Unable to load page: ${pageError.message}`);
        setLoading(false);
        return;
      }

      if (!pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPage(pageData as CMSPage);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('cms_sections')
        .select('*')
        .eq('page_id', pageData.id)
        .order('order_index', { ascending: true });

      if (sectionsError) {
        if (import.meta.env.DEV) console.warn('Sections fetch error:', sectionsError);
        setLoadError(`Some page content may not be available: ${sectionsError.message}`);
      } else {
        setSections((sectionsData as CmsSection[]) || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (import.meta.env.DEV) console.error('Unexpected error:', err);
      setLoadError(`Failed to load page: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation />
      <div className="pt-16">
        {loadError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
              {loadError}
            </div>
          </div>
        )}
        <CmsPageRenderer page={page} sections={sections} branding={branding} />
        <Footer />
      </div>
    </div>
  );
}
