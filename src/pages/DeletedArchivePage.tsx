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

type DeletedLegacyRecord = Database['public']['Tables']['legacy_ip_records']['Row'];

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
    recordType?: 'legacy';
  } | null>(null);

  // Pagination states for deleted drafts
  const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
  const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

  // Pagination states for deleted workflow records
  const [workflowCurrentPage, setWorkflowCurrentPage] = useState(1);
  const [workflowItemsPerPage, setWorkflowItemsPerPage] = useState(10);

  // Deleted legacy records
  const [deletedLegacyRecords, setDeletedLegacyRecords] = useState<DeletedLegacyRecord[]>([]);
  const [legacyCurrentPage, setLegacyCurrentPage] = useState(1);
  const [legacyItemsPerPage, setLegacyItemsPerPage] = useState(10);

  // Row selection state
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [selectedDeletedWorkflowIds, setSelectedDeletedWorkflowIds] = useState<string[]>([]);
  const [selectedLegacyIds, setSelectedLegacyIds] = useState<string[]>([]);

  useEffect(() => {
    fetchDeletedRecords();
    fetchDeletedLegacyRecords();
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

  // ─── Legacy record archive helpers ────────────────────────────────────────

  const fetchDeletedLegacyRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('legacy_ip_records')
        .select('*')
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedLegacyRecords(data || []);
    } catch (error) {
      console.error('Error fetching deleted legacy records:', error);
    }
  };

  const handleRestoreLegacyRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('legacy_ip_records')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by_admin_id: null,
        })
        .eq('id', recordId);

      if (error) throw error;

      await fetchDeletedLegacyRecords();
      setConfirmAction(null);
    } catch (error) {
      console.error('Error restoring legacy record:', error);
      alert('Failed to restore legacy record. Please try again.');
    }
  };

  const handleDeleteLegacyForever = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('legacy_ip_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      await fetchDeletedLegacyRecords();
      setConfirmAction(null);
    } catch (error) {
      console.error('Error permanently deleting legacy record:', error);
      alert('Failed to permanently delete legacy record. Please try again.');
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

  const toggleDraftRow = (id: string) =>
    setSelectedDraftIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAllDrafts = () =>
    setSelectedDraftIds(selectedDraftIds.length === paginatedDeletedDrafts.length ? [] : paginatedDeletedDrafts.map(r => r.id));

  const toggleDeletedWorkflowRow = (id: string) =>
    setSelectedDeletedWorkflowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAllDeletedWorkflow = () =>
    setSelectedDeletedWorkflowIds(selectedDeletedWorkflowIds.length === paginatedDeletedWorkflow.length ? [] : paginatedDeletedWorkflow.map(r => r.id));

  // ─── Legacy records filter + pagination ───────────────────────────────────
  const filteredDeletedLegacy = deletedLegacyRecords.filter((record) =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const legacyStartIndex = (legacyCurrentPage - 1) * legacyItemsPerPage;
  const paginatedDeletedLegacy = filteredDeletedLegacy.slice(legacyStartIndex, legacyStartIndex + legacyItemsPerPage);
  const legacyTotalPages = Math.ceil(filteredDeletedLegacy.length / legacyItemsPerPage);

  const toggleLegacyRow = (id: string) =>
    setSelectedLegacyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAllLegacy = () =>
    setSelectedLegacyIds(selectedLegacyIds.length === paginatedDeletedLegacy.length ? [] : paginatedDeletedLegacy.map(r => r.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
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
          <strong>Warning:</strong> Records deleted with the "Delete Permanently" option cannot be recovered.
        </div>
      </div>

      {/* DELETED DRAFT SUBMISSIONS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Deleted Drafts ({filteredDeletedDrafts.length})</h2>
          <p className="text-gray-600 text-sm mt-1">Deleted draft submissions</p>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-red-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={paginatedDeletedDrafts.length > 0 && selectedDraftIds.length === paginatedDeletedDrafts.length}
                    onChange={toggleSelectAllDrafts}
                    aria-label="Select all deleted drafts"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deleted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDeletedDrafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No deleted drafts found</p>
                  </td>
                </tr>
              ) : (
                paginatedDeletedDrafts.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedDraftIds.includes(record.id)}
                        onChange={() => toggleDraftRow(record.id)}
                        aria-label={`Select draft ${record.title}`}
                      />
                    </td>
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
                          onClick={() => setConfirmAction({ type: 'restore', id: record.id, title: record.title })}
                          className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'delete_forever', id: record.id, title: record.title })}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-4">
          {paginatedDeletedDrafts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No deleted drafts found</p>
            </div>
          ) : (
            paginatedDeletedDrafts.map((record) => (
              <div key={record.id} className="bg-white rounded-xl border border-red-200 p-4 space-y-3">
                <div className="font-medium text-gray-900">{record.title}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">Applicant</div>
                    <div className="font-medium text-gray-900">{record.applicant?.full_name || '-'}</div>
                    <div className="text-xs text-gray-400">{record.applicant?.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Category</div>
                    <div className="font-medium text-gray-900 capitalize">{record.category}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Deleted</div>
                    <div className="font-medium text-gray-900">{record.deleted_at ? formatDate(record.deleted_at) : '-'}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmAction({ type: 'restore', id: record.id, title: record.title })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete_forever', id: record.id, title: record.title })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

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
      </div>

      {/* DELETED WORKFLOW IP RECORDS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Deleted Workflow Records ({filteredDeletedWorkflow.length})
          </h2>
          <p className="text-gray-600 text-sm mt-1">Deleted IP submissions in the evaluation workflow</p>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-red-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={paginatedDeletedWorkflow.length > 0 && selectedDeletedWorkflowIds.length === paginatedDeletedWorkflow.length}
                    onChange={toggleSelectAllDeletedWorkflow}
                    aria-label="Select all deleted workflow records"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deleted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDeletedWorkflow.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No deleted workflow records found</p>
                  </td>
                </tr>
              ) : (
                paginatedDeletedWorkflow.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedDeletedWorkflowIds.includes(record.id)}
                        onChange={() => toggleDeletedWorkflowRow(record.id)}
                        aria-label={`Select record ${record.title}`}
                      />
                    </td>
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
                          onClick={() => setConfirmAction({ type: 'restore', id: record.id, title: record.title })}
                          className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'delete_forever', id: record.id, title: record.title })}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-4">
          {paginatedDeletedWorkflow.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No deleted workflow records found</p>
            </div>
          ) : (
            paginatedDeletedWorkflow.map((record) => (
              <div key={record.id} className="bg-white rounded-xl border border-red-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-gray-900">{record.title}</div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full shrink-0 ${
                      getStatusColor(record.status as IpStatus)
                    }`}
                  >
                    {getStatusLabel(record.status as IpStatus)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">Applicant</div>
                    <div className="font-medium text-gray-900">{record.applicant?.full_name || '-'}</div>
                    <div className="text-xs text-gray-400">{record.applicant?.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Category</div>
                    <div className="font-medium text-gray-900 capitalize">{record.category}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Supervisor</div>
                    <div className="font-medium text-gray-900">{record.supervisor?.full_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Evaluator</div>
                    <div className="font-medium text-gray-900">{record.evaluator?.full_name || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-500">Deleted</div>
                    <div className="font-medium text-gray-900">{record.deleted_at ? formatDate(record.deleted_at) : '-'}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmAction({ type: 'restore', id: record.id, title: record.title })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete_forever', id: record.id, title: record.title })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

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
      </div>

      {/* DELETED LEGACY IP RECORDS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Deleted Legacy Records ({filteredDeletedLegacy.length})
          </h2>
          <p className="text-gray-600 text-sm mt-1">Archived historical IP records</p>
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-amber-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={paginatedDeletedLegacy.length > 0 && selectedLegacyIds.length === paginatedDeletedLegacy.length}
                    onChange={toggleSelectAllLegacy}
                    aria-label="Select all deleted legacy records"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPOPHIL No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deleted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDeletedLegacy.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No deleted legacy records found</p>
                  </td>
                </tr>
              ) : (
                paginatedDeletedLegacy.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedLegacyIds.includes(record.id)}
                        onChange={() => toggleLegacyRow(record.id)}
                        aria-label={`Select legacy record ${record.title}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{record.title}</div>
                      <div className="text-xs text-amber-600 font-medium">Legacy Record</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{record.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{record.legacy_source.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.ipophil_application_no || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.deleted_at ? formatDate(record.deleted_at) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setConfirmAction({ type: 'restore', id: record.id, title: record.title, recordType: 'legacy' })}
                          className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'delete_forever', id: record.id, title: record.title, recordType: 'legacy' })}
                          className="text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-4">
          {paginatedDeletedLegacy.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No deleted legacy records found</p>
            </div>
          ) : (
            paginatedDeletedLegacy.map((record) => (
              <div key={record.id} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
                <div className="font-medium text-gray-900">{record.title}</div>
                <div className="text-xs text-amber-600 font-medium">Legacy Record</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-gray-500">Category</div>
                    <div className="font-medium text-gray-900 capitalize">{record.category}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Source</div>
                    <div className="font-medium text-gray-900 capitalize">{record.legacy_source.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">IPOPHIL No.</div>
                    <div className="font-medium text-gray-900">{record.ipophil_application_no || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Deleted</div>
                    <div className="font-medium text-gray-900">{record.deleted_at ? formatDate(record.deleted_at) : '-'}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmAction({ type: 'restore', id: record.id, title: record.title, recordType: 'legacy' })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete_forever', id: record.id, title: record.title, recordType: 'legacy' })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          currentPage={legacyCurrentPage}
          totalPages={legacyTotalPages}
          onPageChange={setLegacyCurrentPage}
          itemsPerPage={legacyItemsPerPage}
          onItemsPerPageChange={(count) => {
            setLegacyItemsPerPage(count);
            setLegacyCurrentPage(1);
          }}
          totalItems={filteredDeletedLegacy.length}
        />
      </div>

      {/* Global Empty State — only when nothing exists at all */}
      {deletedDrafts.length === 0 && deletedWorkflow.length === 0 && deletedLegacyRecords.length === 0 && (
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
              {confirmAction.type === 'restore' ? 'Restore Record' : 'Delete Permanently'}
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
                  if (confirmAction.recordType === 'legacy') {
                    if (confirmAction.type === 'restore') {
                      handleRestoreLegacyRecord(confirmAction.id);
                    } else {
                      handleDeleteLegacyForever(confirmAction.id);
                    }
                  } else {
                    if (confirmAction.type === 'restore') {
                      handleRestoreRecord(confirmAction.id);
                    } else {
                      handleDeleteForever(confirmAction.id);
                    }
                  }
                }}
                className={`px-4 py-2 text-white rounded-lg font-medium ${
                  confirmAction.type === 'restore'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.type === 'restore' ? 'Restore' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
