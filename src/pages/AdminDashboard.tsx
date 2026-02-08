import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Users, FileText, TrendingUp, Activity } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type IpRecord = Database['public']['Tables']['ip_records']['Row'];

export function AdminDashboard() {
  const { primaryColor } = useBranding();
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-3">Admin Dashboard</h1>
        <p className="text-lg text-gray-600 font-medium">System overview and real-time analytics</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`, borderColor: `${primaryColor}40` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}, #6366f1)` }}>
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}>Active</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Users</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{stats.totalUsers}</p>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            {stats.applicants} applicants, {stats.supervisors} supervisors, {stats.evaluators} evaluators
          </p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: `linear-gradient(135deg, #10b98108, #34d39908)`, borderColor: '#10b98140' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#10b981', backgroundColor: '#10b98120' }}>Submitted</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Submissions</p>
          <p className="text-4xl font-black text-gray-900 mt-2">{stats.totalSubmissions}</p>
          <p className="text-xs text-gray-500 mt-2">All categories combined</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f5991808, #d97706108)', borderColor: '#f5991840' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #f59918, #d97706)' }}>
              <Activity className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#f59918', backgroundColor: '#f5991820' }}>In Review</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Pending Review</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#f59918' }}>{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-2">Awaiting approval</p>
        </div>

        <div className="group p-6 rounded-2xl border shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #22c55e08, #16a34a08)', borderColor: '#22c55e40' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl group-hover:shadow-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color: '#22c55e', backgroundColor: '#22c55e20' }}>Approved</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Approved</p>
          <p className="text-4xl font-black mt-2" style={{ color: '#22c55e' }}>{stats.approved}</p>
          <p className="text-xs text-gray-500 mt-2">Ready for filing</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border shadow-lg p-6 hover:shadow-xl transition-shadow duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`, borderColor: `${primaryColor}40` }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Submissions by Category</h2>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
          </div>
          <div className="space-y-5">
            {categoryStats.map(({ category, count }) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700 capitalize">{category}</span>
                  <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ color: primaryColor, backgroundColor: `${primaryColor}20` }}>{count}</span>
                </div>
                <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                  <div
                    className="h-2.5 rounded-full shadow-md"
                    style={{
                      width: `${(count / stats.totalSubmissions) * 100}%`,
                      background: `linear-gradient(to right, ${primaryColor}, #6366f1)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl border border-indigo-200/40 shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Status Distribution</h2>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          </div>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Pending</span>
                <span className="text-sm font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">{stats.pending}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 shadow-md"
                  style={{
                    width: `${(stats.pending / stats.totalSubmissions) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Approved</span>
                <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">{stats.approved}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-md"
                  style={{
                    width: `${(stats.approved / stats.totalSubmissions) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700">Rejected</span>
                <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">{stats.rejected}</span>
              </div>
              <div className="w-full bg-gradient-to-r from-gray-200/50 to-gray-200 rounded-full h-2.5 overflow-hidden shadow-sm">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-red-500 to-pink-600 shadow-md"
                  style={{
                    width: `${(stats.rejected / stats.totalSubmissions) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300" style={{ background: `linear-gradient(135deg, ${primaryColor}08, #9333ea08)`, borderColor: `${primaryColor}40` }}>
        <div className="p-6 border-b" style={{ borderBottomColor: `${primaryColor}40`, background: `linear-gradient(to right, ${primaryColor}08, #9333ea08)` }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
            {recentActivity.length > 0 && <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>}
          </div>
        </div>
        <div style={{ borderColor: `${primaryColor}30` }} className="divide-y">
          {recentActivity.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No recent activity</p>
            </div>
          ) : (
            paginatedActivity.map((activity) => (
              <div key={activity.id} className="p-5 hover:transition-colors duration-200 group" style={{ _hover: { background: `linear-gradient(to right, ${primaryColor}08, #9333ea08)` } }}>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl group-hover:shadow-lg transition-all duration-300">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 font-medium">
                      <span className="text-blue-600 font-bold">
                        {activity.user?.full_name || 'System'}
                      </span>{' '}
                      <span className="text-gray-700">{formatAction(activity.action)}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(count) => {
              setItemsPerPage(count);
              setCurrentPage(1);
            }}
            totalItems={recentActivity.length}
          />
        )}
      </div>
    </div>
  );
}
