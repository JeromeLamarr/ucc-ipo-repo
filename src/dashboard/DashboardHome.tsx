/**
 * DashboardHome
 *
 * Single entry-point component for the /dashboard index route.
 * Renders the role-appropriate home dashboard without changing any
 * business logic in the individual dashboard pages.
 */
import { useAuth } from '@contexts/AuthContext';
import { AdminDashboard } from '@pages/AdminDashboard';
import { ApplicantDashboard } from '@pages/ApplicantDashboard';
import { EvaluatorDashboard } from '@pages/EvaluatorDashboard';
import { SupervisorDashboard } from '@pages/SupervisorDashboard';

export function DashboardHome() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  switch (profile.role) {
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'evaluator':
      return <EvaluatorDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <ApplicantDashboard />;
  }
}
