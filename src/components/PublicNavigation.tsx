import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GraduationCap } from 'lucide-react';

interface CMSPage {
  slug: string;
  title: string;
}

interface SiteSettings {
  primary_color: string;
}

const DEFAULT_PRIMARY_COLOR = '#2563EB';

export function PublicNavigation() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [loading, setLoading] = useState(true);
  const [navError, setNavError] = useState<string | null>(null);

  useEffect(() => {
    fetchNavData();
  }, []);

  const fetchNavData = async () => {
    try {
      setNavError(null);

      // Fetch published CMS pages
      const { data: pagesData, error: pagesError } = await supabase
        .from('cms_pages')
        .select('slug, title')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (pagesError) {
        const msg = `Failed to load navigation pages: ${pagesError.message}`;
        if (import.meta.env.DEV) console.warn(msg, pagesError);
        setNavError('Navigation unavailable');
      } else if (pagesData) {
        setPages(pagesData);
      }

      // Fetch site settings for branding
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('primary_color')
        .eq('id', 1)
        .single();

      if (settingsError) {
        const msg = `Failed to load site settings: ${settingsError.message}`;
        if (import.meta.env.DEV) console.warn(msg, settingsError);
      } else if (settingsData && settingsData.primary_color) {
        setPrimaryColor(settingsData.primary_color);
      }
    } catch (err) {
      const msg = 'Unexpected error loading navigation';
      if (import.meta.env.DEV) console.error(msg, err);
      setNavError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <GraduationCap className="h-8 w-8" style={{ color: primaryColor }} />
            <span className="text-xl font-bold text-gray-900">UCC IP Office</span>
          </button>

          {/* Center Navigation Links */}
          {!loading && (
            <div className="hidden md:flex gap-6 items-center">
              <button
                onClick={() => navigate('/')}
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Home
              </button>
              {pages.length > 0 && pages.map((page) => (
                <a
                  key={page.slug}
                  href={`/pages/${page.slug}`}
                  className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  {page.title}
                </a>
              ))}
            </div>
          )}

          {/* Error indicator in nav */}
          {navError && !loading && (
            <div className="hidden md:flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded">
              <span>⚠️</span>
              <span>{navError}</span>
            </div>
          )}

          {/* Auth Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 font-medium transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              Register
            </button>
          </div>
        </div>

        {/* Mobile Navigation Links */}
        {!loading && (\n          <div className="md:hidden pb-4 flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Home
            </button>
            {pages.length > 0 && pages.map((page) => (
              <a
                key={page.slug}
                href={`/pages/${page.slug}`}
                className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                {page.title}
              </a>
            ))}
          </div>
        )}

        {/* Mobile error indicator */}
        {navError && !loading && (
          <div className="md:hidden pb-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded flex items-center gap-2">
            <span>⚠️</span>
            <span>{navError}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
