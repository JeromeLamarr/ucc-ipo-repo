import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
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

export function DeletedArchivePage() {
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [deletedDrafts, setDeletedDrafts] = useState<IpRecord[]>([]);
  const [deletedWorkflow, setDeletedWorkflow] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'restore' | 'delete_forever';
    id: string;
    title: string;
  } | null>(null);

  // Pagination states for deleted drafts
  const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
  const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

  // Pagination states for deleted workflow records
  const [workflowCurrentPage, setWorkflowCurrentPage] = useState(1);
  const [workflowItemsPerPage, setWorkflowItemsPerPage] = useState(10);

  useEffect(() => {
    fetchDeletedRecords();
  }, []);

  const fetchDeletedRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      const allDeletedRecords = data || [];
      
      // Separate deleted drafts from deleted workflow records
      const drafts = allDeletedRecords.filter((record) => record.status === 'draft');
      const workflow = allDeletedRecords.filter((record) => record.status !== 'draft');
      
      setRecords(allDeletedRecords);
      setDeletedDrafts(drafts);
      setDeletedWorkflow(workflow);
    } catch (error) {
      console.error('Error fetching deleted records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('ip_records')
        .update({
          is_deleted: false,
          deleted_at: null,
        })
        .eq('id', recordId);

      if (error) throw error;

      await fetchDeletedRecords();
      setConfirmAction(null);
    } catch (error) {
      console.error('Error restoring record:', error);
      alert('Failed to restore record. Please try again.');
    }
  };

  const handleDeleteForever = async (recordId: string) => {
    try {
      // First, delete all associated documents
      await supabase
        .from('ip_documents')
        .delete()
        .eq('ip_record_id', recordId);

      // Then delete the record
      const { error } = await supabase
        .from('ip_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      await fetchDeletedRecords();
      setConfirmAction(null);
    } catch (error) {
      console.error('Error permanently deleting record:', error);
      alert('Failed to permanently delete record. Please try again.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter deleted drafts by search term
  const filteredDeletedDrafts = deletedDrafts.filter((record) =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter deleted workflow records by search term
  const filteredDeletedWorkflow = deletedWorkflow.filter((record) =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.applicant?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate paginated deleted drafts
  const draftsStartIndex = (draftsCurrentPage - 1) * draftsItemsPerPage;
  const draftsEndIndex = draftsStartIndex + draftsItemsPerPage;
  const paginatedDeletedDrafts = filteredDeletedDrafts.slice(draftsStartIndex, draftsEndIndex);
  const draftsTotalPages = Math.ceil(filteredDeletedDrafts.length / draftsItemsPerPage);

  // Calculate paginated deleted workflow records
  const workflowStartIndex = (workflowCurrentPage - 1) * workflowItemsPerPage;
  const workflowEndIndex = workflowStartIndex + workflowItemsPerPage;
  const paginatedDeletedWorkflow = filteredDeletedWorkflow.slice(workflowStartIndex, workflowEndIndex);
  const workflowTotalPages = Math.ceil(filteredDeletedWorkflow.length / workflowItemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Deleted Archive</h1>
        <p className="text-gray-600 mt-1">
          Manage deleted records. Restore records or permanently delete them.
        </p>
      </div>

      {/* Search Bar */}
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

      {/* Warning Message */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-900">
          <strong>Warning:</strong> Records deleted with the "Delete Forever" option cannot be recovered.
        </div>
      </div>

      {/* DELETED DRAFT SUBMISSIONS SECTION */}
      {filteredDeletedDrafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Deleted Drafts ({filteredDeletedDrafts.length})</h2>
            <p className="text-gray-600 text-sm mt-1">Deleted draft submissions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50">
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
                    Deleted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDeletedDrafts.map((record) => (
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
                      {record.deleted_at ? formatDate(record.deleted_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setConfirmAction({ type: 'restore', id: record.id, title: record.title })
                          }
                          className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'delete_forever',
                              id: record.id,
                              title: record.title,
                            })
                          }
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Forever
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
              totalItems={filteredDeletedDrafts.length}
            />
          )}
        </div>
      )}

      {/* DELETED WORKFLOW IP RECORDS SECTION */}
      {filteredDeletedWorkflow.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Deleted Workflow Records ({filteredDeletedWorkflow.length})
            </h2>
            <p className="text-gray-600 text-sm mt-1">Deleted IP submissions in the evaluation workflow</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-50">
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
                    Deleted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDeletedWorkflow.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No deleted workflow records found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedDeletedWorkflow.map((record) => (
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
                            getStatusColor(record.status as IpStatus)
                          }`}
                        >
                          {getStatusLabel(record.status as IpStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.supervisor?.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.evaluator?.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.deleted_at ? formatDate(record.deleted_at) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setConfirmAction({ type: 'restore', id: record.id, title: record.title })
                            }
                            className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                type: 'delete_forever',
                                id: record.id,
                                title: record.title,
                              })
                            }
                            className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Forever
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
              totalItems={filteredDeletedWorkflow.length}
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {deletedDrafts.length === 0 && deletedWorkflow.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Deleted Records</h3>
          <p className="text-gray-600">All your records are active. Deleted records will appear here.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {confirmAction.type === 'restore' ? 'Restore Record' : 'Delete Forever'}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction.type === 'restore'
                ? `Are you sure you want to restore "${confirmAction.title}"? It will be moved back to the active records.`
                : `Are you sure you want to permanently delete "${confirmAction.title}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'restore') {
                    handleRestoreRecord(confirmAction.id);
                  } else {
                    handleDeleteForever(confirmAction.id);
                  }
                }}
                className={`px-4 py-2 text-white rounded-lg font-medium ${
                  confirmAction.type === 'restore'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.type === 'restore' ? 'Restore' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
