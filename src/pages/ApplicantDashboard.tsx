import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { FileText, Clock, CheckCircle, Plus, Edit, AlertCircle, Trash2 } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import { PageHeader, StatCard, StatusPill, DashboardCard } from '../components/dashboard/ui';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'];

export function ApplicantDashboard() {
  const { profile } = useAuth();
  const { primaryColor: _primaryColor } = useBranding();
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [drafts, setDrafts] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    drafts: 0,
  });

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
      // Only submitted/completed records appear in main list
      const submittedRecords = allRecords.filter(r => r.status !== 'draft');
      // Drafts are auto-saved but not yet submitted to the workflow
      const draftRecords = allRecords.filter(r => r.status === 'draft');

      setRecords(submittedRecords);
      setDrafts(draftRecords);
      
      setStats({
        total: submittedRecords.length,
        pending:
          submittedRecords.filter((r) =>
            ['submitted', 'waiting_supervisor', 'waiting_evaluation'].includes(r.status)
          ).length || 0,
        approved:
          submittedRecords.filter((r) =>
            ['supervisor_approved', 'evaluator_approved', 'ready_for_filing'].includes(r.status)
          ).length || 0,
        rejected: submittedRecords.filter((r) => r.status === 'rejected').length || 0,
        drafts: draftRecords.length,
      });
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
      
      // Call the delete-draft edge function
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

      // Force refetch to ensure UI is synced
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
      <div className="space-y-8">
        <div className="h-10 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Approval Banner */}
      {profile && profile.is_approved === false && (
        <div className="bg-amber-50 border-2 border-amber-200 border-dashed rounded-2xl p-5">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Account Under Review</p>
              <p className="text-sm text-amber-800 mt-0.5">
                Your account is pending approval from the IP Office. Once approved you'll be able to submit disclosures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${profile?.full_name ?? ''}`}
        subtitle="Manage your intellectual property submissions"
        actions={
          profile && profile.is_approved === false ? (
            <button
              disabled
              title="Available after account approval"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              New Submission
            </button>
          ) : (
            <Link
              to="/dashboard/submit"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Submission
            </Link>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Submissions" value={stats.total} icon={FileText} iconColor="from-blue-500 to-indigo-600" />
        <StatCard label="Draft Saves" value={stats.drafts} icon={FileText} iconColor="from-amber-500 to-orange-600" />
        <StatCard label="Pending Review" value={stats.pending} icon={Clock} iconColor="from-yellow-400 to-amber-500" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} iconColor="from-green-500 to-emerald-600" />
      </div>

      {/* Draft Submissions Section */}
      {drafts.length > 0 && (
        <DashboardCard
          title={`Draft Submissions (${drafts.length})`}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50 border-b border-amber-100">
                <tr>
                  {['Title', 'Category', 'Progress', 'Last Saved', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {draft.title || <span className="text-gray-400 italic">Untitled Draft</span>}
                      </p>
                      {draft.abstract && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{draft.abstract}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize whitespace-nowrap">{draft.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${((draft.current_step || 1) / 6) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{draft.current_step || 1}/6</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(draft.updated_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/dashboard/submit"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          Continue
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteDraft(draft.id)}
                          disabled={deletingDraftId === draft.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          {deletingDraftId === draft.id ? 'Deleting…' : 'Delete'}
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
              onItemsPerPageChange={(count) => { setDraftsItemsPerPage(count); setDraftsCurrentPage(1); }}
              totalItems={drafts.length}
            />
          )}
        </DashboardCard>
      )}

      {/* Submitted Records Section */}
      <DashboardCard title="Recent Submissions" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Title', 'Category', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500">No submissions yet</p>
                      <p className="text-xs text-gray-400 mt-1">Get started by creating your first IP submission</p>
                      <Link
                        to="/dashboard/submit"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Create Submission
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-gray-50 transition-colors ${needsRevision(record.status) ? 'border-l-4 border-orange-400 bg-orange-50/30' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/submissions/${record.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        {record.title}
                      </Link>
                      {needsRevision(record.status) && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-orange-700">
                          <AlertCircle className="h-3 w-3" />
                          <span>{getRevisionMessage(record)}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize whitespace-nowrap">{record.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill status={record.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(record.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {needsRevision(record.status) && (
                          <Link
                            to={`/dashboard/submissions/${record.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            Revise
                          </Link>
                        )}
                        <Link to={`/dashboard/submissions/${record.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {recordsTotalPages > 1 && (
          <Pagination
            currentPage={recordsCurrentPage}
            totalPages={recordsTotalPages}
            onPageChange={setRecordsCurrentPage}
            itemsPerPage={recordsItemsPerPage}
            onItemsPerPageChange={(count) => { setRecordsItemsPerPage(count); setRecordsCurrentPage(1); }}
            totalItems={records.length}
          />
        )}
      </DashboardCard>
    </div>
  );
}
