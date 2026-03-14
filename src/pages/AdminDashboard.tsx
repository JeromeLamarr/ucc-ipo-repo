import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useBranding } from '../hooks/useBranding';
import { Users, FileText, TrendingUp, Activity, BarChart2, Filter } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { AdminPendingApplicants } from '../components/AdminPendingApplicants';
import type { Database } from '../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type IpRecord = Database['public']['Tables']['ip_records']['Row'];

interface VizRecord {
  status: string;
  category: string;
  created_at: string;
  department: string;
}

const VIZ_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'waiting_supervisor', label: 'Waiting Supervisor' },
  { value: 'supervisor_revision', label: 'Supervisor Revision' },
  { value: 'supervisor_approved', label: 'Supervisor Approved' },
  { value: 'waiting_evaluation', label: 'Waiting Evaluation' },
  { value: 'evaluator_revision', label: 'Evaluator Revision' },
  { value: 'evaluator_approved', label: 'Evaluator Approved' },
  { value: 'preparing_legal', label: 'Preparing Legal' },
  { value: 'ready_for_filing', label: 'Ready for Filing' },
  { value: 'rejected', label: 'Rejected' },
];

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
  const [allVizRecords, setAllVizRecords] = useState<VizRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Data Visualization Panel filter state
  const [vizFromDate, setVizFromDate] = useState('');
  const [vizToDate, setVizToDate] = useState('');
  const [vizStatus, setVizStatus] = useState('');
  const [vizCategory, setVizCategory] = useState('');
  const [vizDepartment, setVizDepartment] = useState('');

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
        supabase.from('ip_records').select('status, category, created_at, applicant_id'),
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

      // Dept user lookup + viz records: fetch with id to enable record→dept join
      const { data: deptRaw } = await supabase.from('users').select('id, affiliation, role');
      if (deptRaw) {
        type UserRaw = { id: string; affiliation: string | null; role: string };
        const allUsers = deptRaw as unknown as UserRaw[];

        // user-id → department lookup (used to annotate viz records)
        const userDeptMap: Record<string, string> = {};
        allUsers.forEach((u) => {
          userDeptMap[u.id] = u.affiliation?.trim() || 'Unaffiliated';
        });

        // Build allVizRecords annotated with department
        if (recordsRes.data) {
          type RecRaw = { status: string; category: string; created_at: string; applicant_id: string };
          const rawRecs = recordsRes.data as unknown as RecRaw[];
          setAllVizRecords(
            rawRecs.map((r) => ({
              status: r.status,
              category: r.category,
              created_at: r.created_at,
              department: userDeptMap[r.applicant_id] || 'Unaffiliated',
            }))
          );
        }
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

  // --- Data Visualization Panel: filter logic + reactive chart values ---
  const dateInvalid = !!(vizFromDate && vizToDate && vizFromDate > vizToDate);
  const hasActiveVizFilters = !!(vizFromDate || vizToDate || vizStatus || vizCategory || vizDepartment);

  const filteredVizRecords: VizRecord[] = dateInvalid
    ? allVizRecords
    : allVizRecords.filter((r) => {
        const recDate = r.created_at.substring(0, 10);
        if (vizFromDate && recDate < vizFromDate) return false;
        if (vizToDate && recDate > vizToDate) return false;
        if (vizStatus && r.status !== vizStatus) return false;
        if (vizCategory && r.category !== vizCategory) return false;
        if (vizDepartment && r.department !== vizDepartment) return false;
        return true;
      });

  // Filtered status counts
  const fPending = filteredVizRecords.filter((r) =>
    ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
  ).length;
  const fApproved = filteredVizRecords.filter((r) =>
    ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
  ).length;
  const fRejected = filteredVizRecords.filter((r) => r.status === 'rejected').length;
  const fTotal = fPending + fApproved + fRejected;

  // Filtered category stats
  const fCatMap: Record<string, number> = {};
  filteredVizRecords.forEach((r) => { fCatMap[r.category] = (fCatMap[r.category] || 0) + 1; });
  const fCategoryStats = Object.entries(fCatMap).map(([category, count]) => ({ category, count }));
  const fCatTotal = fCategoryStats.reduce((s, c) => s + c.count, 0);

  // Filtered department stats
  const fDeptMap: Record<string, number> = {};
  filteredVizRecords.forEach((r) => { fDeptMap[r.department] = (fDeptMap[r.department] || 0) + 1; });
  const fDeptStats = Object.entries(fDeptMap)
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Dropdown options derived from ALL (unfiltered) records
  const allVizCategories = [...new Set(allVizRecords.map((r) => r.category))].sort();
  const allVizDepartments = [...new Set(allVizRecords.map((r) => r.department))].sort();

  // Conic gradient helpers
  const catPieColors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f472b6'];
  const vizStatusSegments = [
    { label: 'Pending', value: fPending, color: '#f59e0b' },
    { label: 'Approved', value: fApproved, color: '#22c55e' },
    { label: 'Rejected', value: fRejected, color: '#ef4444' },
  ];
  const statusDonutGradient = (() => {
    if (fTotal === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let deg = 0;
    const parts = vizStatusSegments.map((s) => {
      const span = (s.value / fTotal) * 360;
      const part = `${s.color} ${deg}deg ${deg + span}deg`;
      deg += span;
      return part;
    });
    return `conic-gradient(${parts.join(', ')})`;
  })();
  const categoryPieGradient = (() => {
    if (fCategoryStats.length === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    if (fCatTotal === 0) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let deg = 0;
    const parts = fCategoryStats.map((cat, i) => {
      const span = (cat.count / fCatTotal) * 360;
      const color = catPieColors[i % catPieColors.length];
      const part = `${color} ${deg}deg ${deg + span}deg`;
      deg += span;
      return part;
    });
    return `conic-gradient(${parts.join(', ')})`;
  })();

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

      {/* Pending Applicants Section - HIGH PRIORITY */}
      <AdminPendingApplicants />

      {/* Data Visualization Panel */}
      <div
        className="rounded-2xl border shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}08, #6366f108)`,
          borderColor: `${primaryColor}40`,
        }}
      >
        {/* Panel Header */}
        <div
          className="p-6 border-b"
          style={{
            borderBottomColor: `${primaryColor}40`,
            background: `linear-gradient(to right, ${primaryColor}08, #6366f108)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Data Visualization Panel</h2>
              <p className="text-sm text-gray-600 mt-1">Overview of records and user-managed data</p>
            </div>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-4 border-b bg-white/40" style={{ borderBottomColor: `${primaryColor}20` }}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">From</label>
              <input
                type="date"
                value={vizFromDate}
                onChange={(e) => setVizFromDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">To</label>
              <input
                type="date"
                value={vizToDate}
                onChange={(e) => setVizToDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <select
                value={vizStatus}
                onChange={(e) => setVizStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Statuses</option>
                {VIZ_STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Category</label>
              <select
                value={vizCategory}
                onChange={(e) => setVizCategory(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Categories</option>
                {allVizCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Department</label>
              <select
                value={vizDepartment}
                onChange={(e) => setVizDepartment(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">All Departments</option>
                {allVizDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            {hasActiveVizFilters && (
              <button
                onClick={() => {
                  setVizFromDate('');
                  setVizToDate('');
                  setVizStatus('');
                  setVizCategory('');
                  setVizDepartment('');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors self-end"
              >
                <Filter className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            )}
          </div>
          {dateInvalid && (
            <p className="text-xs text-red-500 mt-2 font-medium">
              "From" date cannot be later than "To" date — showing all data until corrected.
            </p>
          )}
        </div>

        {/* Charts Body */}
        <div className="p-6">
          {allVizRecords.length === 0 ? (
            <div className="text-center py-16">
              <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Not enough data to visualize yet.</p>
            </div>
          ) : filteredVizRecords.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No records found for the selected filters.</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting or resetting the filters above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Status Distribution Donut */}
              <div
                className="bg-white/60 rounded-xl p-5 border"
                style={{ borderColor: `${primaryColor}20` }}
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Submission Status</h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
                    <div
                      className="w-full h-full rounded-full"
                      style={{ background: statusDonutGradient }}
                    />
                    <div
                      className="absolute rounded-full bg-white flex flex-col items-center justify-center"
                      style={{ top: '25%', left: '25%', width: '50%', height: '50%' }}
                    >
                      <span className="text-base font-black text-gray-900">{fTotal}</span>
                      <span className="text-xs text-gray-400">Total</span>
                    </div>
                  </div>
                  <div className="space-y-2 w-full">
                    {vizStatusSegments.map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-gray-600 font-medium">{label}</span>
                        </div>
                        <span className="font-bold text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Records by Category Pie */}
              <div
                className="bg-white/60 rounded-xl p-5 border"
                style={{ borderColor: `${primaryColor}20` }}
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Records by Category</h3>
                {fCategoryStats.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Not enough data to visualize yet.</p>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
                      <div
                        className="w-full h-full rounded-full"
                        style={{ background: categoryPieGradient }}
                      />
                      <div
                        className="absolute rounded-full bg-white flex flex-col items-center justify-center"
                        style={{ top: '25%', left: '25%', width: '50%', height: '50%' }}
                      >
                        <span className="text-base font-black text-gray-900">{fCatTotal}</span>
                        <span className="text-xs text-gray-400">Records</span>
                      </div>
                    </div>
                    <div className="space-y-2 w-full">
                      {fCategoryStats.map((cat, i) => (
                        <div key={cat.category} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: catPieColors[i % catPieColors.length] }}
                            />
                            <span className="text-gray-600 font-medium capitalize">{cat.category}</span>
                          </div>
                          <span className="font-bold text-gray-800">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Records by Department Bar Chart */}
              <div
                className="bg-white/60 rounded-xl p-5 border"
                style={{ borderColor: `${primaryColor}20` }}
              >
                <h3 className="text-sm font-bold text-gray-800 mb-4">Records by Department</h3>
                {fDeptStats.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Not enough data to visualize yet.</p>
                ) : (
                  <div className="space-y-3">
                    {fDeptStats.map(({ department, count }) => {
                      const maxCount = fDeptStats[0].count;
                      return (
                        <div key={department}>
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className="text-xs text-gray-600 font-medium truncate max-w-[70%]"
                              title={department}
                            >
                              {department}
                            </span>
                            <span className="text-xs font-bold text-gray-800">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${(count / maxCount) * 100}%`,
                                background: `linear-gradient(to right, ${primaryColor}, #6366f1)`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
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
