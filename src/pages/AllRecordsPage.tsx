import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Eye, Download, Plus } from 'lucide-react';
import { LegacyRecordBadge } from '../components/LegacyRecordBadge';
import { AddLegacyRecordModal } from '../components/AddLegacyRecordModal';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type IpStatus = Database['public']['Tables']['ip_records']['Row']['status'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  waiting_supervisor: 'bg-yellow-100 text-yellow-800',
  supervisor_revision: 'bg-orange-100 text-orange-800',
  supervisor_approved: 'bg-green-100 text-green-800',
  waiting_evaluation: 'bg-purple-100 text-purple-800',
  evaluator_revision: 'bg-orange-100 text-orange-800',
  evaluator_approved: 'bg-green-100 text-green-800',
  preparing_legal: 'bg-indigo-100 text-indigo-800',
  ready_for_filing: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
};

export function AllRecordsPage() {
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [workflowRecords, setWorkflowRecords] = useState<IpRecord[]>([]);
  const [legacyRecords, setLegacyRecords] = useState<IpRecord[]>([]);
  const [filteredWorkflowRecords, setFilteredWorkflowRecords] = useState<IpRecord[]>([]);
  const [filteredLegacyRecords, setFilteredLegacyRecords] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLegacyModal, setShowAddLegacyModal] = useState(false);
  
  // Workflow filters
  const [workflowSearchTerm, setWorkflowSearchTerm] = useState('');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<IpStatus | 'all'>('all');
  const [workflowCategoryFilter, setWorkflowCategoryFilter] = useState<IpCategory | 'all'>('all');

  // Legacy filters
  const [legacySearchTerm, setLegacySearchTerm] = useState('');
  const [legacyCategoryFilter, setLegacyCategoryFilter] = useState<IpCategory | 'all'>('all');
  const [legacySourceFilter, setLegacySourceFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterWorkflowRecords();
  }, [workflowRecords, workflowSearchTerm, workflowStatusFilter, workflowCategoryFilter]);

  useEffect(() => {
    filterLegacyRecords();
  }, [legacyRecords, legacySearchTerm, legacyCategoryFilter, legacySourceFilter]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allRecords = data || [];
      setRecords(allRecords);
      setWorkflowRecords(allRecords.filter((r: any) => r.is_legacy_record === false));
      setLegacyRecords(allRecords.filter((r: any) => r.is_legacy_record === true));
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterWorkflowRecords = () => {
    let filtered = workflowRecords;

    if (workflowSearchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(workflowSearchTerm.toLowerCase()) ||
          record.applicant?.full_name.toLowerCase().includes(workflowSearchTerm.toLowerCase())
      );
    }

    if (workflowStatusFilter !== 'all') {
      filtered = filtered.filter((record) => record.status === workflowStatusFilter);
    }

    if (workflowCategoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === workflowCategoryFilter);
    }

    setFilteredWorkflowRecords(filtered);
  };

  const filterLegacyRecords = () => {
    let filtered = legacyRecords;

    if (legacySearchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(legacySearchTerm.toLowerCase()) ||
          (record.details?.inventors?.some((inv: any) => 
            inv.name.toLowerCase().includes(legacySearchTerm.toLowerCase())
          ) || false)
      );
    }

    if (legacyCategoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === legacyCategoryFilter);
    }

    if (legacySourceFilter !== 'all') {
      filtered = filtered.filter((record) => record.legacy_source === legacySourceFilter);
    }

    setFilteredLegacyRecords(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Applicant', 'Category', 'Status', 'Supervisor', 'Evaluator', 'Created'];
    const rows = filteredWorkflowRecords.map((record) => [
      record.title,
      record.applicant?.full_name || '',
      record.category,
      record.status,
      record.supervisor?.full_name || 'Not assigned',
      record.evaluator?.full_name || 'Not assigned',
      new Date(record.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-workflow-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportLegacyToCSV = () => {
    const headers = ['Title', 'Category', 'Inventors', 'Original Filing Date', 'IPOPHIL No.', 'Source', 'Digitized'];
    const rows = filteredLegacyRecords.map((record) => [
      record.title,
      record.category,
      record.details?.inventors?.map((i: any) => i.name).join(', ') || '',
      record.details?.originalFilingDate || '',
      record.details?.ipophilApplicationNo || '',
      record.legacy_source || '',
      new Date(record.digitized_at || '').toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip-legacy-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AddLegacyRecordModal
        isOpen={showAddLegacyModal}
        onClose={() => setShowAddLegacyModal(false)}
        onSuccess={() => {
          fetchRecords();
          setShowAddLegacyModal(false);
        }}
      />

      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All IP Records</h1>
          <p className="text-gray-600 mt-1">
            Workflow: {filteredWorkflowRecords.length} of {workflowRecords.length} | Legacy: {filteredLegacyRecords.length} of {legacyRecords.length}
          </p>
        </div>
      </div>

      {/* SECTION A: WORKFLOW IP RECORDS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Workflow IP Records</h2>
          <p className="text-sm text-gray-600">
            Applicant-submitted IP records with workflow status tracking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={workflowSearchTerm}
              onChange={(e) => setWorkflowSearchTerm(e.target.value)}
              placeholder="Search by title or applicant..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={workflowStatusFilter}
              onChange={(e) => setWorkflowStatusFilter(e.target.value as IpStatus | 'all')}
              aria-label="Filter by workflow status"
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="waiting_supervisor">Waiting Supervisor</option>
              <option value="supervisor_approved">Supervisor Approved</option>
              <option value="waiting_evaluation">Waiting Evaluation</option>
              <option value="evaluator_approved">Evaluator Approved</option>
              <option value="ready_for_filing">Ready for Filing</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={workflowCategoryFilter}
              onChange={(e) => setWorkflowCategoryFilter(e.target.value as IpCategory | 'all')}
              aria-label="Filter by category"
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Categories</option>
              <option value="patent">Patent</option>
              <option value="copyright">Copyright</option>
              <option value="trademark">Trademark</option>
              <option value="design">Industrial Design</option>
              <option value="utility_model">Utility Model</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supervisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evaluator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkflowRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No workflow records found</p>
                  </td>
                </tr>
              ) : (
                filteredWorkflowRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{record.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{record.applicant?.full_name}</div>
                      <div className="text-xs text-gray-500">{record.applicant?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{record.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[record.status]
                        }`}
                      >
                        {formatStatus(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.supervisor?.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.evaluator?.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/dashboard/submissions/${record.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION B: LEGACY / HISTORICAL IP RECORDS */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
        {/* Disclaimer */}
        <div className="mb-6 bg-amber-100 border border-amber-300 rounded-lg p-4 flex gap-3">
          <div className="text-2xl">📋</div>
          <div>
            <p className="text-sm text-amber-900 font-medium">Legacy Records Information</p>
            <p className="text-sm text-amber-800 mt-1">
              Legacy records are historical IP submissions digitized for record-keeping purposes only. These records do not follow the standard workflow process.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Legacy / Historical IP Records</h2>
            <p className="text-sm text-gray-600">
              Manually digitized historical IP submissions from archives, emails, and legacy systems
            </p>
          </div>
          <button
            onClick={() => setShowAddLegacyModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
          >
            <Plus className="h-5 w-5" />
            + Add Legacy Record
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={legacySearchTerm}
              onChange={(e) => setLegacySearchTerm(e.target.value)}
              placeholder="Search by title or inventor..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={legacyCategoryFilter}
              onChange={(e) => setLegacyCategoryFilter(e.target.value as IpCategory | 'all')}
              aria-label="Filter legacy records by category"
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Categories</option>
              <option value="patent">Patent</option>
              <option value="copyright">Copyright</option>
              <option value="trademark">Trademark</option>
              <option value="design">Industrial Design</option>
              <option value="utility_model">Utility Model</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={legacySourceFilter}
              onChange={(e) => setLegacySourceFilter(e.target.value as string | 'all')}
              aria-label="Filter legacy records by source"
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Sources</option>
              <option value="Physical Archive">Physical Archive</option>
              <option value="Email">Email</option>
              <option value="Old System">Old System</option>
              <option value="Database Migration">Database Migration</option>
              <option value="Manual Entry">Manual Entry</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={exportLegacyToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-amber-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Inventor / Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Original Filing Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  IPOPHIL Application No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-amber-200">
              {filteredLegacyRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No legacy records found</p>
                  </td>
                </tr>
              ) : (
                filteredLegacyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-amber-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <LegacyRecordBadge source={record.legacy_source || undefined} />
                      </div>
                      <div className="text-sm font-medium text-gray-900 mt-2">{record.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {record.details?.inventors?.map((i: any) => i.name).join(', ') || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{record.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {record.details?.originalFilingDate ? formatDate(record.details.originalFilingDate) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {record.details?.ipophilApplicationNo || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.legacy_source || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/dashboard/submissions/${record.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
