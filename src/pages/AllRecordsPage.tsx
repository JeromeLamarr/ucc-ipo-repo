import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Eye, Download, Plus, Award } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import { AddLegacyRecordModal } from '../components/AddLegacyRecordModal';
import { LegacyRecordBadge } from '../components/LegacyRecordBadge';
import { LegacyRecordDetailModal } from '../components/LegacyRecordDetailModal';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type IpStatus = Database['public']['Tables']['ip_records']['Row']['status'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function AllRecordsPage() {
  const [allRecords, setAllRecords] = useState<IpRecord[]>([]);
  const [workflowRecords, setWorkflowRecords] = useState<IpRecord[]>([]);
  const [legacyRecords, setLegacyRecords] = useState<IpRecord[]>([]);
  const [filteredWorkflowRecords, setFilteredWorkflowRecords] = useState<IpRecord[]>([]);
  const [filteredLegacyRecords, setFilteredLegacyRecords] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Workflow filters
  const [workflowSearchTerm, setWorkflowSearchTerm] = useState('');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState<IpStatus | 'all'>('all');
  const [workflowCategoryFilter, setWorkflowCategoryFilter] = useState<IpCategory | 'all'>('all');
  
  // Legacy filters
  const [legacySearchTerm, setLegacySearchTerm] = useState('');
  const [legacyCategoryFilter, setLegacyCategoryFilter] = useState<IpCategory | 'all'>('all');
  const [legacySourceFilter, setLegacySourceFilter] = useState<string>('all');
  
  // Modal state
  const [showAddLegacyModal, setShowAddLegacyModal] = useState(false);
  const [selectedLegacyRecord, setSelectedLegacyRecord] = useState<any>(null);

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
      // Fetch workflow records from ip_records
      const { data: workflowData, error: workflowError } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .order('created_at', { ascending: false });

      if (workflowError) throw workflowError;

      // Fetch legacy records from legacy_ip_records
      const { data: legacyData, error: legacyError } = await supabase
        .from('legacy_ip_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (legacyError) throw legacyError;

      const workflow = workflowData || [];
      const legacy = legacyData || [];
      
      setAllRecords([...workflow, ...legacy]);
      setWorkflowRecords(workflow);
      setLegacyRecords(legacy);
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
    const headers = ['Title', 'Inventor/Author', 'Category', 'Filing Date', 'Application No.', 'Source', 'Digitized'];
    const rows = filteredLegacyRecords.map((record) => [
      record.title,
      record.details?.inventors?.map((inv: any) => inv.name).join('; ') || '',
      record.category,
      record.details?.originalFilingDate || '',
      record.details?.ipophilApplicationNo || '',
      record.legacy_source || '',
      new Date(record.digitized_at || record.created_at).toLocaleDateString(),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All IP Records</h1>
          <p className="text-gray-600 mt-1">
            Viewing {filteredWorkflowRecords.length + filteredLegacyRecords.length} of {allRecords.length} submissions
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* SECTION A: WORKFLOW IP RECORDS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Workflow IP Records</h2>
          <p className="text-gray-600 text-sm mt-1">Active submissions in the evaluation workflow</p>
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
                          getStatusColor(record.status)
                        }`}
                      >
                        {getStatusLabel(record.status)}
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
        <div className="mb-6 p-4 bg-amber-100 border border-amber-300 rounded-lg">
          <p className="text-sm text-amber-900">
            📋 <strong>Legacy Records:</strong> Legacy records are historical IP submissions digitized for record-keeping purposes only. 
            They do not undergo the standard evaluation workflow and are marked as completed upon entry.
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Legacy / Historical IP Records</h2>
            <p className="text-gray-600 text-sm mt-1">Digitized historical IP submissions for archival purposes</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={legacyCategoryFilter}
              onChange={(e) => setLegacyCategoryFilter(e.target.value as IpCategory | 'all')}
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

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={legacySourceFilter}
              onChange={(e) => setLegacySourceFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
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
                  Filing Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                  Application No.
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
                        <div className="text-sm font-medium text-gray-900">{record.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {record.details?.inventors?.map((inv: any) => inv.name).join(', ') || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{record.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.details?.originalFilingDate || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.details?.ipophilApplicationNo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                        {record.legacy_source || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLegacyRecord(record)}
                        className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={exportLegacyToCSV}
            className="flex items-center gap-2 px-4 py-2 text-amber-600 hover:text-amber-700 font-medium ml-auto"
          >
            <Download className="h-4 w-4" />
            Export Legacy Records as CSV
          </button>
        </div>
      </div>

      {/* Modal for adding legacy record */}
      <AddLegacyRecordModal
        isOpen={showAddLegacyModal}
        onClose={() => setShowAddLegacyModal(false)}
        onSuccess={() => {
          setShowAddLegacyModal(false);
          fetchRecords();
        }}
      />

      {/* Modal for viewing legacy record details */}
      <LegacyRecordDetailModal
        isOpen={!!selectedLegacyRecord}
        onClose={() => setSelectedLegacyRecord(null)}
        record={selectedLegacyRecord}
      />
    </div>
  );
}
