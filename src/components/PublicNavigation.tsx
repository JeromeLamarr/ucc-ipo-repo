import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { GraduationCap, Menu, X } from 'lucide-react';

interface CMSPage {
  slug: string;
  title: string;
  nav_label: string | null;
  nav_order: number;
  show_in_nav: boolean;
}

export function PublicNavigation() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor, siteName, logoPath } = useBranding();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [navError, setNavError] = useState<string | null>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchNavPages();
    
    // Add scroll listener for shadow effect
    const handleScroll = () => {
      setHasScroll(window.scrollY > 0);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchNavPages = async () => {
    try {
      setNavError(null);

      // Fetch published CMS pages (excluding home page)
      const { data: pagesData, error: pagesError } = await supabase
        .from('cms_pages')
        .select('slug, title, nav_label, nav_order, show_in_nav')
        .eq('is_published', true)
        .eq('show_in_nav', true)
        .neq('slug', 'home')
        .order('nav_order', { ascending: true })
        .order('title', { ascending: true });

      if (pagesError) {
        const msg = `Failed to load navigation pages: ${pagesError.message}`;
        if (import.meta.env.DEV) console.warn(msg, pagesError);
        setNavError('Navigation unavailable');
      } else if (pagesData) {
        setPages(pagesData);
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
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-300 ${
      hasScroll ? 'shadow-lg' : 'shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-4">
          {/* Logo - Left */}
          <button
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
            className="min-w-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {logoPath ? (
              <img
                src={logoPath}
                alt={siteName}
                className="h-8 w-8 object-contain flex-shrink-0"
              />
            ) : (
              <GraduationCap className="h-8 w-8 flex-shrink-0" style={{ color: primaryColor }} />
            )}
            <span className="min-w-0 truncate text-base font-bold text-gray-900 hidden sm:block max-w-[160px] sm:max-w-[240px] md:max-w-[320px]">
              {siteName}
            </span>
          </button>

          {/* Center Navigation Links - Hidden on mobile */}
          {!loading && (
            <div className="hidden md:flex flex-1 justify-center">
              <div className="min-w-0 flex items-center gap-6">
                <button
                  onClick={() => {
                    navigate('/');
                    setMobileMenuOpen(false);
                  }}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm whitespace-nowrap"
                >
                  Home
                </button>
                {pages.length > 0 && pages.map((page) => (
                  <a
                    key={page.slug}
                    href={`/pages/${page.slug}`}
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm whitespace-nowrap"
                  >
                    {page.nav_label || page.title}
                  </a>
                ))}
                <button
                  onClick={() => {
                    navigate('/ip-search');
                    setMobileMenuOpen(false);
                  }}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors text-sm whitespace-nowrap"
                >
                  IP Search
                </button>
              </div>
            </div>
          )}

          {/* Spacer when nav links are loading */}
          {loading && <div className="flex-1" />}

          {/* Auth Buttons - Right */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Desktop buttons */}
            <div className="hidden sm:flex gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-all duration-300 text-sm"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 text-white rounded-lg hover:shadow-lg font-semibold transition-all duration-300 hover:scale-105 text-sm"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                Register
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 bg-gradient-to-b from-white to-gray-50 border-t border-gray-200">
            <div className="space-y-3 pt-4">
              <button
                onClick={() => {
                  navigate('/');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium text-sm rounded-lg transition-colors"
              >
                Home
              </button>
              {pages.length > 0 && pages.map((page) => (
                <a
                  key={page.slug}
                  href={`/pages/${page.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium text-sm rounded-lg transition-colors"
                >
                  {page.nav_label || page.title}
                </a>
              ))}
              <button
                onClick={() => {
                  navigate('/ip-search');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium text-sm rounded-lg transition-colors"
              >
                IP Search
              </button>

              {/* Mobile Auth Buttons */}
              <div className="pt-2 px-4 flex flex-col gap-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition-all text-sm"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    navigate('/register');
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-2 text-white rounded-lg hover:shadow-lg font-semibold transition-all text-sm"
                  style={{
                    background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                  }}
                >
                  Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error indicator */}
        {navError && !loading && (
          <div className={`text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded flex items-center gap-2 ${
            mobileMenuOpen ? 'block' : 'hidden md:flex'
          }`}>
            <span>⚠️</span>
            <span>{navError}</span>
          </div>
        )}
      </div>
    </nav>
  );
}

