import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@contexts/AuthContext';
import { ProtectedRoute } from '@components/ProtectedRoute';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { DashboardLayout } from '@components/DashboardLayout';
import { LandingPage } from '@pages/LandingPage';
import { LoginPage } from '@pages/LoginPage';
import { RegisterPage } from '@pages/RegisterPage';
import { AuthCallbackPage } from '@pages/AuthCallbackPage';
import { CMSPageRenderer } from '@pages/CMSPageRenderer';
import { CertificateVerifyPage } from '@pages/CertificateVerifyPage';
import { DisclosureVerifyPage } from '@pages/DisclosureVerifyPage';
import { PendingApprovalPage } from '@pages/PendingApprovalPage';
import { ForgotPasswordPage } from '@pages/ForgotPasswordPage';
import { useEffect } from 'react';
import { ensureHomeCMSPageExists } from '@lib/cmsSetup';
import { dashboardRouteConfigs } from './dashboard/dashboardRouteConfig';

/**
 * Config-driven dashboard router.
 *
 * Every route in dashboardRouteConfigs is registered here and wrapped with
 * ProtectedRoute so that allowedRoles is enforced at the route level —
 * not just via conditional sidebar rendering.
 *
 * To add, remove, or restrict a dashboard route:
 *   → Edit src/dashboard/dashboardRouteConfig.tsx — do NOT touch this function.
 */
function DashboardRouter() {
  return (
    <DashboardLayout>
      <Routes>
        {dashboardRouteConfigs.map((route) => {
          const Component = route.component;
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute allowedRoles={route.allowedRoles}>
                  <Component />
                </ProtectedRoute>
              }
            />
          );
        })}
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  useEffect(() => {
    // Initialize CMS home page on app startup
    ensureHomeCMSPageExists();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/verify/:trackingId" element={<CertificateVerifyPage />} />
          <Route path="/verify-disclosure/:trackingId" element={<DisclosureVerifyPage />} />
          <Route
            path="/pending-approval"
            element={
              <ProtectedRoute>
                <PendingApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route path="/pages/:slug" element={<CMSPageRenderer />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>
                <p className="text-gray-600">You don't have permission to access this page.</p>
              </div>
            </div>
          } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
