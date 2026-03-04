import { useBranding } from '../hooks/useBranding';
import { useFooter } from '../hooks/useFooter';
import type { FooterLink } from '../services/footerService';

// ── Helpers ────────────────────────────────────────────────────────────────

function LinkList({
  links,
  primaryColor,
  fallback,
}: {
  links: FooterLink[];
  primaryColor: string;
  fallback?: React.ReactNode;
}) {
  if (links.length === 0) return <>{fallback}</>;
  return (
    <ul className="space-y-2 text-sm">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            className="text-gray-300 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function Footer() {
  const { siteName, logoPath, primaryColor } = useBranding();
  const { settings, quickLinks, supportLinks, loading } = useFooter();
  const year = new Date().getFullYear();

  const copyrightText = settings.copyright_text
    ? settings.copyright_text
    : `© ${year} ${siteName}. All rights reserved.`;

  const aboutText = settings.about_text
    ? settings.about_text
    : `Supporting innovation and intellectual property excellence at ${siteName}.`;

  // Default fallback links shown while data is loading or if none exist
  const defaultQuickLinks: FooterLink[] = [
    { id: 'dq1', group_name: 'quick', label: 'Home',    url: '/',        sort_order: 1, is_enabled: true, created_at: '', updated_at: '' },
    { id: 'dq2', group_name: 'quick', label: 'About',   url: '#about',   sort_order: 2, is_enabled: true, created_at: '', updated_at: '' },
    { id: 'dq3', group_name: 'quick', label: 'Contact', url: '#contact', sort_order: 3, is_enabled: true, created_at: '', updated_at: '' },
  ];
  const defaultSupportLinks: FooterLink[] = [
    { id: 'ds1', group_name: 'support', label: 'Help Center',    url: '#help', sort_order: 1, is_enabled: true, created_at: '', updated_at: '' },
    { id: 'ds2', group_name: 'support', label: 'Documentation',  url: '#docs', sort_order: 2, is_enabled: true, created_at: '', updated_at: '' },
    { id: 'ds3', group_name: 'support', label: 'FAQ',            url: '#faq',  sort_order: 3, is_enabled: true, created_at: '', updated_at: '' },
  ];

  const resolvedQuick   = quickLinks.length   > 0 ? quickLinks   : (loading ? [] : defaultQuickLinks);
  const resolvedSupport = supportLinks.length > 0 ? supportLinks : (loading ? [] : defaultSupportLinks);

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 mt-20 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logoPath && (
                <img src={logoPath} alt={siteName} className="h-6 w-6 object-contain" />
              )}
              <h3 className="text-lg font-bold" style={{ color: primaryColor }}>
                {siteName}
              </h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{aboutText}</p>
          </div>

          {/* Quick Links */}
          {settings.show_quick_links && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
                Quick Links
              </h3>
              <LinkList links={resolvedQuick} primaryColor={primaryColor} />
            </div>
          )}

          {/* Support */}
          {settings.show_support && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
                Support
              </h3>
              <LinkList links={resolvedSupport} primaryColor={primaryColor} />
            </div>
          )}

          {/* Contact */}
          {settings.show_contact && (settings.contact_email || settings.contact_phone || settings.contact_address) && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
                Contact
              </h3>
              {settings.contact_email && (
                <p className="text-gray-300 text-sm">Email: {settings.contact_email}</p>
              )}
              {settings.contact_phone && (
                <p className="text-gray-300 text-sm">Phone: {settings.contact_phone}</p>
              )}
              {settings.contact_address && (
                <p className="text-gray-300 text-sm mt-1">{settings.contact_address}</p>
              )}
            </div>
          )}

          {/* Fallback contact (shown when no contact data configured) */}
          {settings.show_contact && !settings.contact_email && !settings.contact_phone && !settings.contact_address && (
            <div>
              <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
                Contact
              </h3>
              <p className="text-gray-300 text-sm">Email: info@ucc.edu.ph</p>
              <p className="text-gray-300 text-sm">Phone: +63 (2) 1234-5678</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-400 text-center text-sm">{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}

