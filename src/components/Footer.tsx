import { useBranding } from '../hooks/useBranding';

export function Footer() {
  const { siteName, logoPath, primaryColor } = useBranding();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 mt-20 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logoPath ? (
                <img 
                  src={logoPath} 
                  alt={siteName}
                  className="h-6 w-6 object-contain" 
                />
              ) : null}
              <h3 className="text-lg font-bold" style={{ color: primaryColor }}>
                {siteName}
              </h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Supporting innovation and intellectual property excellence at {siteName}.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="/" 
                  className="text-gray-300 hover:transition-colors"
                  style={{ '--hover-color': primaryColor } as any}
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  Home
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  className="text-gray-300 hover:transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-gray-300 hover:transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
              Support
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="#help" 
                  className="text-gray-300 hover:transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  Help Center
                </a>
              </li>
              <li>
                <a 
                  href="#docs" 
                  className="text-gray-300 hover:transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  Documentation
                </a>
              </li>
              <li>
                <a 
                  href="#faq" 
                  className="text-gray-300 hover:transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: primaryColor }}>
              Contact
            </h3>
            <p className="text-gray-300 text-sm">Email: info@ucc.edu.ph</p>
            <p className="text-gray-300 text-sm">Phone: +63 (2) 1234-5678</p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-400 text-center text-sm">
            © {year} {siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
