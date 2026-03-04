import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { FileText, Plus, CreditCard as Edit, AlertCircle, Trash2, Eye } from 'lucide-react';
import { getStatusColor, getStatusLabel } from '../lib/statusLabels';
import { Pagination } from '../components/Pagination';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'];

export function MySubmissionsPage() {
  const { profile } = useAuth();
  const { primaryColor } = useBranding();
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [drafts, setDrafts] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  // Pagination states for submitted records
  const [recordsCurrentPage, setRecordsCurrentPage] = useState(1);
  const [recordsItemsPerPage, setRecordsItemsPerPage] = useState(10);

  // Pagination states for drafts
  const [draftsCurrentPage, setDraftsCurrentPage] = useState(1);
  const [draftsItemsPerPage, setDraftsItemsPerPage] = useState(10);

  useEffect(() => {
    fetchRecords();
  }, [profile]);

  const fetchRecords = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select('*')
        .eq('applicant_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allRecords = data || [];
      const submittedRecords = allRecords.filter(r => r.status !== 'draft');
      const draftRecords = allRecords.filter(r => r.status === 'draft');

      setRecords(submittedRecords);
      setDrafts(draftRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) return;

    setDeletingDraftId(draftId);
    try {
      console.log('[deleteDraft] Starting delete for draft:', draftId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-draft`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify({ draftId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('[deleteDraft] Edge function error:', result);
        throw new Error(result.error || 'Failed to delete draft');
      }

      console.log('[deleteDraft] Successfully deleted draft:', result);

      await fetchRecords();
      alert('Draft deleted successfully');
    } catch (error) {
      console.error('[deleteDraft] Error:', error);
      alert('Failed to delete draft: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDeletingDraftId(null);
    }
  };

  const needsRevision = (status: string) => {
    return status === 'supervisor_revision' || status === 'evaluator_revision';
  };

  const getRevisionMessage = (record: IpRecord) => {
    if (record.status === 'supervisor_revision') {
      return 'Supervisor requested revisions. Please update your submission.';
    } else if (record.status === 'evaluator_revision') {
      return 'Evaluator requested revisions. Please update your submission.';
    }
    return '';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination calculations for records
  const recordsStartIndex = (recordsCurrentPage - 1) * recordsItemsPerPage;
  const recordsEndIndex = recordsStartIndex + recordsItemsPerPage;
  const paginatedRecords = records.slice(recordsStartIndex, recordsEndIndex);
  const recordsTotalPages = Math.ceil(records.length / recordsItemsPerPage);

  // Pagination calculations for drafts
  const draftsStartIndex = (draftsCurrentPage - 1) * draftsItemsPerPage;
  const draftsEndIndex = draftsStartIndex + draftsItemsPerPage;
  const paginatedDrafts = drafts.slice(draftsStartIndex, draftsEndIndex);
  const draftsTotalPages = Math.ceil(drafts.length / draftsItemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-gray-600 mt-1">Manage your draft and submitted IP disclosures</p>
        </div>
        {profile && profile.is_approved === false ? (
          <div className="relative group">
            <button
              disabled
              className="flex items-center gap-2 px-6 py-3 text-gray-400 bg-gray-100 rounded-xl shadow cursor-not-allowed opacity-60 w-fit"
            >
              <Plus className="h-5 w-5" />
              New Submission
            </button>
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-sm rounded py-2 px-3 whitespace-nowrap">
              Available after account approval
            </div>
          </div>
        ) : (
          <Link
            to="/dashboard/submit"
            className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow hover:shadow-lg transition-all duration-300 hover:scale-105 w-fit font-medium"
            style={{ background: `linear-gradient(to right, ${primaryColor}, #6366f1)` }}
          >
            <Plus className="h-5 w-5" />
            New Submission
          </Link>
        )}
      </div>

      {/* Draft Submissions Section */}
      {drafts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 lg:p-6">
          <div className="mb-4 lg:mb-6">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Draft Submissions ({drafts.length})</h2>
            <p className="text-gray-600 text-xs lg:text-sm mt-1">Auto-saved drafts waiting to be completed and submitted</p>
          </div>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'linear-gradient(to right, #f5991820, #d97706120)', borderBottomColor: '#f5991840' }} className="border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Last Saved</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-amber-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {draft.title || <span className="text-gray-500 italic">Untitled Draft</span>}
                      </div>
                      {draft.abstract && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{draft.abstract}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{draft.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full"
                            style={{ width: `${((draft.current_step || 1) / 6) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {draft.current_step || 1}/6
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(draft.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/dashboard/submit"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-xs"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Continue
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteDraft(draft.id)}
                          disabled={deletingDraftId === draft.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Delete draft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingDraftId === draft.id ? 'Deleting...' : ''}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedDrafts.map((draft) => (
              <div key={draft.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      {draft.title || <span className="text-gray-500 italic">Untitled Draft</span>}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 capitalize">
                      {draft.category}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Progress:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-amber-600 h-2 rounded-full"
                          style={{ width: `${((draft.current_step || 1) / 6) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{draft.current_step || 1}/6</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Last Saved:</span>
                    <span className="text-xs">{formatDateTime(draft.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                  <Link
                    to="/dashboard/submit"
                    className="flex-1 text-center px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Continue
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteDraft(draft.id)}
                    disabled={deletingDraftId === draft.id}
                    className="flex-1 text-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingDraftId === draft.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
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
              totalItems={drafts.length}
            />
          )}
        </div>
      )}

      {/* Submitted Records Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Recent Submissions</h2>
        </div>
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-100/30 to-indigo-100/30 border-b border-blue-200/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No submissions yet</p>
                    <p className="text-sm mt-1">Get started by creating your first IP submission</p>
                    <Link
                      to="/dashboard/submit"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Create Submission
                    </Link>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.id} className={`hover:bg-gray-50 ${needsRevision(record.status) ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {record.title}
                        </Link>
                        {needsRevision(record.status) && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-orange-700">
                            <AlertCircle className="h-3 w-3" />
                            <span>{getRevisionMessage(record)}</span>
                          </div>
                        )}
                      </div>
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
                      {formatDate(record.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {needsRevision(record.status) && (
                          <Link
                            to={`/dashboard/submissions/${record.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                          >
                            <Edit className="h-4 w-4" />
                            Revise
                          </Link>
                        )}
                        <Link
                          to={`/dashboard/submissions/${record.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm mt-1">Get started by creating your first IP submission</p>
              <Link
                to="/dashboard/submit"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Submission
              </Link>
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <div key={record.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${needsRevision(record.status) ? 'border-l-4 border-orange-400' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/dashboard/submissions/${record.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 block mb-1"
                    >
                      {record.title}
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {record.category}
                      </span>
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                  </div>
                </div>
                {needsRevision(record.status) && (
                  <div className="flex items-center gap-1 mb-2 text-xs text-orange-700">
                    <AlertCircle className="h-3 w-3" />
                    <span>{getRevisionMessage(record)}</span>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Submitted:</span>
                    <span>{formatDate(record.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                  {needsRevision(record.status) && (
                    <Link
                      to={`/dashboard/submissions/${record.id}`}
                      className="flex-1 text-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium inline-flex items-center justify-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Revise
                    </Link>
                  )}
                  <Link
                    to={`/dashboard/submissions/${record.id}`}
                    className={`${needsRevision(record.status) ? 'flex-1' : 'w-full'} text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center justify-center gap-2`}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {recordsTotalPages > 1 && (
          <Pagination
            currentPage={recordsCurrentPage}
            totalPages={recordsTotalPages}
            onPageChange={setRecordsCurrentPage}
            itemsPerPage={recordsItemsPerPage}
            onItemsPerPageChange={(count) => {
              setRecordsItemsPerPage(count);
              setRecordsCurrentPage(1);
            }}
            totalItems={records.length}
          />
        )}
      </div>
    </div>
  );
}
