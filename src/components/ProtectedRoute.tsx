import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../lib/database.types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's email is verified
  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Not Verified</h1>
          <p className="text-gray-600 mb-6">Please check your email and verify your address to access the dashboard.</p>
          <button
            onClick={() => window.location.href = '/register'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Registration
          </button>
        </div>
      </div>
    );
  }

  // Check if profile exists
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Check if applicant is approved (NEW: Admin approval workflow)
  if (profile.role === 'applicant' && profile.is_approved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Check role permissions if specified
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
