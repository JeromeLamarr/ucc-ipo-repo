import { ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { NotificationCenter } from './NotificationCenter';
import {
  GraduationCap,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import {
  dashboardRouteConfigs,
  navHref,
  type DashboardRouteConfig,
  type NavConfig,
} from '../dashboard/dashboardRouteConfig';
import { filterNavRoutesByRole } from '../dashboard/roleAccess';

interface DashboardLayoutProps {
  children: ReactNode;
}

/** Narrows config to entries that are guaranteed to have nav metadata. */
type NavRoute = DashboardRouteConfig & { nav: NavConfig };

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { siteName, logoPath, primaryColor } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Build nav items from the single source-of-truth route config.
  // filterNavRoutesByRole returns only routes with nav metadata that the
  // current user's role is allowed to see, sorted by nav.order.
  const filteredNavItems = (profile
    ? (filterNavRoutesByRole(profile.role, dashboardRouteConfigs) as NavRoute[])
    : []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-blue-200/30 z-30 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-blue-100/50 rounded-lg transition-colors duration-200"
            >
              {sidebarOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-3 group">
              {logoPath ? (
                <img 
                  src={logoPath} 
                  alt={siteName}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="p-2 rounded-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, #6366f1)` }}>
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
              )}
              <span className="font-black text-lg hidden sm:block" style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{siteName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-4 border-l border-blue-200/30">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-900">{profile?.full_name}</div>
                <div className="text-xs text-gray-500 capitalize font-medium">{profile?.role}</div>
              </div>
              <div className="h-10 w-10 rounded-full text-white font-bold flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, #6366f1)` }}>
                {profile?.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-gradient-to-b from-white via-blue-50/30 to-indigo-50/20 border-r border-blue-200/30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } mt-16 shadow-xl lg:shadow-none`}
      >
        <nav className="h-full flex flex-col p-4 space-y-2">
          <div className="flex-1 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.nav.icon;
              const href = navHref(item.path);
              const active = isActive(href);
              return (
                <Link
                  key={item.path}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    active
                      ? 'text-white font-semibold shadow-lg'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-100/50 hover:to-indigo-100/30 hover:text-blue-700'
                  }`}
                  style={active ? { background: `linear-gradient(135deg, ${primaryColor}, #6366f1)`, boxShadow: `0 8px 16px ${primaryColor}33` } : {}}
                >
                  {Icon && <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />}
                  <span>{item.nav.label}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 text-red-700 hover:bg-gradient-to-r hover:from-red-100/50 hover:to-red-100/30 rounded-xl transition-all duration-200 w-full font-medium group"
          >
            <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden mt-16 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 pt-16">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
