import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Eye, Download, Plus, Award, Trash2 } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type IpStatus = Database['public']['Tables']['ip_records']['Row']['status'];
type IpCategory = Database['public']['Tables']['ip_records']['Row']['category'];

export function AllRecordsPage() {
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<IpRecord[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<IpStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<IpCategory | 'all'>('all');

  // Pagination states for workflow records
  const [workflowCurrentPage, setWorkflowCurrentPage] = useState(1);
  const [workflowItemsPerPage, setWorkflowItemsPerPage] = useState(10);

  // Pagination states for drafts
  const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
  const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, categoryFilter]);

  const fetchRecords = async () => {
    try {
      // Fetch ALL records from ip_records (both drafts and submitted)
      // Only fetch non-deleted records
      const { data, error } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        throw error;
      }

      console.log('Fetched records:', data?.length || 0, 'records');
      console.log('Sample record:', data?.[0]);
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('ip_records')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) throw error;

      // Refresh records
      await fetchRecords();
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  const filterRecords = () => {
    console.log('Filtering records. Total records:', records.length);

    // Separate drafts from workflow records
    const drafts = records.filter((record) => record.status === 'draft');
    const submitted = records.filter((record) => record.status !== 'draft');

    console.log('Drafts:', drafts.length, 'Submitted:', submitted.length);

    // Apply filters only to submitted records (not to drafts)
    let filtered = submitted;

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((record) => record.category === categoryFilter);
    }

    console.log('Filtered workflow records:', filtered.length);
    console.log('Filtered drafts:', drafts.length);

    setFilteredRecords(filtered);
    setFilteredDrafts(drafts);
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Applicant', 'Category', 'Status', 'Supervisor', 'Evaluator', 'Created'];
    const rows = filteredRecords.map((record) => [
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate paginated workflow records
  const workflowStartIndex = (workflowCurrentPage - 1) * workflowItemsPerPage;
  const workflowEndIndex = workflowStartIndex + workflowItemsPerPage;
  const paginatedWorkflowRecords = filteredRecords.slice(workflowStartIndex, workflowEndIndex);
  const workflowTotalPages = Math.ceil(filteredRecords.length / workflowItemsPerPage);

  // Calculate paginated draft records
  const draftsStartIndex = (draftsCurrentPage - 1) * draftsItemsPerPage;
  const draftsEndIndex = draftsStartIndex + draftsItemsPerPage;
  const paginatedDrafts = filteredDrafts.slice(draftsStartIndex, draftsEndIndex);
  const draftsTotalPages = Math.ceil(filteredDrafts.length / draftsItemsPerPage);

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
            Viewing {filteredRecords.length} workflow records and {filteredDrafts.length} drafts
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

      {/* DRAFT SUBMISSIONS SECTION */}
      {filteredDrafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Draft Submissions ({filteredDrafts.length})</h2>
            <p className="text-gray-600 text-sm mt-1">Incomplete submissions waiting to be submitted to the workflow</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50">
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
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDrafts.map((record) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {draftsTotalPages > 1 && (
            <Pagination
              currentPage={draftsCurrentPage}
              totalPages={draftsTotalPages}
              onPageChange={setDraftsCurrentPage}
              itemsPerPage={draftsItemsPerPage}
              onItemsPerPageChange={(count) => {
                setDraftsItemsPerPage(count);
                setDraftsCurrentPage(1);
              }}
              totalItems={filteredDrafts.length}
            />
          )}
        </div>
      )}

      {/* WORKFLOW IP RECORDS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Workflow IP Records ({filteredRecords.length})</h2>
          <p className="text-gray-600 text-sm mt-1">Active submissions in the evaluation workflow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or applicant..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IpStatus | 'all')}
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as IpCategory | 'all')}
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No workflow records found</p>
                  </td>
                </tr>
              ) : (
                paginatedWorkflowRecords.map((record) => (
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
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmation({ id: record.id, title: record.title })}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {workflowTotalPages > 1 && (
          <Pagination
            currentPage={workflowCurrentPage}
            totalPages={workflowTotalPages}
            onPageChange={setWorkflowCurrentPage}
            itemsPerPage={workflowItemsPerPage}
            onItemsPerPageChange={(count) => {
              setWorkflowItemsPerPage(count);
              setWorkflowCurrentPage(1);
            }}
            totalItems={filteredRecords.length}
          />
        )}
      </div>

      {/* Information about Legacy Records */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p>
          <strong>Legacy IP Records:</strong> Historical IP submissions are now managed in a separate admin module. 
          Access them from the <strong>Legacy Records</strong> section in the sidebar.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the record "<strong>{deleteConfirmation.title}</strong>"? 
              It will be moved to the Deleted Archive and can be restored later.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(deleteConfirmation.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
