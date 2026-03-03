import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Users, FileText, TrendingUp, Activity } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { AdminPendingApplicants } from '../components/AdminPendingApplicants';
import { PageHeader, StatCard, DashboardCard } from '../components/dashboard/ui';
import type { Database } from '../lib/database.types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _User = Database['public']['Tables']['users']['Row'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _IpRecord = Database['public']['Tables']['ip_records']['Row'];

export function AdminDashboard() {
  const { primaryColor: _primaryColor } = useBranding();
  const [stats, setStats] = useState({
    totalUsers: 0,
    applicants: 0,
    supervisors: 0,
    evaluators: 0,
    totalSubmissions: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [categoryStats, setCategoryStats] = useState<{ category: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state for recent activity
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, recordsRes, activityRes] = await Promise.all([
        supabase.from('users').select('role'),
        supabase.from('ip_records').select('status, category'),
        supabase
          .from('activity_logs')
          .select('*, user:users(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (usersRes.data) {
        const users = usersRes.data;
        setStats((prev) => ({
          ...prev,
          totalUsers: users.length,
          applicants: users.filter((u) => u.role === 'applicant').length,
          supervisors: users.filter((u) => u.role === 'supervisor').length,
          evaluators: users.filter((u) => u.role === 'evaluator').length,
        }));
      }

      if (recordsRes.data) {
        const records = recordsRes.data;
        setStats((prev) => ({
          ...prev,
          totalSubmissions: records.length,
          pending: records.filter((r) =>
            ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
          ).length,
          approved: records.filter((r) =>
            ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
          ).length,
          rejected: records.filter((r) => r.status === 'rejected').length,
        }));

        const categoryCounts: { [key: string]: number } = {};
        records.forEach((r) => {
          categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
        });
        setCategoryStats(
          Object.entries(categoryCounts).map(([category, count]) => ({ category, count }))
        );
      }

      if (activityRes.data) {
        setRecentActivity(activityRes.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Pagination calculation for recent activity
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivity = recentActivity.slice(startIndex, endIndex);
  const totalPages = Math.ceil(recentActivity.length / itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and real-time analytics"
      />

      {/* Pending Applicants Section - HIGH PRIORITY */}
      <AdminPendingApplicants />

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconColor="from-blue-500 to-indigo-600"
          description={`${stats.applicants} applicants Â· ${stats.supervisors} supervisors Â· ${stats.evaluators} evaluators`}
        />
        <StatCard
          label="Total Submissions"
          value={stats.totalSubmissions}
          icon={FileText}
          iconColor="from-emerald-500 to-teal-600"
          description="All categories combined"
        />
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={Activity}
          iconColor="from-amber-500 to-orange-600"
          description="Awaiting approval"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={TrendingUp}
          iconColor="from-green-500 to-emerald-600"
          description="Ready for filing"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Submissions by Category">
          <div className="space-y-4">
            {categoryStats.map(({ category, count }) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                  <span className="text-sm font-semibold text-blue-600">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    style={{ width: `${stats.totalSubmissions ? (count / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {categoryStats.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No submissions yet</p>
            )}
          </div>
        </DashboardCard>

        <DashboardCard title="Status Distribution">
          <div className="space-y-4">
            {[
              { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-yellow-600', textColor: 'text-amber-600', bg: 'bg-amber-100' },
              { label: 'Approved', value: stats.approved, color: 'from-green-500 to-emerald-600', textColor: 'text-green-600', bg: 'bg-green-100' },
              { label: 'Rejected', value: stats.rejected, color: 'from-red-500 to-pink-600', textColor: 'text-red-600', bg: 'bg-red-100' },
            ].map(({ label, value, color, textColor, bg }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${textColor} ${bg}`}>{value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${color}`}
                    style={{ width: `${stats.totalSubmissions ? (value / stats.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Recent Activity */}
      <DashboardCard title="Recent Activity" noPadding>
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Activity className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl mt-0.5">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold text-blue-600">{activity.user?.full_name || 'System'}</span>{' '}
                    <span className="text-gray-600">{formatAction(activity.action)}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(activity.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(count) => { setItemsPerPage(count); setCurrentPage(1); }}
            totalItems={recentActivity.length}
          />
        )}
      </DashboardCard>
    </div>
  );
}
